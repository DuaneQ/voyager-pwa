import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripeAds = new Stripe(process.env.STRIPE_API_KEY!, {
  // 2023-08-16+ is required for no-cost orders in Checkout Sessions.
  // Stripe SDK typings in this repo are pinned to an older literal version,
  // so cast to keep runtime behavior without forcing a package-wide upgrade.
  apiVersion: '2023-08-16' as any,
});

const CAMPAIGNS_COLLECTION = 'ads_campaigns';
const DEFAULT_ORIGIN = 'https://travalpass-ads.web.app';

interface CreateAdsCampaignCheckoutSessionRequest {
  campaignId?: string;
  origin?: string;
}

interface CreateAdsCampaignCheckoutSessionResponse {
  url: string;
  sessionId: string;
}

function getProjectId(): string | undefined {
  if (typeof process.env.GCLOUD_PROJECT === 'string' && process.env.GCLOUD_PROJECT) {
    return process.env.GCLOUD_PROJECT;
  }

  const firebaseConfig = process.env.FIREBASE_CONFIG;
  if (!firebaseConfig) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(firebaseConfig) as { projectId?: string };
    return parsed.projectId;
  } catch {
    return undefined;
  }
}

function isLiveStripeKey(stripeApiKey: string | undefined): boolean {
  return typeof stripeApiKey === 'string' && stripeApiKey.startsWith('sk_live_');
}

function enforceStripeKeySafety(): void {
  const stripeApiKey = process.env.STRIPE_API_KEY;
  if (!stripeApiKey) {
    throw new HttpsError('failed-precondition', 'Stripe API key is not configured');
  }

  const projectId = getProjectId();
  if (projectId === 'mundo1-dev' && isLiveStripeKey(stripeApiKey)) {
    throw new HttpsError(
      'failed-precondition',
      'Dev project cannot create checkout with a live Stripe key. Configure STRIPE_API_KEY as sk_test_... for mundo1-dev.',
    );
  }
}

function resolveOrigin(origin: unknown): string {
  if (typeof origin === 'string' && origin.startsWith('http')) {
    return origin;
  }
  return DEFAULT_ORIGIN;
}

function dollarsToCents(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

function parseRequiredCents(metadataValue: string | undefined, fallback: number): number {
  if (!metadataValue) return fallback;
  const parsed = parseInt(metadataValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function isAdsCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.flow === 'ads';
}

export const createAdsCampaignCheckoutSession = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<CreateAdsCampaignCheckoutSessionResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    enforceStripeKeySafety();

    const { campaignId, origin } = (request.data ?? {}) as CreateAdsCampaignCheckoutSessionRequest;
    if (!campaignId || typeof campaignId !== 'string') {
      throw new HttpsError('invalid-argument', 'campaignId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const campaignRef = db.collection(CAMPAIGNS_COLLECTION).doc(campaignId);
    const campaignSnap = await campaignRef.get();
    if (!campaignSnap.exists) {
      throw new HttpsError('not-found', 'Campaign not found');
    }

    const campaignData = campaignSnap.data() ?? {};
    if (campaignData.uid !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this campaign');
    }

    if (campaignData.paymentStatus === 'paid') {
      throw new HttpsError('failed-precondition', 'This campaign has already been paid.');
    }

    const paymentRequiredCents = dollarsToCents(campaignData.budgetAmount);
    if (paymentRequiredCents <= 0) {
      throw new HttpsError('failed-precondition', 'Campaign budget amount must be greater than zero');
    }

    const resolvedOrigin = resolveOrigin(origin);
    const emailFromAuth =
      typeof request.auth?.token?.email === 'string' ? request.auth.token.email : undefined;

    const session = await stripeAds.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      customer_email: emailFromAuth,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: paymentRequiredCents,
            product_data: {
              name: 'TravalPass Ads Campaign Credits',
              description: `Campaign ${campaignId} prepaid credits`,
            },
          },
        },
      ],
      client_reference_id: campaignId,
      metadata: {
        flow: 'ads',
        uid,
        campaignId,
        paymentRequiredCents: String(paymentRequiredCents),
      },
      success_url: `${resolvedOrigin}/billing/${campaignId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${resolvedOrigin}/billing/${campaignId}?checkout=cancel`,
    });

    if (!session.url) {
      throw new HttpsError('internal', 'Stripe checkout session did not return a URL');
    }

    await campaignRef.set(
      {
        paymentStatus: 'checkout_created',
        paymentRequiredCents,
        paymentCurrency: 'usd',
        paymentSessionId: session.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { url: session.url, sessionId: session.id };
  },
);

export async function applyAdsCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  db: admin.firestore.Firestore = admin.firestore(),
): Promise<boolean> {
  if (!isAdsCheckoutSession(session)) {
    return false;
  }

  const campaignId = session.metadata?.campaignId;
  if (!campaignId) {
    throw new Error('Missing campaignId in ads checkout metadata');
  }

  // paymentRequiredCents is required in metadata, set during checkout creation.
  const requiredCents = parseRequiredCents(session.metadata?.paymentRequiredCents, 0);
  if (requiredCents <= 0) {
    throw new Error('Invalid paymentRequiredCents in ads checkout metadata');
  }

  const paidCents = typeof session.amount_total === 'number' ? session.amount_total : requiredCents;
  const discountCents =
    typeof session.total_details?.amount_discount === 'number'
      ? session.total_details.amount_discount
      : Math.max(0, requiredCents - paidCents);

  const campaignRef = db.collection(CAMPAIGNS_COLLECTION).doc(campaignId);

  const campaignSnap = await campaignRef.get();
  const existingData = campaignSnap.data() ?? {};
  if (existingData.paymentStatus === 'paid') {
    // Idempotent: campaign is already marked paid (webhook retry or race condition).
    return true;
  }

  const update: Record<string, unknown> = {
    paymentStatus: 'paid',
    paymentRequiredCents: requiredCents,
    paymentPaidCents: paidCents,
    paymentDiscountCents: discountCents,
    paymentCurrency: session.currency ?? 'usd',
    paymentSessionId: session.id,
    paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await campaignRef.set(update, { merge: true });
  return true;
}

export const _testing = {
  resolveOrigin,
  dollarsToCents,
  parseRequiredCents,
  getProjectId,
  isLiveStripeKey,
};

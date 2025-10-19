// Lightweight Prisma client singleton for Cloud Functions
// Use DATABASE_URL in env for local/dev (via Cloud SQL Auth Proxy)
// For production on Cloud Functions, use the Cloud SQL Auth Proxy or the Cloud Functions "Connections" setting.

import { PrismaClient } from '@prisma/client';
import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Helper: try multiple locations for the DB URL in order of precedence
// 1) process.env.DATABASE_URL
// 2) firebase functions config: functions.config().database.url
// 3) firebase functions config: functions.config().secret.name (full secret resource id or secret id)
// 4) process.env.PRISMA_SECRET_NAME
// 5) default secret id: 'voyager-itinerary-db' under current project (GCLOUD_PROJECT / GCP_PROJECT)
async function resolveDatabaseUrl(): Promise<string | null> {
  try {
    // Prefer Secret Manager first (production pattern): attempt to fetch DATABASE_URL from a secret
    const cfg = functions.config && typeof functions.config === 'function' ? functions.config() as any : null;

    // Try secret name from functions config
    const secretNameFromCfg = cfg && cfg.secret && cfg.secret.name ? cfg.secret.name : null;
    const secretNameEnv = process.env.PRISMA_SECRET_NAME || null;

    const client = new SecretManagerServiceClient();

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT_ID || process.env.PROJECT_ID || null;

    // Helper to access a secret version (accepts either full resource name or short id)
    async function accessSecret(candidate: string): Promise<string | null> {
      if (!candidate) return null;
      let name = candidate;
      // If candidate looks like a short id (no '/'), try to build resource name using projectId
      if (!candidate.includes('/') && projectId) {
        name = `projects/${projectId}/secrets/${candidate}/versions/latest`;
      }
      try {
        const [version] = await client.accessSecretVersion({ name });
        const payload = version.payload && version.payload.data ? version.payload.data.toString() : null;
        if (payload) return payload.trim();
      } catch (e) {
        console.warn(`[prismaClient] accessSecretVersion failed for ${name}:`, (e as Error).message);
      }
      return null;
    }

    // Try config-provided secret name first, then env, then default short name
    const candidates = [secretNameFromCfg, secretNameEnv, 'voyager-itinerary-db'];
    for (const c of candidates) {
      const val = await accessSecret(c as string);
      if (val) {
        console.info('[prismaClient] Retrieved DATABASE_URL from Secret Manager (masked)');
        return val;
      }
    }

    // Next fallback: functions config database.url
    if (cfg && cfg.database && cfg.database.url) {
      console.info('[prismaClient] Using DATABASE_URL from functions config');
      return cfg.database.url;
    }

    // Finally, fallback to an environment variable if present (useful for local/dev with Cloud SQL Auth Proxy)
    if (process.env.DATABASE_URL) {
      console.info('[prismaClient] Using DATABASE_URL from environment');
      return process.env.DATABASE_URL;
    }
  } catch (e) {
    console.warn('[prismaClient] Error resolving DATABASE_URL:', (e as Error).message);
  }

  return null;
}

// We'll create a lazy-initialized Prisma client. To keep existing call sites
// working (they expect `prisma.model.method()` synchronously), export a Proxy
// that defers method calls until the underlying Prisma client is ready.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaInitPromise: Promise<void> | undefined;
}

let _prisma: PrismaClient | undefined = global.__prisma;

async function initPrisma() {
  if (_prisma) return;

  // Resolve DB URL
  const dbUrl = await resolveDatabaseUrl();
  if (dbUrl) {
    process.env.DATABASE_URL = dbUrl;
  } else {
    console.warn('[prismaClient] No DATABASE_URL resolved from env, functions config, or Secret Manager');
  }

  _prisma = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') global.__prisma = _prisma;
}

// Do NOT start init on module load. Instead, initialize lazily when the proxy is first used.
// This prevents functions that don't use Prisma from attempting DB connections during module load.
// global.__prismaInitPromise will be set on first access inside the proxy below.

// Generic handler that returns proxies for model access and method calls.
const lazyHandler: ProxyHandler<any> = {
  get(_target, prop: string | symbol) {
    if (prop === 'then') {
      // Allow proxy to not be treated as a Promise by some consumers
      return undefined;
    }

    // Return a nested proxy for models and method names
    return new Proxy(function () {}, {
      get(__t, method: string | symbol) {
        return async (...args: any[]) => {
          // Ensure initialization starts if it hasn't yet
          global.__prismaInitPromise = global.__prismaInitPromise || initPrisma();
          await global.__prismaInitPromise;
          const client = _prisma as any;
          const model = (client as any)[prop as any];
          if (!model) {
            // If it's a top-level method (e.g., $connect, $disconnect)
            const top = (client as any)[method as any];
            if (typeof top === 'function') return top.apply(client, args);
            throw new Error(`Prisma client has no property ${String(prop)} or method ${String(method)}`);
          }
          const fn = model[method as any];
          if (typeof fn !== 'function') throw new Error(`Prisma model ${String(prop)} has no method ${String(method)}`);
          return fn.apply(model, args);
        };
      },
      apply(__t, thisArg, argArray) {
        // Support direct function calls like prisma.$connect()
        return (async () => {
          await global.__prismaInitPromise;
          const client = _prisma as any;
          if (typeof client[prop as any] === 'function') return (client as any)[prop as any].apply(client, argArray);
          throw new Error(`Prisma client has no callable property ${String(prop)}`);
        })();
      }
    });
  }
};

const proxy = new Proxy({}, lazyHandler) as any;

export default proxy;

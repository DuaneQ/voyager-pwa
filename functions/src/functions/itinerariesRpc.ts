import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Firestore collection name for itineraries
const ITINERARIES_COLLECTION = 'itineraries';

/**
 * Get Firestore instance (admin.initializeApp() is called in index.ts)
 */
const getDb = () => admin.firestore();

/**
 * Convert Firestore Timestamps to ISO strings and other Firestore types to JSON-safe values.
 * Replaces the old Prisma sanitizeDeep that handled BigInt/Date.
 */
const sanitizeDeep = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  // Firestore Timestamp → ISO string
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v));
  if (typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeep(v as any);
    }
    return out;
  }
  return value;
};

/**
 * Normalize a date value to a Firestore Timestamp.
 * Accepts: string, number (epoch ms), Date, Firestore Timestamp, or null.
 */
const normalizeToTimestamp = (val: any): admin.firestore.Timestamp | null => {
  if (!val) return null;
  if (val && typeof val.toDate === 'function') return val; // Already a Timestamp
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return admin.firestore.Timestamp.fromDate(d);
  }
  if (val instanceof Date) {
    return admin.firestore.Timestamp.fromDate(val);
  }
  return null;
};

/**
 * Safely convert a value to a number. Returns null if the result is NaN or not finite.
 * Prevents Number(null)=0, Number("abc")=NaN from silently corrupting Firestore data.
 */
const toValidNumber = (val: any): number | null => {
  if (val == null) return null;
  const n = Number(val);
  if (!isFinite(n) || isNaN(n)) {
    throw new HttpsError('invalid-argument', `Expected a valid number but received: ${val}`);
  }
  return n;
};

// ─── Create or upsert an itinerary ────────────────────────────────────────────
export const createItinerary = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const data = req.data || {};
    const incoming = data.itinerary || data;
    const userId = incoming.userId || auth.uid;

    const now = admin.firestore.Timestamp.now();
    const payload: any = {
      ...incoming,
      userId,
      startDate: normalizeToTimestamp(incoming.startDate),
      endDate: normalizeToTimestamp(incoming.endDate),
      // Ensure startDay/endDay are numbers (epoch ms) for range queries
      startDay: toValidNumber(incoming.startDay),
      endDay: toValidNumber(incoming.endDay),
      // Ensure numeric fields are numbers
      age: toValidNumber(incoming.age),
      lowerRange: toValidNumber(incoming.lowerRange),
      upperRange: toValidNumber(incoming.upperRange),
      updatedAt: now,
    };

    const db = getDb();

    if (incoming.id) {
      // Upsert: set with merge to handle both create and update
      const docRef = db.collection(ITINERARIES_COLLECTION).doc(incoming.id);
      const existingDoc = await docRef.get();
      if (existingDoc.exists) {
        await docRef.update(payload);
      } else {
        payload.createdAt = now;
        await docRef.set(payload);
      }
      const updated = await docRef.get();
      return { success: true, data: sanitizeDeep({ id: updated.id, ...updated.data() }) };
    }

    // Create with auto-generated ID
    payload.createdAt = now;
    const docRef = await db.collection(ITINERARIES_COLLECTION).add(payload);
    const created = await docRef.get();
    return { success: true, data: sanitizeDeep({ id: created.id, ...created.data() }) };
  } catch (err: any) {
    console.error('createItinerary error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// ─── Update an itinerary ──────────────────────────────────────────────────────
export const updateItinerary = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const data = req.data || {};
    const id: string = data.itineraryId || data.id;
    const updates: any = { ...(data.updates || data) };
    if (!id) throw new HttpsError('invalid-argument', 'itinerary id required');

    // Normalize date fields if present
    if (updates.startDate) updates.startDate = normalizeToTimestamp(updates.startDate);
    if (updates.endDate) updates.endDate = normalizeToTimestamp(updates.endDate);
    // Ensure numeric fields are numbers (throws HttpsError on NaN/invalid)
    if (updates.startDay != null) updates.startDay = toValidNumber(updates.startDay);
    if (updates.endDay != null) updates.endDay = toValidNumber(updates.endDay);
    if (updates.age != null) updates.age = toValidNumber(updates.age);
    if (updates.lowerRange != null) updates.lowerRange = toValidNumber(updates.lowerRange);
    if (updates.upperRange != null) updates.upperRange = toValidNumber(updates.upperRange);

    updates.updatedAt = admin.firestore.Timestamp.now();

    // Remove id/itineraryId from updates to avoid overwriting the doc ID field
    delete updates.id;
    delete updates.itineraryId;

    const db = getDb();
    const docRef = db.collection(ITINERARIES_COLLECTION).doc(id);
    await docRef.update(updates);
    const updated = await docRef.get();
    return { success: true, data: sanitizeDeep({ id: updated.id, ...updated.data() }) };
  } catch (err: any) {
    console.error('updateItinerary error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// ─── Delete an itinerary ──────────────────────────────────────────────────────
export const deleteItinerary = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const data = req.data || {};
    const id: string = data.itineraryId || data.id;
    if (!id) throw new HttpsError('invalid-argument', 'itinerary id required');

    const db = getDb();
    await db.collection(ITINERARIES_COLLECTION).doc(id).delete();
    return { success: true };
  } catch (err: any) {
    console.error('deleteItinerary error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// ─── List itineraries for a user ──────────────────────────────────────────────
export const listItinerariesForUser = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const data = req.data || {};
    const userId = data.userId || auth.uid;

    const db = getDb();
    let query: admin.firestore.Query = db.collection(ITINERARIES_COLLECTION)
      .where('userId', '==', userId);

    // Exclude itineraries that have already ended (endDay < now)
    const now = Date.now();
    query = query.where('endDay', '>=', now);

    // Optional ai_status filter
    if (data.ai_status) {
      query = query.where('ai_status', '==', data.ai_status);
    }

    // Order by endDay ascending (required by Firestore when filtering on endDay with >=)
    // We'll re-sort by createdAt descending in post-processing
    query = query.orderBy('endDay', 'asc');

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by createdAt descending (post-processing since Firestore orderBy is on endDay)
    items.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
      const bTime = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
      return bTime.getTime() - aTime.getTime();
    });

    return { success: true, data: sanitizeDeep(items) };
  } catch (err: any) {
    console.error('listItinerariesForUser error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// ─── Search for matching itineraries ──────────────────────────────────────────
export const searchItineraries = onCall(async (req) => {
  try {
    const data = req.data || {};
    const db = getDb();
    let query: admin.firestore.Query = db.collection(ITINERARIES_COLLECTION);
    const genderPreference = typeof data.gender === 'string' ? data.gender.trim() : '';
    const statusPreference = typeof data.status === 'string' ? data.status.trim() : '';
    const orientationPreference = typeof data.sexualOrientation === 'string' ? data.sexualOrientation.trim() : '';
    const hasGenderPreference = genderPreference !== '' && genderPreference !== 'No Preference';
    const hasStatusPreference = statusPreference !== '' && statusPreference !== 'No Preference';
    const hasOrientationPreference = orientationPreference !== '' && orientationPreference !== 'No Preference';

    // Equality filters (Firestore handles these natively with composite indexes)
    if (data.destination) {
      query = query.where('destination', '==', data.destination);
    }
    if (hasGenderPreference) {
      query = query.where('userInfo.gender', '==', genderPreference);
    }
    if (hasStatusPreference) {
      query = query.where('userInfo.status', '==', statusPreference);
    }
    if (hasOrientationPreference) {
      query = query.where('userInfo.sexualOrientation', '==', orientationPreference);
    }

    const userStartDay = data.minStartDay ? Number(data.minStartDay) : 0;
    const userEndDay = data.maxEndDay ? Number(data.maxEndDay) : Number.MAX_SAFE_INTEGER;
    query = query.where('endDay', '>=', userStartDay);
    query = query.where('startDay', '<=', userEndDay);
    query = query.orderBy('endDay', 'asc');

    const take = Math.min(100, Number(data.pageSize || 50));
    const overFetch = take * 3;
    query = query.limit(overFetch);

    const snapshot = await query.get();
    snapshot.docs.forEach((doc, i) => {
      const d = doc.data() as any;
    });

    let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const currentUserId = data.currentUserId;
    const currentUserBlockedIds = Array.isArray(data.blockedUserIds) ? data.blockedUserIds : [];
    const excludedIds = new Set(Array.isArray(data.excludedIds) ? data.excludedIds : []);

    const hasAgeFilter = data.lowerRange != null && data.upperRange != null;
    const lowerRange = hasAgeFilter ? Number(data.lowerRange) : null;
    const upperRange = hasAgeFilter ? Number(data.upperRange) : null;

    items = items.filter((item: any) => {
      // Exclude current user's own itineraries
      if (currentUserId && item.userId === currentUserId) {
        return false;
      }

      // Exclude viewed/excluded itineraries
      if (excludedIds.has(item.id)) {
        return false;
      }

      // Age range filter
      if (hasAgeFilter && item.age != null) {
        const age = Number(item.age);
        if (age < lowerRange! || age > upperRange!) {
          return false;
        }
      }

      const candidateUserId = item.userInfo?.uid;
      const candidateBlockedList = Array.isArray(item.userInfo?.blocked) ? item.userInfo.blocked : [];

      if (currentUserId && candidateUserId && currentUserBlockedIds.includes(candidateUserId)) {
        return false;
      }

      if (currentUserId && candidateBlockedList.includes(currentUserId)) {
        return false;
      }

      return true;
    });

    const finalItems = items.slice(0, take);

    return { success: true, data: sanitizeDeep(finalItems) };
  } catch (err: any) {
    console.error('searchItineraries error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

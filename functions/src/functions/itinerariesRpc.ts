import { onCall, HttpsError } from 'firebase-functions/v2/https';
import prisma from '../db/prismaClient';

// Convert values that Prisma may return (BigInt, Date, etc.) into JSON-safe types
const sanitizeDeep = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') {
    // epochs are returned as BigInt from Prisma; convert to number (safe for epoch ms)
    return Number(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v));
  if (typeof value === 'object') {
    // Plain object or nested model
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeep((v as any));
    }
    return out;
  }
  return value;
};

// Create or upsert an itinerary
export const createItinerary = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const data = req.data || {};
    const incoming = data.itinerary || data;

    // Ensure userId comes from auth when not supplied
    const userId = incoming.userId || auth.uid;

    // Normalize dates if provided as strings
    const normalize = (val: any) => {
      if (!val) return null;
      if (typeof val === 'string' || typeof val === 'number') return new Date(val);
      if (val.toDate) return val.toDate();
      return val;
    };

    const payload: any = {
      ...incoming,
      userId,
      startDate: normalize(incoming.startDate),
      endDate: normalize(incoming.endDate),
    };

    // If an id was provided, upsert so migrations / replays work
    if (incoming.id) {
      const created = await prisma.itinerary.upsert({
        where: { id: incoming.id },
        create: { id: incoming.id, ...payload },
        update: { ...payload },
      });
      return { success: true, data: sanitizeDeep(created) };
    }

    const created = await prisma.itinerary.create({ data: payload });
    return { success: true, data: sanitizeDeep(created) };
  } catch (err: any) {
    console.error('createItinerary error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// Update an itinerary
export const updateItinerary = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const data = req.data || {};
    const id: string = data.itineraryId || data.id;
    const updates: any = data.updates || data;
    if (!id) throw new HttpsError('invalid-argument', 'itinerary id required');

    // Normalize date fields if present
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const updated = await prisma.itinerary.update({ where: { id }, data: updates });
    return { success: true, data: sanitizeDeep(updated) };
  } catch (err: any) {
    console.error('updateItinerary error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// Delete an itinerary
export const deleteItinerary = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const data = req.data || {};
    const id: string = data.itineraryId || data.id;
    if (!id) throw new HttpsError('invalid-argument', 'itinerary id required');

    await prisma.itinerary.delete({ where: { id } });
    return { success: true };
  } catch (err: any) {
    console.error('deleteItinerary error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// List itineraries for a user (simple)
export const listItinerariesForUser = onCall(async (req) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const data = req.data || {};
    const userId = data.userId || auth.uid;
    // Base filter: only return itineraries for this user
    const where: any = { userId };

    // Exclude itineraries that have already ended (endDay < now).
    // All itineraries have an endDay, so require endDay >= now.
    // Use BigInt for comparison because `endDay` is stored as BigInt in Prisma.
    try {
      const now = Date.now();
      where.AND = where.AND || [];
      // Only include itineraries whose endDay is greater than or equal to now.
      where.AND.push({ endDay: { gte: BigInt(now) } });
    } catch (e) {
      // If BigInt isn't supported for some reason, fall back to not filtering
      console.warn('[listItinerariesForUser] could not apply endDay filter, continuing without it:', (e as Error).message);
    }

    // Optional filters
    if (data.ai_status) where.ai_status = data.ai_status;

    const items = await prisma.itinerary.findMany({ where, orderBy: { createdAt: 'desc' } });
    return { success: true, data: sanitizeDeep(items) };
  } catch (err: any) {
    console.error('listItinerariesForUser error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

// Basic search endpoint - supports a subset of filters used in client side hooks
export const searchItineraries = onCall(async (req) => {
  try {
    const data = req.data || {};
    // public search - authentication optional, but preferred for rate limiting
    const filters: any = {};
    if (data.destination) filters.destination = data.destination;
    if (data.gender && data.gender !== 'No Preference') filters.gender = data.gender;
    if (data.status && data.status !== 'No Preference') filters.status = data.status;
    if (data.sexualOrientation && data.sexualOrientation !== 'No Preference') filters.sexualOrientation = data.sexualOrientation;

    // Date overlap filtering: Candidate's trip must overlap with user's search dates
    // For overlap: candidate.endDate >= user.startDate AND candidate.startDate <= user.endDate
    if (data.minStartDay && data.maxEndDay) {
      const userStartDate = new Date(Number(data.minStartDay));
      const userEndDate = new Date(Number(data.maxEndDay));
      filters.startDate = { lte: userEndDate }; // Candidate starts before or during user's trip
      filters.endDate = { gte: userStartDate }; // Candidate ends during or after user's trip
    } else if (data.minStartDay) {
      // Fallback: if only minStartDay provided, use legacy behavior
      filters.startDate = { gte: new Date(Number(data.minStartDay)) };
    }

    // Age filtering: Candidate's age must be within user's preferred range
    if (data.lowerRange != null && data.upperRange != null) {
      const userLower = Number(data.lowerRange);
      const userUpper = Number(data.upperRange);
      
      // Candidate's age must be in [userLower, userUpper]
      filters.age = { gte: userLower, lte: userUpper };
    }

    // Exclude viewed itineraries from results
    if (Array.isArray(data.excludedIds) && data.excludedIds.length > 0) {
      filters.id = { notIn: data.excludedIds };
    }

    // Bidirectional blocking filter:
    // 1. Exclude itineraries from users that current user has blocked (data.blockedUserIds)
    // 2. Exclude itineraries where current user is in the candidate's blocked array
    // Note: We handle #2 in post-processing since Prisma can't filter on JSON array contains
    const currentUserId = data.currentUserId;
    const currentUserBlockedIds = Array.isArray(data.blockedUserIds) ? data.blockedUserIds : [];
    
    // Filter #1: Exclude itineraries from users current user has blocked
    // Since userId is stored in userInfo JSON field, we need to fetch all and filter in-memory
    // OR if you have a top-level userId field in Prisma schema, use: filters.userId = { notIn: currentUserBlockedIds }

    const take = Math.min(100, Number(data.pageSize || 50));
    const items = await prisma.itinerary.findMany({ where: filters, orderBy: { startDate: 'asc' }, take });
    
    // Parse JSON fields if they're strings (Prisma sometimes returns JSON as strings)
    const parsedItems = items.map((item: any) => {
      const parsed = { ...item };
      
      // Parse userInfo if it's a string
      if (typeof parsed.userInfo === 'string') {
        try {
          parsed.userInfo = JSON.parse(parsed.userInfo);
        } catch (e) {
          console.error('Failed to parse userInfo for item:', parsed.id, e);
        }
      }
      
      // Parse other JSON fields if needed
      ['likes', 'activities', 'response', 'metadata', 'externalData', 'recommendations', 
       'costBreakdown', 'dailyPlans', 'days', 'flights', 'accommodations'].forEach(field => {
        if (typeof (parsed as any)[field] === 'string') {
          try {
            (parsed as any)[field] = JSON.parse((parsed as any)[field]);
          } catch (e) {
            // Ignore parse errors for optional fields
          }
        }
      });
      
      return parsed;
    });
    
    // Apply bidirectional blocking filter (post-processing since userInfo is JSON)
    const filteredItems = parsedItems.filter((item: any) => {
      const candidateUserId = item.userInfo?.uid;
      const candidateBlockedList = Array.isArray(item.userInfo?.blocked) ? item.userInfo.blocked : [];
      
      // Exclude if current user blocked this candidate
      if (currentUserId && candidateUserId && currentUserBlockedIds.includes(candidateUserId)) {
        return false;
      }
      
      // Exclude if candidate blocked current user (bidirectional)
      if (currentUserId && candidateBlockedList.includes(currentUserId)) {
        return false;
      }
      
      return true;
    });
    
    return { success: true, data: sanitizeDeep(filteredItems) };
  } catch (err: any) {
    console.error('searchItineraries error', err);
    throw new HttpsError('internal', err?.message || String(err));
  }
});

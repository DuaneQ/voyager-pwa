import { useState, useCallback, useContext, useEffect } from 'react';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { auth } from '../environments/firebaseConfig';

const FREE_DAILY_LIMIT = 10;
// AI generation limits
const FREE_DAILY_AI_LIMIT = 5;
const PREMIUM_DAILY_AI_LIMIT = 20;

export const useUsageTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  // Guard: some tests render components without wrapping UserProfileContext.
  // Ensure we don't destructure undefined from useContext().
  const userProfileContext = useContext(UserProfileContext) as any || {};
  const { userProfile, updateUserProfile } = userProfileContext;
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  const db = getFirestore(app);
  // Remote profile read from Firestore to avoid relying solely on localStorage-backed context
  const [remoteProfile, setRemoteProfile] = useState<any | null>(null);



  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Check if user is a premium user with a valid subscription
  const hasPremium = useCallback(() => {
    // Prefer authoritative remote profile if available
    const profile = remoteProfile || userProfile;
    if (!profile) return false;
    if (profile.subscriptionType !== 'premium') return false;
    if (!profile.subscriptionEndDate) return false;
    // subscriptionEndDate may be a Firestore Timestamp, an object with seconds/nanoseconds,
    // an ISO string, or a number. Normalize to a JS Date for comparison.
    const s: any = profile.subscriptionEndDate;
    let endDate: Date;
    if (s && typeof s.toDate === 'function') {
      // Firestore Timestamp
      endDate = s.toDate();
    } else if (s && typeof s.seconds === 'number') {
      // Plain object with seconds/nanoseconds
      endDate = new Date(s.seconds * 1000 + Math.floor((s.nanoseconds || 0) / 1e6));
    } else {
      // ISO string or numeric timestamp
      endDate = new Date(s);
    }
    if (isNaN(endDate.getTime())) return false;
    return new Date() <= endDate;
  }, [userProfile, remoteProfile]);

  const hasReachedLimit = useCallback(() => {
    const profile = remoteProfile || userProfile;
    if (!profile) return false;
    // Premium users with valid subscription have unlimited views
    if (hasPremium()) return false;
    const today = getTodayString();
    const dailyUsage = profile.dailyUsage;
    // If no usage data or different date, user hasn't reached limit
    if (!dailyUsage || dailyUsage.date !== today) return false;
    return dailyUsage.viewCount >= FREE_DAILY_LIMIT;
  }, [userProfile, hasPremium, remoteProfile]);

  // --- AI generation specific helpers ---
  const hasReachedAILimit = useCallback(() => {
    const profile = remoteProfile || userProfile;
    if (!profile) return false;
    const today = getTodayString();
    const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;
    const aiUsage = profile.dailyUsage?.aiItineraries;
    if (!aiUsage || aiUsage.date !== today) return false;
    return aiUsage.count >= aiLimit;
  }, [userProfile, hasPremium, remoteProfile]);

  const getRemainingAICreations = useCallback(() => {
    const profile = remoteProfile || userProfile;
    if (!profile) return 0;
    const today = getTodayString();
    const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;
    const aiUsage = profile.dailyUsage?.aiItineraries;
    if (!aiUsage || aiUsage.date !== today) return aiLimit;
    return Math.max(0, aiLimit - aiUsage.count);
  }, [userProfile, hasPremium, remoteProfile]);

  // Track an AI-generated itinerary creation
  const trackAICreation = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.error('No user ID or profile found');
      return false;
    }

    // Determine today's date and limits
    const today = getTodayString();
    const aiLimit = hasPremium() ? PREMIUM_DAILY_AI_LIMIT : FREE_DAILY_AI_LIMIT;

  // Start with any available authoritative usage (remote first, then local)
  let currentAIUsage: any = remoteProfile?.dailyUsage?.aiItineraries || userProfile?.dailyUsage?.aiItineraries;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap && typeof (snap as any).exists === 'function' && (snap as any).exists()) {
        const data = (snap as any).data();
        currentAIUsage = data?.dailyUsage?.aiItineraries || currentAIUsage;
      }
    } catch (e) {
      // Non-fatal: fall back to any available local profile
      console.warn('[useUsageTracking] failed to fetch latest AI usage before increment', e);
    }
    let newCount = 1;
    if (currentAIUsage && currentAIUsage.date === today) {
      if (currentAIUsage.count >= aiLimit) {
        // Already reached or exceeded
        return false;
      }
      newCount = currentAIUsage.count + 1;
    }

    const updatedAIUsage = {
      date: today,
      count: newCount,
    };

    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      // Use dot-path to update nested field
      await updateDoc(userRef, {
        ['dailyUsage.aiItineraries']: updatedAIUsage,
      });

      // Update local context
      const updatedProfile = {
        ...userProfile,
        dailyUsage: {
          ...(userProfile.dailyUsage || { date: today, viewCount: 0 }),
          aiItineraries: updatedAIUsage,
        },
      };
      updateUserProfile(updatedProfile);
      localStorage.setItem('PROFILE_INFO', JSON.stringify(updatedProfile));
      return true;
    } catch (error) {
      console.error('Error tracking AI creation:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, userProfile, hasPremium, updateUserProfile, db]);

  // Get remaining views for today
  const getRemainingViews = useCallback(() => {
    const profile = remoteProfile || userProfile;
    if (!profile) return 0;
    // Premium users with valid subscription have unlimited views
    if (hasPremium()) return 999; // Represent unlimited
    const today = getTodayString();
    const dailyUsage = profile.dailyUsage;
    // If no usage data or different date, user has full limit
    if (!dailyUsage || dailyUsage.date !== today) return FREE_DAILY_LIMIT;
    return Math.max(0, FREE_DAILY_LIMIT - dailyUsage.viewCount);
  }, [userProfile, hasPremium]);

  // Track a view (like or dislike)
  const trackView = useCallback(async (): Promise<boolean> => {
    if (!userId || !userProfile) {
      console.error('No user ID or profile found');
      return false;
    }
    // Premium users: unlimited, do not update usage or Firestore
    if (hasPremium()) {
      return true;
    }
    // Check if user has reached limit
    if (hasReachedLimit()) {
      return false;
    }
    setIsLoading(true);
    try {
      const today = getTodayString();
      const currentUsage = userProfile.dailyUsage;
      let newViewCount = 1;
      if (currentUsage && currentUsage.date === today) {
        newViewCount = currentUsage.viewCount + 1;
      }
      const updatedUsage = {
        date: today,
        viewCount: newViewCount
      };
      // Update Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        dailyUsage: updatedUsage
      });
      // Update local context
      const updatedProfile = {
        ...userProfile,
        dailyUsage: updatedUsage
      };
      updateUserProfile(updatedProfile);
      // Update localStorage
      localStorage.setItem('PROFILE_INFO', JSON.stringify(updatedProfile));
      return true;
    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, userProfile, hasReachedLimit, hasPremium, updateUserProfile, db]);

  // Reset daily usage (for testing or admin purposes)
  const resetDailyUsage = useCallback(async () => {
    if (!userId) return;

    try {
        const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        dailyUsage: {
          date: getTodayString(),
          viewCount: 0
        }
      });

      // Refresh user profile to get updated data
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const updatedProfile = userDoc.data();
        updateUserProfile(updatedProfile);
        localStorage.setItem('PROFILE_INFO', JSON.stringify(updatedProfile));
      }
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }, [userId, db, updateUserProfile]);

  return {
    hasReachedLimit,
    getRemainingViews,
    trackView,
    resetDailyUsage,
    isLoading,
    dailyLimit: FREE_DAILY_LIMIT,
    hasPremium,
    // AI-specific
    hasReachedAILimit,
    getRemainingAICreations,
    trackAICreation,
    dailyAILimit: FREE_DAILY_AI_LIMIT,
  };
};
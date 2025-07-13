import { useState, useCallback, useContext } from 'react';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { auth } from '../environments/firebaseConfig';

const FREE_DAILY_LIMIT = 10;

export const useUsageTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  const db = getFirestore(app);

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Check if user is a premium user with a valid subscription
  const hasPremium = useCallback(() => {
    if (!userProfile) return false;
    if (userProfile.subscriptionType !== 'premium') return false;
    if (!userProfile.subscriptionEndDate) return false;
    const now = new Date();
    const end = new Date(userProfile.subscriptionEndDate);
    return now <= end;
  }, [userProfile]);

  const hasReachedLimit = useCallback(() => {
    if (!userProfile) return false;
    // Premium users with valid subscription have unlimited views
    if (hasPremium()) {
      return false;
    }
    const today = getTodayString();
    const dailyUsage = userProfile.dailyUsage;
    // If no usage data or different date, user hasn't reached limit
    if (!dailyUsage || dailyUsage.date !== today) {
      return false;
    }
    return dailyUsage.viewCount >= FREE_DAILY_LIMIT;
  }, [userProfile, hasPremium]);

  // Get remaining views for today
  const getRemainingViews = useCallback(() => {
    if (!userProfile) return 0;
    // Premium users with valid subscription have unlimited views
    if (hasPremium()) {
      return 999; // Represent unlimited
    }
    const today = getTodayString();
    const dailyUsage = userProfile.dailyUsage;
    // If no usage data or different date, user has full limit
    if (!dailyUsage || dailyUsage.date !== today) {
      return FREE_DAILY_LIMIT;
    }
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
    hasPremium
  };
};
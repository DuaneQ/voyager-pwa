import { useState, useCallback, useContext } from 'react';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import useGetUserId from './useGetUserId';

const FREE_DAILY_LIMIT = 10;

export const useUsageTracking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const userId = useGetUserId();
  const db = getFirestore(app);

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Check if user has reached daily limit
  const hasReachedLimit = useCallback(() => {
    if (!userProfile) return false;
    
    // Premium users have unlimited views
    if (userProfile.subscriptionType === 'premium') {
      return false;
    }

    const today = getTodayString();
    const dailyUsage = userProfile.dailyUsage;

    // If no usage data or different date, user hasn't reached limit
    if (!dailyUsage || dailyUsage.date !== today) {
      return false;
    }

    return dailyUsage.viewCount >= FREE_DAILY_LIMIT;
  }, [userProfile]);

  // Get remaining views for today
  const getRemainingViews = useCallback(() => {
    if (!userProfile) return 0;
    
    // Premium users have unlimited views
    if (userProfile.subscriptionType === 'premium') {
      return 999; // Represent unlimited
    }

    const today = getTodayString();
    const dailyUsage = userProfile.dailyUsage;

    // If no usage data or different date, user has full limit
    if (!dailyUsage || dailyUsage.date !== today) {
      return FREE_DAILY_LIMIT;
    }

    return Math.max(0, FREE_DAILY_LIMIT - dailyUsage.viewCount);
  }, [userProfile]);

  // Track a view (like or dislike)
  const trackView = useCallback(async (): Promise<boolean> => {
    if (!userId || !userProfile) {
      console.error('No user ID or profile found');
      return false;
    }

    // Check if user has reached limit
    if (hasReachedLimit()) {
      console.log('User has reached daily limit');
      return false;
    }

    setIsLoading(true);

    try {
      const today = getTodayString();
      const currentUsage = userProfile.dailyUsage;
      
      let newViewCount = 1;
      
      // If usage exists and is for today, increment count
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

      console.log(`View tracked. Count: ${newViewCount}/${FREE_DAILY_LIMIT}`);
      return true;

    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, userProfile, hasReachedLimit, updateUserProfile, db]);

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
    dailyLimit: FREE_DAILY_LIMIT
  };
};
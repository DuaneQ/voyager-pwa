import { useContext, useState } from 'react';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { app } from '../environments/firebaseConfig';
import { auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';

const CURRENT_TERMS_VERSION = '1.0.0';

export const useSimpleTermsAcceptance = () => {
  const context = useContext(UserProfileContext);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Handle case where context might not be available
  if (!context) {
    throw new Error('useSimpleTermsAcceptance must be used within a UserProfileProvider');
  }
  
  const { userProfile, updateUserProfile, isLoading } = context;
  
  // Simple check: does the user profile have valid terms acceptance?
  const hasAcceptedTerms = Boolean(
    userProfile?.termsAcceptance?.hasAcceptedTerms && 
    userProfile?.termsAcceptance?.termsVersion === CURRENT_TERMS_VERSION
  );

  const acceptTerms = async (): Promise<void> => {
    setError(null);
    
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      const noUserError = new Error('User must be logged in to accept terms');
      setError(noUserError);
      throw noUserError;
    }

    setIsAccepting(true);
    try {
      const acceptanceData = {
        hasAcceptedTerms: true,
        acceptanceDate: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        userAgent: navigator.userAgent,
      };
      
      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', currentUserId);
      
      // Update Firestore
      await updateDoc(userDocRef, {
        termsAcceptance: acceptanceData,
        lastUpdated: new Date(),
      });
      
      // Update local context immediately (no need to refetch!)
      const updatedProfile = {
        ...userProfile,
        termsAcceptance: acceptanceData,
        lastUpdated: new Date(),
      };
      updateUserProfile(updatedProfile);
      
      // Update localStorage cache
      localStorage.setItem("PROFILE_INFO", JSON.stringify(updatedProfile));
      
    } catch (error) {
      console.error('[TermsAcceptance] Error accepting terms:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsAccepting(false);
    }
  };

  return {
    hasAcceptedTerms,
    isAccepting,
    error,
    acceptTerms,
    // Use loading state from context
    isLoading,
  };
};

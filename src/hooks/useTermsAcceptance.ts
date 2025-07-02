import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '../environments/firebaseConfig';
import useGetUserId from './useGetUserId';

interface TermsAcceptance {
  hasAcceptedTerms: boolean;
  acceptanceDate: Date | null;
  termsVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

interface UseTermsAcceptanceReturn {
  hasAcceptedTerms: boolean;
  isLoading: boolean;
  acceptTerms: () => Promise<void>;
  checkTermsStatus: () => Promise<boolean>;
}

const CURRENT_TERMS_VERSION = '1.0.0';

export const useTermsAcceptance = (): UseTermsAcceptanceReturn => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userId = useGetUserId();
  const db = getFirestore(app);

  const checkTermsStatus = async (): Promise<boolean> => {
    if (!userId) {
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const termsAcceptance = userData.termsAcceptance as TermsAcceptance | undefined;
        
        // Check if user has accepted current version of terms
        const hasValidAcceptance = termsAcceptance?.hasAcceptedTerms && 
                                 termsAcceptance?.termsVersion === CURRENT_TERMS_VERSION;
        
        setHasAcceptedTerms(hasValidAcceptance || false);
        setIsLoading(false);
        return hasValidAcceptance || false;
      }
      
      setHasAcceptedTerms(false);
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
      setHasAcceptedTerms(false);
      setIsLoading(false);
      return false;
    }
  };

  const acceptTerms = async (): Promise<void> => {
    if (!userId) {
      throw new Error('User must be logged in to accept terms');
    }

    setIsLoading(true);
    
    try {
      const acceptanceData: TermsAcceptance = {
        hasAcceptedTerms: true,
        acceptanceDate: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        userAgent: navigator.userAgent,
        // Note: In production, you might want to get IP address from your backend
      };

      await updateDoc(doc(db, 'users', userId), {
        termsAcceptance: acceptanceData,
        lastUpdated: new Date(),
      });

      setHasAcceptedTerms(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error accepting terms:', error);
      setIsLoading(false);
      throw error;
    }
  };

  useEffect(() => {
    if (userId) {
      checkTermsStatus();
    } else {
      setIsLoading(false);
      setHasAcceptedTerms(false);
    }
  }, [userId]);

  return {
    hasAcceptedTerms,
    isLoading,
    acceptTerms,
    checkTermsStatus,
  };
};

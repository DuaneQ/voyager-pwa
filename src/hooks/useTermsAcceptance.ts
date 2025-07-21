import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '../environments/firebaseConfig';
import { auth } from '../environments/firebaseConfig';

import { onAuthStateChanged } from 'firebase/auth';

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
  error: Error | null;
  acceptTerms: () => Promise<void>;
  checkTermsStatus: () => Promise<boolean>;
}

const CURRENT_TERMS_VERSION = '1.0.0';

export const useTermsAcceptance = (): UseTermsAcceptanceReturn => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const db = getFirestore(app);
  const requestIdRef = useRef(0);

  // Helper to check terms for a specific uid with timeout
  const checkTermsStatusForUid = useCallback(async (uid: string): Promise<boolean> => {
    if (!uid) return false;
    const thisRequestId = ++requestIdRef.current;
    setError(null);
    setIsLoading(true);
    
    try {
      // Create a timeout promise that rejects after 10 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Terms check timed out. Please check your connection and try again.'));
        }, 10000); // 10 second timeout
      });
      
      // Race between the actual request and timeout
      const userDoc = await Promise.race([
        getDoc(doc(db, 'users', uid)),
        timeoutPromise
      ]);
      
      // Only update state if this is still the most recent request
      if (requestIdRef.current !== thisRequestId) {
        return false;
      }
      
      if (!userDoc.exists()) {
        setHasAcceptedTerms(false);
        return false;
      }
      
      const userData = userDoc.data();
      const termsAcceptance = userData.termsAcceptance;
      const hasValidAcceptance = termsAcceptance?.hasAcceptedTerms && 
                               termsAcceptance?.termsVersion === CURRENT_TERMS_VERSION;
      setHasAcceptedTerms(Boolean(hasValidAcceptance));
      return Boolean(hasValidAcceptance);
    } catch (error) {
      if (requestIdRef.current === thisRequestId) {
        setHasAcceptedTerms(false);
        setError(error instanceof Error ? error : new Error(String(error)));
      }
      console.error('[TermsAcceptance] Error checking terms acceptance:', error);
      return false;
    } finally {
      if (requestIdRef.current === thisRequestId) {
        setIsLoading(false);
      }
    }
  }, [db]);

  // Set initial userId from auth.currentUser, then listen for changes and check terms
  useEffect(() => {
    requestIdRef.current = 0;
    const initialUid = auth?.currentUser?.uid;
    // Set initial state
    setUserId(initialUid);
    if (!initialUid) {
      setHasAcceptedTerms(false);
      setIsLoading(false);
    } else {
      // Check terms for initial user
      checkTermsStatusForUid(initialUid);
    }
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid;
      setUserId(uid);
      if (!uid) {
        setHasAcceptedTerms(false);
        setIsLoading(false);
        setError(null);
      } else {
        checkTermsStatusForUid(uid);
      }
    });
    return () => unsubscribe();
  }, [checkTermsStatusForUid]);

  const acceptTerms = async (): Promise<void> => {
    setError(null);
    
    const currentUserId = auth.currentUser?.uid || userId;
    if (!currentUserId) {
      const noUserError = new Error('User must be logged in to accept terms');
      setError(noUserError);
      throw noUserError;
    }

    setIsLoading(true);
    try {
      const acceptanceData: TermsAcceptance = {
        hasAcceptedTerms: true,
        acceptanceDate: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        userAgent: navigator.userAgent,
      };
      
      const userDocRef = doc(db, 'users', currentUserId);
      
      // Create a timeout promise that rejects after 15 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Terms acceptance timed out. Please check your connection and try again.'));
        }, 15000); // 15 second timeout for writes
      });
      
      // Race between the actual request and timeout
      await Promise.race([
        updateDoc(userDocRef, {
          termsAcceptance: acceptanceData,
          lastUpdated: new Date(),
        }),
        timeoutPromise
      ]);
      
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error('[TermsAcceptance] Error accepting terms:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkTermsStatus = async (): Promise<boolean> => {
    if (!userId) {
      setIsLoading(false);
      return false;
    }
    return checkTermsStatusForUid(userId);
  };

  return {
    hasAcceptedTerms,
    isLoading,
    error,
    acceptTerms,
    checkTermsStatus,
  };
};

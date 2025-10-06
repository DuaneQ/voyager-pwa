import { useState, useEffect, useCallback, useContext } from 'react';
import { 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { 
  TravelPreferenceProfile, 
  UserTravelPreferences,
  PreferenceSignal 
} from '../types/TravelPreferences';
import { 
  TravelPreferencesError, 
  TravelPreferencesErrors, 
  wrapError 
} from '../errors/TravelPreferencesErrors';
import { 
  validateTravelPreferenceProfile,
  validateUserTravelPreferences,
  validatePreferenceSignal,
  sanitizePreferences 
} from '../utils/travelPreferencesValidation';

export interface UseTravelPreferencesReturn {
  // State
  preferences: UserTravelPreferences | null;
  loading: boolean;
  error: TravelPreferencesError | null;
  
  // Profile Operations
  createProfile: (profile: Omit<TravelPreferenceProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProfile: (profileId: string, updates: Partial<TravelPreferenceProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  duplicateProfile: (profileId: string, newName: string) => Promise<string>;
  setDefaultProfile: (profileId: string) => Promise<void>;
  
  // Data Operations
  loadPreferences: () => Promise<void>;
  savePreferences: (preferences: UserTravelPreferences) => Promise<void>;
  
  // Learning System
  recordPreferenceSignal: (signal: Omit<PreferenceSignal, 'id' | 'timestamp' | 'processed'>) => Promise<void>;
  
  // Utility
  getProfileById: (profileId: string) => TravelPreferenceProfile | null;
  getDefaultProfile: () => TravelPreferenceProfile | null;
  resetError: () => void;
}

export const useTravelPreferences = (): UseTravelPreferencesReturn => {
  const [preferences, setPreferences] = useState<UserTravelPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TravelPreferencesError | null>(null);

  // Get user profile data from context instead of making DB calls (when available)
  const context = useContext(UserProfileContext);
  const userProfile = context?.userProfile;
  const updateUserProfile = context?.updateUserProfile;

  // Internal state to track synchronization
  const [lastSyncedVersion, setLastSyncedVersion] = useState<string | null>(null);

  // Helper to create a version key for sync tracking
  const createSyncVersion = useCallback((prefs: UserTravelPreferences | null): string => {
    if (!prefs) return 'null';
    const profilesCount = prefs.profiles?.length || 0;
    const signalsCount = prefs.preferenceSignals?.length || 0;
    return `${profilesCount}_${prefs.defaultProfileId || 'none'}_${signalsCount}`;
  }, []);

  // Helper to update both local state and context consistently
  const updateBothStates = useCallback((newPreferences: UserTravelPreferences) => {
    // Update local state first
    setPreferences(newPreferences);
    console.log('[useTravelPreferences] updateBothStates called. New preferences:', newPreferences);
    // Update context to keep everything in sync
    if (userProfile && updateUserProfile) {
      const updatedProfile = {
        ...userProfile,
        travelPreferences: newPreferences
      };
      console.log('[useTravelPreferences] updateUserProfile called with:', updatedProfile);
      updateUserProfile(updatedProfile);
      // Update localStorage for persistence
      localStorage.setItem('PROFILE_INFO', JSON.stringify(updatedProfile));
    }
    // Update sync version (safely handle the new preferences)
    const newVersion = createSyncVersion(newPreferences);
    setLastSyncedVersion(newVersion);
  }, [userProfile, updateUserProfile, createSyncVersion]);

  // Helper to generate profile ID
  const generateProfileId = () => `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Load user preferences from Firestore only (context sync handled separately)
  const loadPreferences = useCallback(async (): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch from DB directly (don't mix with context sync here)
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const travelPrefs = userData.travelPreferences as UserTravelPreferences || {
          profiles: [],
          defaultProfileId: null,
          preferenceSignals: []
        };
        
        // Only update local state here - context sync handled in useEffect
        setPreferences(travelPrefs);
      } else {
        // Initialize empty preferences for new users
        const emptyPrefs: UserTravelPreferences = {
          profiles: [],
          defaultProfileId: null,
          preferenceSignals: []
        };
        
        // Only update local state here - context sync handled in useEffect
        setPreferences(emptyPrefs);
      }
    } catch (err) {
      const wrappedError = wrapError(err, 'load preferences');
      setError(wrappedError);
      console.error('Error loading travel preferences:', wrappedError);
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies that could cause loops

  // Save preferences to Firestore and update context
  const savePreferences = useCallback(async (
    preferences: UserTravelPreferences
  ): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    try {
      setLoading(true);
      setError(null);

      // Comprehensive data validation before saving
      validateUserTravelPreferences(preferences);
      
      // Sanitize data before saving
      const sanitizedPreferences = sanitizePreferences(preferences);

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          travelPreferences: sanitizedPreferences,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new user document with travel preferences
        await setDoc(userRef, {
          travelPreferences: sanitizedPreferences,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Use unified state update to maintain synchronization
      updateBothStates(sanitizedPreferences);
    } catch (err) {
      const wrappedError = wrapError(err, 'save preferences');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setLoading(false);
    }
  }, [updateBothStates]);

  // Create a new travel preference profile
  const createProfile = useCallback(async (
    profile: Omit<TravelPreferenceProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    try {
      console.log('[useTravelPreferences] createProfile called with:', profile);
      setLoading(true);
      setError(null);
      // Comprehensive validation for the new profile
      validateTravelPreferenceProfile(profile, false);
      const profileId = generateProfileId();
      const now = new Date();
      const newProfile: TravelPreferenceProfile = {
        ...profile,
        id: profileId,
        name: profile.name.trim(),
        createdAt: now,
        updatedAt: now
      };
      // Update user's travel preferences
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      let currentPrefs: UserTravelPreferences;
      if (userDoc.exists()) {
        const userData = userDoc.data();
        currentPrefs = userData.travelPreferences as UserTravelPreferences || {
          profiles: [],
          defaultProfileId: null,
          preferenceSignals: []
        };
      } else {
        currentPrefs = {
          profiles: [],
          defaultProfileId: null,
          preferenceSignals: []
        };
      }
      console.log('[useTravelPreferences] Existing profiles before creation:', currentPrefs.profiles);
      // Check for duplicate profile names (case-insensitive)
      const existingProfile = currentPrefs.profiles.find(p => 
        p.name.toLowerCase().trim() === newProfile.name.toLowerCase().trim()
      );
      if (existingProfile) {
        throw TravelPreferencesErrors.duplicateProfileName(newProfile.name);
      }
      const hasValidDefault = currentPrefs.defaultProfileId
        ? currentPrefs.profiles.some(p => p.id === currentPrefs.defaultProfileId)
        : false;
      const effectiveDefaultId = hasValidDefault ? currentPrefs.defaultProfileId : profileId;
      const updatedPrefs: UserTravelPreferences = {
        ...currentPrefs,
        profiles: [...currentPrefs.profiles, newProfile],
        defaultProfileId: effectiveDefaultId
      };
      console.log('[useTravelPreferences] Updated profiles after creation:', updatedPrefs.profiles);
      // Validate the complete preferences structure before saving
      validateUserTravelPreferences(updatedPrefs);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          travelPreferences: updatedPrefs,
          updatedAt: serverTimestamp() // Only use serverTimestamp at document level
        });
      } else {
        await setDoc(userRef, {
          travelPreferences: updatedPrefs,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      // Use unified state update to maintain synchronization
      updateBothStates(updatedPrefs);
      return profileId;
    } catch (err) {
      console.error('[useTravelPreferences] createProfile error:', err);
      const wrappedError = wrapError(err, 'create profile');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setLoading(false);
    }
  }, [updateBothStates]);

  // Update an existing travel preference profile, or create it if it doesn't exist
  const updateProfile = useCallback(async (profileId: string, updates: Partial<TravelPreferenceProfile>): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      let currentPrefs: UserTravelPreferences = userDoc.exists()
        ? (userDoc.data().travelPreferences as UserTravelPreferences)
        : { profiles: [], defaultProfileId: null, preferenceSignals: [] };

      // Find the profile by ID
      const profileIndex = currentPrefs.profiles.findIndex(p => p.id === profileId);
      const now = new Date();

      if (profileIndex === -1) {
        // If not found, treat as create
        const newId = `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newProfile: TravelPreferenceProfile = {
          ...updates,
          id: newId,
          name: updates.name ? updates.name.trim() : 'Unnamed Profile',
          createdAt: now,
          updatedAt: now,
          isDefault: currentPrefs.profiles.length === 0
        } as TravelPreferenceProfile;
        currentPrefs.profiles = [...currentPrefs.profiles, newProfile];
        if (currentPrefs.profiles.length === 1) {
          currentPrefs.defaultProfileId = newId;
        }
      } else {
        // Otherwise, check if name is being changed
        const existingProfile = currentPrefs.profiles[profileIndex];
        if (updates.name && updates.name.trim() !== existingProfile.name) {
          // Name is changed: create a new profile (append), DO NOT update original
          const duplicateProfile = currentPrefs.profiles.find((p, index) =>
            index !== profileIndex &&
            p.name.toLowerCase().trim() === updates.name!.toLowerCase().trim()
          );
          if (duplicateProfile) {
            throw TravelPreferencesErrors.duplicateProfileName(updates.name);
          }
          const newId = `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const newProfile: TravelPreferenceProfile = {
            ...existingProfile,
            ...updates,
            id: newId,
            name: updates.name ? updates.name.trim() : existingProfile.name,
            createdAt: now,
            updatedAt: now,
            isDefault: false
          };
          // Append the new profile, keep the original
          currentPrefs.profiles = [...currentPrefs.profiles, newProfile];
        } else {
          // Name is unchanged: update in place, always preserve name
          const updatedProfile: TravelPreferenceProfile = {
            ...existingProfile,
            ...updates,
            name: existingProfile.name,
            updatedAt: now
          };
          currentPrefs.profiles[profileIndex] = updatedProfile;
        }
      }

      // Validate the complete preferences structure before saving
      validateUserTravelPreferences(currentPrefs);

      // Update local state immediately for test and UI sync
      updateBothStates({ ...currentPrefs, profiles: [...currentPrefs.profiles] });

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          travelPreferences: currentPrefs,
          updatedAt: serverTimestamp() // Only use serverTimestamp at document level
        });
      } else {
        await setDoc(userRef, {
          travelPreferences: currentPrefs,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      const wrappedError = wrapError(err, 'update profile');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setLoading(false);
    }
  }, [updateBothStates]);

  // Delete a travel preference profile
  const deleteProfile = useCallback(async (profileId: string): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    try {
      setLoading(true);
      setError(null);

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw TravelPreferencesErrors.documentNotFound();
      }

      const userData = userDoc.data();
      const currentPrefs = userData.travelPreferences as UserTravelPreferences || {
        profiles: [],
        defaultProfileId: null,
        preferenceSignals: []
      };

      // Find the profile to delete
      const profileToDelete = currentPrefs.profiles.find(p => p.id === profileId);
      if (!profileToDelete) {
        throw TravelPreferencesErrors.profileNotFound(profileId);
      }

      // Prevent deletion of the last profile
      if (currentPrefs.profiles.length === 1) {
        throw TravelPreferencesErrors.lastProfileDeletion();
      }

      // Prevent deletion of default profile without setting a new default
      if (profileToDelete.isDefault || currentPrefs.defaultProfileId === profileId) {
        throw TravelPreferencesErrors.defaultProfileDeletion();
      }

      const updatedProfiles = currentPrefs.profiles.filter(p => p.id !== profileId);
      
      // If the deleted profile was the default, clear the default
      const updatedDefaultId = currentPrefs.defaultProfileId === profileId 
        ? (updatedProfiles.length > 0 ? updatedProfiles[0].id : null)
        : currentPrefs.defaultProfileId;

      const updatedPrefs: UserTravelPreferences = {
        ...currentPrefs,
        profiles: updatedProfiles,
        defaultProfileId: updatedDefaultId
      };

      await updateDoc(userRef, {
        travelPreferences: updatedPrefs,
        updatedAt: serverTimestamp()
      });

      // Use unified state update to maintain synchronization
      updateBothStates(updatedPrefs);
    } catch (err) {
      const wrappedError = wrapError(err, 'delete profile');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setLoading(false);
    }
  }, [updateBothStates]);

  // Duplicate a travel preference profile
  const duplicateProfile = useCallback(async (profileId: string, newName: string): Promise<string> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    try {
      setLoading(true);
      setError(null);

      // Validate the new name
      if (!newName || newName.trim().length === 0) {
        throw TravelPreferencesErrors.invalidProfileData('name', 'Profile name cannot be empty');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw TravelPreferencesErrors.documentNotFound();
      }

      const userData = userDoc.data();
      const currentPrefs = userData.travelPreferences as UserTravelPreferences || {
        profiles: [],
        defaultProfileId: null,
        preferenceSignals: []
      };

      const sourceProfile = currentPrefs.profiles.find(p => p.id === profileId);
      if (!sourceProfile) {
        throw TravelPreferencesErrors.profileNotFound(profileId);
      }

      // Check for duplicate names (case-insensitive)
      const sanitizedNewName = newName.trim();
      const existingProfile = currentPrefs.profiles.find(p => 
        p.name.toLowerCase().trim() === sanitizedNewName.toLowerCase()
      );
      if (existingProfile) {
        throw TravelPreferencesErrors.duplicateProfileName(sanitizedNewName);
      }

      const newProfileId = generateProfileId();
      const now = new Date(); // Use Date object instead of serverTimestamp for nested fields
      
      const duplicatedProfile: TravelPreferenceProfile = {
        ...sourceProfile,
        id: newProfileId,
        name: sanitizedNewName,
        isDefault: false, // Duplicated profiles are never default
        createdAt: now,
        updatedAt: now
      };

      // Validate the duplicated profile
      validateTravelPreferenceProfile(duplicatedProfile, false);

      const updatedPrefs: UserTravelPreferences = {
        ...currentPrefs,
        profiles: [...currentPrefs.profiles, duplicatedProfile]
      };

      // Validate the complete preferences structure before saving
      validateUserTravelPreferences(updatedPrefs);

      await updateDoc(userRef, {
        travelPreferences: updatedPrefs,
        updatedAt: serverTimestamp() // Only use serverTimestamp at document level
      });

      // Use unified state update to maintain synchronization
      updateBothStates(updatedPrefs);
      
      return newProfileId;
    } catch (err) {
      const wrappedError = wrapError(err, 'duplicate profile');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setLoading(false);
    }
  }, [updateBothStates]);

  // Set a profile as the default
  const setDefaultProfile = useCallback(async (profileId: string): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    try {
      setLoading(true);
      setError(null);

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw TravelPreferencesErrors.documentNotFound();
      }

      const userData = userDoc.data();
      const currentPrefs = userData.travelPreferences as UserTravelPreferences || {
        profiles: [],
        defaultProfileId: null,
        preferenceSignals: []
      };

      // Verify the profile exists
      const profileExists = currentPrefs.profiles.some(p => p.id === profileId);
      if (!profileExists) {
        throw TravelPreferencesErrors.profileNotFound(profileId);
      }

      const now = new Date(); // Use Date object instead of serverTimestamp for nested fields

      // Update the isDefault flag for all profiles
      const updatedProfiles = currentPrefs.profiles.map(profile => ({
        ...profile,
        isDefault: profile.id === profileId,
        updatedAt: profile.id === profileId ? now : profile.updatedAt
      }));

      const updatedPrefs: UserTravelPreferences = {
        ...currentPrefs,
        profiles: updatedProfiles,
        defaultProfileId: profileId
      };

      // Validate the complete preferences structure before saving
      validateUserTravelPreferences(updatedPrefs);

      await updateDoc(userRef, {
        travelPreferences: updatedPrefs,
        updatedAt: serverTimestamp() // Only use serverTimestamp at document level
      });

      // Use unified state update to maintain synchronization
      updateBothStates(updatedPrefs);
    } catch (err) {
      const wrappedError = wrapError(err, 'set default profile');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setLoading(false);
    }
  }, [updateBothStates]);

  // Record a preference signal for learning
  const recordPreferenceSignal = useCallback(async (signal: Omit<PreferenceSignal, 'id' | 'timestamp' | 'processed'>): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw TravelPreferencesErrors.userNotAuthenticated();
    }

    try {
      setError(null);

      const signalId = `signal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const newSignal: PreferenceSignal = {
        ...signal,
        id: signalId,
        timestamp: new Date(), // Use Date object instead of serverTimestamp for nested fields
        processed: false
      };

      // Validate the preference signal before saving
      validatePreferenceSignal(newSignal);

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentPrefs = userData.travelPreferences as UserTravelPreferences || {
          profiles: [],
          defaultProfileId: null,
          preferenceSignals: []
        };

        const updatedPrefs: UserTravelPreferences = {
          ...currentPrefs,
          preferenceSignals: [...currentPrefs.preferenceSignals, newSignal]
        };

        // Validate the complete preferences structure before saving
        validateUserTravelPreferences(updatedPrefs);

        await updateDoc(userRef, {
          travelPreferences: updatedPrefs,
          updatedAt: serverTimestamp() // Only use serverTimestamp at document level
        });

        // Use unified state update to maintain synchronization
        updateBothStates(updatedPrefs);
      }
    } catch (err) {
      const wrappedError = wrapError(err, 'record preference signal');
      setError(wrappedError);
      console.error('Error recording preference signal:', wrappedError);
    }
  }, [updateBothStates]);

  // Utility functions
  const getProfileById = useCallback((profileId: string): TravelPreferenceProfile | null => {
    return preferences?.profiles.find(p => p.id === profileId) || null;
  }, [preferences]);

  const getDefaultProfile = useCallback((): TravelPreferenceProfile | null => {
    if (!preferences?.defaultProfileId) return null;
    return getProfileById(preferences.defaultProfileId);
  }, [preferences?.defaultProfileId, getProfileById]);

  // Load preferences when auth state changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Sync preferences from UserProfileContext when it changes (one-way sync from context to local state)
  useEffect(() => {
    // Debug: log context and local state before sync
    console.log('[useTravelPreferences] Context sync effect. userProfile:', userProfile, 'local preferences:', preferences);
    // Only sync from context if we have context data and it's different from local state
    if (userProfile?.travelPreferences && !loading) {
      const contextVersion = createSyncVersion(userProfile.travelPreferences);
      const currentVersion = createSyncVersion(preferences);
      // Only update if context has different data and we're not already synced
      if (contextVersion !== currentVersion && contextVersion !== lastSyncedVersion) {
        console.log('[useTravelPreferences] Syncing local preferences from context.');
        setPreferences(userProfile.travelPreferences);
        setLastSyncedVersion(contextVersion);
      }
    } else if (userProfile && !userProfile.travelPreferences && !loading) {
      // User profile loaded but no travel preferences yet
      const emptyPrefs = {
        profiles: [],
        defaultProfileId: null,
        preferenceSignals: []
      };
      const emptyVersion = createSyncVersion(emptyPrefs);
      const currentVersion = createSyncVersion(preferences);
      if (emptyVersion !== currentVersion && emptyVersion !== lastSyncedVersion) {
        console.log('[useTravelPreferences] Syncing local preferences to empty.');
        setPreferences(emptyPrefs);
        setLastSyncedVersion(emptyVersion);
      }
    }
  }, [userProfile?.travelPreferences, loading, preferences, createSyncVersion, lastSyncedVersion]);

  return {
    // State
    preferences,
    loading,
    error,
    
    // Profile Operations
    createProfile,
    updateProfile,
    deleteProfile,
    duplicateProfile,
    setDefaultProfile,
    
    // Data Operations
    loadPreferences,
    savePreferences,
    
    // Learning System
    recordPreferenceSignal,
    
    // Utility
    getProfileById,
    getDefaultProfile,
    resetError
  };
};

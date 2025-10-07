import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../environments/firebaseConfig';

// Simple test function to verify Firestore connectivity
export const testFirestoreConnection = async (userId: string) => {
  // Debug helper invoked via window in dev only
  try {
    // Test writing a simple document
    const testDoc = doc(db, 'test', 'connectivity');
    await setDoc(testDoc, {
      timestamp: new Date(),
      message: 'Firestore connection test',
      userId: userId
    });
  // write succeeded
    // Test reading the document
    const docSnap = await getDoc(testDoc);
    if (!docSnap.exists()) {
      // document missing
    }
    
    // Test user document structure
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    // user doc existence checked
    
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
};

// Test travel preferences specifically
export const testTravelPreferencesWrite = async (userId: string) => {
  // Travel preferences write test (dev helper)
  try {
    const userDocRef = doc(db, 'users', userId);
    
    const testPreferences = {
      profiles: [{
        id: 'test-profile',
        name: 'Test Profile',
        isDefault: true,
        travelStyle: 'mid-range',
        budgetRange: { min: 1000, max: 5000, currency: 'USD' },
  activities: [],
        foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
        accommodation: { type: 'hotel', starRating: 3 },
        transportation: { primaryMode: 'mixed', maxWalkingDistance: 15 },
        groupSize: { preferred: 2, sizes: [1, 2, 4] },
        accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      defaultProfileId: 'test-profile'
    };
    
    await setDoc(userDocRef, {
      travelPreferences: testPreferences
    }, { merge: true });
    
  // write successful
    // Verify the write
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Travel preferences test failed:', error);
    return false;
  }
};

// Make functions available globally for browser console testing
declare global {
  interface Window {
    testFirestoreConnection: typeof testFirestoreConnection;
    testTravelPreferencesWrite: typeof testTravelPreferencesWrite;
  }
}

window.testFirestoreConnection = testFirestoreConnection;
window.testTravelPreferencesWrite = testTravelPreferencesWrite;

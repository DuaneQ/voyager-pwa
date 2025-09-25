import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../environments/firebaseConfig';

// Simple test function to verify Firestore connectivity
export const testFirestoreConnection = async (userId: string) => {
  console.log('Testing Firestore connection...');
  
  try {
    // Test writing a simple document
    const testDoc = doc(db, 'test', 'connectivity');
    await setDoc(testDoc, {
      timestamp: new Date(),
      message: 'Firestore connection test',
      userId: userId
    });
    console.log('✅ Write test successful');
    
    // Test reading the document
    const docSnap = await getDoc(testDoc);
    if (docSnap.exists()) {
      console.log('✅ Read test successful:', docSnap.data());
    } else {
      console.log('❌ Document does not exist');
    }
    
    // Test user document structure
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log('✅ User document exists:', userDoc.data());
    } else {
      console.log('⚠️ User document does not exist - will be created on first save');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
};

// Test travel preferences specifically
export const testTravelPreferencesWrite = async (userId: string) => {
  console.log('Testing travel preferences write...');
  
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
    
    console.log('✅ Travel preferences write test successful');
    
    // Verify the write
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('✅ Travel preferences read back:', data.travelPreferences);
      return true;
    } else {
      console.log('❌ Could not read back travel preferences');
      return false;
    }
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

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Initialize Firebase with dev config
const firebaseConfig = {
  apiKey: "AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0",
  authDomain: "mundo1-dev.firebaseapp.com",
  projectId: "mundo1-dev",
  storageBucket: "mundo1-dev.firebasestorage.app",
  messagingSenderId: "296095212837",
  appId: "1:296095212837:web:6fd8f831e3d7f642f726cc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export const setupTestData = async () => {
  console.log('Starting test data setup...');
  // Load test data
  const testUsers = require('../fixtures/test-users.json');
  const testItineraries = require('../fixtures/test-itineraries.json');

  try {
    console.log('Setting up test user profile...');
    // Add test user profile
    const userRef = doc(db, 'users', testUsers.testUser1.uid);
    await setDoc(userRef, testUsers.testUser1.profile);
    console.log('Test user profile created successfully');

    // Add test user's itinerary
    const userItineraryRef = doc(db, 'itineraries', testUsers.testUser1.itinerary.id);
    await setDoc(userItineraryRef, {
      ...testUsers.testUser1.itinerary,
      userInfo: {
        ...testUsers.testUser1.profile,
        uid: testUsers.testUser1.uid
      }
    });

    // Add matching itinerary
    const matchingItineraryRef = doc(db, 'itineraries', testItineraries.matchingItinerary.id);
    await setDoc(matchingItineraryRef, testItineraries.matchingItinerary);

    // Add non-matching itineraries
    for (const itinerary of testItineraries.nonMatchingItineraries) {
      const itineraryRef = doc(db, 'itineraries', itinerary.id);
      await setDoc(itineraryRef, itinerary);
    }

    console.log('Test data setup complete');
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
};

export const cleanupTestData = async () => {
  try {
    const testUsers = require('../fixtures/test-users.json');
    const testItineraries = require('../fixtures/test-itineraries.json');

    // Delete test user profile but NOT the auth user
    await deleteDoc(doc(db, 'users', testUsers.testUser1.uid));

    // Delete test user's itinerary
    await deleteDoc(doc(db, 'itineraries', testUsers.testUser1.itinerary.id));

    // Delete matching itinerary
    await deleteDoc(doc(db, 'itineraries', testItineraries.matchingItinerary.id));

    // Delete non-matching itineraries
    for (const itinerary of testItineraries.nonMatchingItineraries) {
      await deleteDoc(doc(db, 'itineraries', itinerary.id));
    }

    console.log('Test data cleanup complete');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
};

// Modified function to use a mock approach for Cypress tests
export const loginTestUser = async () => {
  try {
    // Use a hardcoded user ID that matches the actual Firestore record
    // instead of relying on the fixture which might have an outdated ID
    const realUserId = 'Yxu8nkH9ewXqyzCZIcYt824IbRw2'; // Actual ID from Firestore
    console.log('Mocking login for test user with ID:', realUserId);
    
    // For Cypress tests, we'll mock the Firebase auth
    // Instead of actually calling signInWithEmailAndPassword which may hang
    const mockUser = {
      uid: realUserId,
      email: 'travaltestuser@gmail.com',
      displayName: 'Test User',
      emailVerified: true
    };
    
    console.log('Test user login mocked successfully:', mockUser.uid);
    
    // Mock the user data in Firestore
    try {
      const userRef = doc(db, 'users', mockUser.uid);
      await setDoc(userRef, { 
        // Define basic profile properties instead of using testUsers fixture
        displayName: 'Test User',
        email: 'travaltestuser@gmail.com',
        gender: 'Male',
        dob: '1990-01-01',
        // Include terms acceptance for the TermsGuard
        termsAcceptance: {
          hasAcceptedTerms: true,
          acceptanceDate: new Date().toISOString(),
          termsVersion: "1.0.0",
          userAgent: "Cypress Test Browser"
        }
      }, { merge: true });
      console.log('Updated test user with terms acceptance');
    } catch (termsError) {
      console.error('Failed to update terms acceptance:', termsError);
    }
    
    // Return the mock user for tests
    return mockUser;
  } catch (error) {
    console.error('Error logging in test user:', error);
    throw error;
  }
};

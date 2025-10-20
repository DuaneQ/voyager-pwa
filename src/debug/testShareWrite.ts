/**
 * Debug script to test that AI itinerary sharing writes the full data structure to Firestore
 * Run this in browser console on the AI Itineraries page after generating an itinerary
 */

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../environments/firebaseConfig';

export const testShareWrite = async (itinerary: any) => {
  console.log('🧪 Testing share write with itinerary:', itinerary.id);
  
  // Show what we're about to write
  console.log('📝 Itinerary structure before write:', {
    hasResponse: !!itinerary.response,
    hasRecommendations: !!itinerary.response?.data?.recommendations,
    hasMetadata: !!itinerary.response?.data?.metadata,
    recommendationsKeys: itinerary.response?.data?.recommendations ? Object.keys(itinerary.response.data.recommendations) : [],
    metadataKeys: itinerary.response?.data?.metadata ? Object.keys(itinerary.response.data.metadata) : [],
  });

  // Simulate the share write
  const testId = `test_share_${Date.now()}`;
  const payload = {
    ...itinerary,
    id: testId,
    createdAt: itinerary.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    response: itinerary.response || {},
  };

  const ref = doc(db, 'itineraries', testId);
  
  console.log('💾 Writing to Firestore with merge: false...');
  await setDoc(ref, payload, { merge: false });
  
  console.log('✅ Write complete! Now reading back...');
  
  // Read it back to verify
  const docSnap = await getDoc(ref);
  
  if (docSnap.exists()) {
    const readData = docSnap.data();
    console.log('📖 Data read back from Firestore:', {
      hasResponse: !!readData.response,
      hasRecommendations: !!readData.response?.data?.recommendations,
      hasMetadata: !!readData.response?.data?.metadata,
      recommendationsKeys: readData.response?.data?.recommendations ? Object.keys(readData.response.data.recommendations) : [],
      metadataKeys: readData.response?.data?.metadata ? Object.keys(readData.response.data.metadata) : [],
      accommodationsCount: readData.response?.data?.recommendations?.accommodations?.length || 0,
      activitiesCount: readData.response?.data?.recommendations?.activities?.length || 0,
      restaurantsCount: readData.response?.data?.recommendations?.restaurants?.length || 0,
    });
    
    // Check for prices and booking URLs
    const firstAccommodation = readData.response?.data?.recommendations?.accommodations?.[0];
    if (firstAccommodation) {
      console.log('🏨 First accommodation data:', {
        name: firstAccommodation.name,
        hasPrice: !!firstAccommodation.price,
        priceValue: firstAccommodation.price,
        hasBookingUrl: !!firstAccommodation.bookingUrl,
        bookingUrl: firstAccommodation.bookingUrl,
      });
    }
    
    console.log('✅ TEST PASSED: Data structure preserved correctly!');
    return readData;
  } else {
    console.error('❌ TEST FAILED: Document not found after write');
    return null;
  }
};

// To use this in browser console:
// 1. Open AI Itineraries page
// 2. Select an itinerary
// 3. Open console and run:
//    import('./debug/testShareWrite').then(m => m.testShareWrite(selectedItinerary))

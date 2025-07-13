const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // <-- Place your downloaded service account key here
const data = require('./cypress/fixtures/test-itineraries.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importItineraries() {
  const itineraries = [
    data.currentUserItinerary,
    data.matchingItinerary,
    ...data.nonMatchingItineraries
  ];
  for (const itinerary of itineraries) {
    await db.collection('itineraries').doc(itinerary.id).set(itinerary);
    console.log(`Imported: ${itinerary.id}`);
  }
  process.exit();
}

importItineraries();

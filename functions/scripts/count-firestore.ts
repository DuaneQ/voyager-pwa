import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function main() {
  try {
    const snap = await db.collection('itineraries').count().get();
    const total = snap.data()?.count ?? 0;
    console.log(`FIRESTORE_COUNT:${total}`);
    process.exit(0);
  } catch (err) {
    console.error('Count failed', err);
    process.exit(2);
  }
}

main();

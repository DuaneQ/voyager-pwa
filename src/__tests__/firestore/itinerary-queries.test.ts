import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { Itinerary } from '../../types/Itinerary';

let testEnv: RulesTestEnvironment;
const projectId = 'test-project';

// Test data setup
const testItineraries = [
  {
    id: 'itinerary1',
    destination: 'Paris',
    startDate: '2025-08-01',
    endDate: '2025-08-10',
    startDay: new Date('2025-08-01').getTime(),
    endDay: new Date('2025-08-10').getTime(),
    gender: 'Female',
    status: 'single',
    sexualOrientation: 'heterosexual',
    userInfo: {
      uid: 'user1',
      gender: 'Female',
      dob: '1995-01-01',
      status: 'single',
      sexualOrientation: 'heterosexual'
    }
  },
  {
    id: 'itinerary2',
    destination: 'Paris',
    startDate: '2025-08-01',
    endDate: '2025-08-10',
    startDay: new Date('2025-08-01').getTime(),
    endDay: new Date('2025-08-10').getTime(),
    gender: 'Male',
    status: 'married',
    sexualOrientation: 'heterosexual',
    userInfo: {
      uid: 'user2',
      gender: 'Male',
      dob: '1990-01-01',
      status: 'married',
      sexualOrientation: 'heterosexual'
    }
  }
];

describe('Firestore Query Tests', () => {
  const testAuth = {
    sub: 'testUser123',
    email: 'test@example.com'
  };

  beforeAll(async () => {
    // Initialize Firestore test environment
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { 
        host: 'localhost', 
        port: 8080 
      },
      hub: { host: 'localhost', port: 4400 },
      useEmulators: true
    });

    // Clear existing data
    await testEnv.clearFirestore();

    // Seed test data
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    
    for (const itinerary of testItineraries) {
      await setDoc(doc(db, 'itineraries', itinerary.id), itinerary);
    }
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  // Test direct Firestore queries
  it('should correctly filter by destination', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const snapshot = await db.collection('itineraries')
      .where('destination', '==', 'Paris')
      .get();

    expect(snapshot.size).toBe(2);
    snapshot.forEach(doc => {
      expect(doc.data().destination).toBe('Paris');
    });
  });

  it('should filter by gender preference', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const snapshot = await db.collection('itineraries')
      .where('userInfo.gender', '==', 'Female')
      .get();

    expect(snapshot.size).toBe(1);
    snapshot.forEach(doc => {
      expect(doc.data().userInfo.gender).toBe('Female');
    });
  });

  it('should filter by relationship status', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const snapshot = await db.collection('itineraries')
      .where('userInfo.status', '==', 'married')
      .get();

    expect(snapshot.size).toBe(1);
    snapshot.forEach(doc => {
      expect(doc.data().userInfo.status).toBe('married');
    });
  });

  it('should filter by sexual orientation', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const snapshot = await db.collection('itineraries')
      .where('userInfo.sexualOrientation', '==', 'heterosexual')
      .get();

    expect(snapshot.size).toBe(2);
    snapshot.forEach(doc => {
      expect(doc.data().userInfo.sexualOrientation).toBe('heterosexual');
    });
  });

  it('should combine multiple filters', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const snapshot = await db.collection('itineraries')
      .where('destination', '==', 'Paris')
      .where('userInfo.gender', '==', 'Female')
      .where('userInfo.status', '==', 'single')
      .get();

    expect(snapshot.size).toBe(1);
    const doc = snapshot.docs[0];
    const data = doc.data();
    expect(data.destination).toBe('Paris');
    expect(data.userInfo.gender).toBe('Female');
    expect(data.userInfo.status).toBe('single');
  });

  it('should handle date range queries', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const targetDate = new Date('2025-08-05').getTime();
    
    const snapshot = await db.collection('itineraries')
      .where('endDay', '>=', targetDate)
      .get();

    expect(snapshot.size).toBe(2);
    snapshot.forEach(doc => {
      expect(doc.data().endDay).toBeGreaterThanOrEqual(targetDate);
    });
  });

  it('should return empty result for non-matching criteria', async () => {
    const db = testEnv.authenticatedContext('testUser', testAuth).firestore();
    const snapshot = await db.collection('itineraries')
      .where('destination', '==', 'London')
      .get();

    expect(snapshot.size).toBe(0);
  });
});

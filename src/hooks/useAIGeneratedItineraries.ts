import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../environments/firebaseConfig';
import { auth } from '../environments/firebaseConfig';

export interface AIGeneratedItinerary {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: any;
  updatedAt: any;
  response?: {
    success: boolean;
    data?: {
      itinerary: {
        id: string;
        destination: string;
        startDate: string;
        endDate: string;
        description?: string;
        days: Array<{
          date: string;
          activities: Array<{
            id: string;
            name: string;
            description: string;
            location: string;
            startTime: string;
            endTime: string;
            category: string;
            estimatedCost: {
              amount: number;
              currency: string;
            };
          }>;
        }>;
        dailyPlans?: Array<{
          date: string;
          activities: Array<{
            id: string;
            name: string;
            description: string;
            location: string;
            startTime: string;
            endTime: string;
            category: string;
            estimatedCost: {
              amount: number;
              currency: string;
            };
          }>;
        }>;
        externalData?: {
          flightPrices?: Array<{
            id: string;
            airline: string;
            price: {
              amount: number;
              currency: string;
            };
            departure: {
              airport: string;
              time: string;
            };
            arrival: {
              airport: string;
              time: string;
            };
            duration: string;
            stops: number;
          }>;
          hotelRecommendations?: Array<{
            id: string;
            name: string;
            type: string;
            location: {
              name: string;
              address: string;
            };
            pricePerNight: {
              amount: number;
              currency: string;
            };
            rating: number;
            amenities: string[];
          }>;
        };
      };
      metadata: {
        generationId: string;
        confidence: number;
        processingTime: number;
        aiModel: string;
        version: string;
      };
      costBreakdown: {
        total: number;
        perPerson: number;
        byCategory: {
          accommodation: number;
          food: number;
          activities: number;
          transportation: number;
          misc: number;
        };
        byDay?: Array<{
          day: number;
          date: string;
          accommodation: number;
          food: number;
          activities: number;
          transportation: number;
          misc: number;
          total: number;
        }>;
      };
      recommendations?: {
        flights?: Array<{
          id: string;
          airline: string;
          flightNumber: string;
          route: string;
          price: {
            amount: number;
            currency: string;
          };
          duration: string;
          departureTime: string;
          arrivalTime: string;
          stops: number;
          class: string;
          bookingUrl?: string;
        }>;
        accommodations: Array<{
          id: string;
          name: string;
          type: 'hotel' | 'hostel' | 'apartment' | 'bnb';
          location: {
            name: string;
            address: string;
            coordinates: { lat: number; lng: number };
          };
          pricePerNight: {
            amount: number;
            currency: string;
          };
          rating: number;
          amenities: string[];
          website?: string;
          bookingUrl?: string;
          pros: string[];
          cons: string[];
        }>;
        transportation?: Array<{
          mode: string;
          provider: string;
          estimatedCost: {
            amount: number;
            currency: string;
          };
          duration: string;
          pros: string[];
          cons: string[];
          bookingInfo?: {
            url?: string;
            instructions?: string;
          };
        }>;
        alternativeActivities: Array<{
          id: string;
          name: string;
          category: string;
          description: string;
          location: {
            name: string;
            coordinates: { lat: number; lng: number };
          };
          estimatedCost: {
            amount: number;
            currency: string;
          };
          duration: number;
          rating?: number;
        }>;
        alternativeRestaurants: Array<{
          id: string;
          name: string;
          category: string;
          description: string;
          location: {
            name: string;
            coordinates: { lat: number; lng: number };
          };
          estimatedCost: {
            amount: number;
            currency: string;
          };
          rating?: number;
          phone?: string;
          website?: string;
        }>;
      };
      transportation?: any;
    };
    error?: {
      code: string;
      message: string;
    };
  };
}

export const useAIGeneratedItineraries = () => {
  const [itineraries, setItineraries] = useState<AIGeneratedItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIItineraries = async () => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {      
      const q = query(
        collection(db, 'itineraries'),
        where('userId', '==', auth.currentUser.uid),
        where('ai_status', '==', 'completed'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedItineraries: AIGeneratedItinerary[] = [];
      
      console.log('fetchAIItineraries: Found', querySnapshot.size, 'AI-generated itineraries');
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if itinerary has expired based on end date
        const itineraryEndDate = data.endDate || data.response?.data?.itinerary?.endDate;
        
        if (itineraryEndDate) {
          const endDate = new Date(itineraryEndDate);
          const currentDate = new Date();
          
          // Skip expired itineraries (end date has passed)
          if (endDate < currentDate) {
            console.log('fetchAIItineraries: Skipping expired itinerary:', doc.id, 'ended:', itineraryEndDate);
            return;
          }
        }
        
        fetchedItineraries.push({
          id: doc.id,
          ...data
        } as AIGeneratedItinerary);
      });

      console.log('fetchAIItineraries: Final active itineraries count:', fetchedItineraries.length);

      setItineraries(fetchedItineraries);
    } catch (err: any) {
      console.error('Error fetching AI itineraries:', err);
      setError('Failed to load AI generated itineraries: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getItineraryById = async (id: string): Promise<AIGeneratedItinerary | null> => {
    if (!auth.currentUser) return null;

    try {
      const docRef = doc(db, 'itineraries', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as AIGeneratedItinerary;
      }
      return null;
    } catch (err) {
      console.error('Error fetching itinerary by ID:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchAIItineraries();
  }, []);

  return {
    itineraries,
    loading,
    error,
    fetchAIItineraries,
    getItineraryById,
    refreshItineraries: fetchAIItineraries // Alias for refreshing
  };
};

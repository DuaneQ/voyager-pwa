import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../environments/firebaseConfig';
import { PublicAIItineraryView } from '../ai/PublicAIItineraryView';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';
import { Box, Typography, CircularProgress } from '@mui/material';

export const PublicAIItineraryPage: React.FC = () => {
  const { itineraryId } = useParams<{ itineraryId: string }>();
  const [itinerary, setItinerary] = useState<AIGeneratedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItinerary = async () => {
      if (!itineraryId) {
        setError('No itinerary ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching public itinerary:', itineraryId);
        const itineraryDoc = await getDoc(doc(db, 'itineraries', itineraryId));
        
        if (itineraryDoc.exists()) {
          const data = itineraryDoc.data() as AIGeneratedItinerary;
          setItinerary({ ...data, id: itineraryDoc.id });
        } else {
          setError('Itinerary not found');
        }
      } catch (err) {
        console.error('Error fetching itinerary:', err);
        setError('Failed to load itinerary');
      } finally {
        setLoading(false);
      }
    };

    fetchItinerary();
  }, [itineraryId]);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress sx={{ color: 'rgba(33, 150, 243, 0.8)' }} />
        <Typography>Loading itinerary...</Typography>
      </Box>
    );
  }

  if (error || !itinerary) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a',
        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3), transparent 50%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        p: 3
      }}>
        <Typography variant="h4" sx={{ mb: 2, textAlign: 'center' }}>
          🌍 TravalPass
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Itinerary Not Found
        </Typography>
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
          This travel itinerary may have been removed or the link is invalid.
        </Typography>
        <Typography 
          component="a" 
          href="https://travalpass.com" 
          sx={{ 
            color: 'rgba(33, 150, 243, 0.9)', 
            textDecoration: 'none',
            mt: 2,
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
        >
          ← Back to TravalPass
        </Typography>
      </Box>
    );
  }

  return <PublicAIItineraryView itinerary={itinerary} />;
};

export default PublicAIItineraryPage;
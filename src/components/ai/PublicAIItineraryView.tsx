import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
} from '@mui/material';
import {
  ExpandMore,
  AttachMoney,
  Hotel,
  LocalActivity,
  Restaurant,
  FlightTakeoff
} from '@mui/icons-material';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';

interface PublicAIItineraryViewProps {
  itinerary: AIGeneratedItinerary;
}

export const PublicAIItineraryView: React.FC<PublicAIItineraryViewProps> = ({ itinerary }) => {
  const itineraryData = itinerary?.response?.data?.itinerary;
  const costBreakdown = itinerary?.response?.data?.costBreakdown;
  const metadata = itinerary?.response?.data?.metadata;
  const recommendations = itinerary?.response?.data?.recommendations;

  if (!itineraryData) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a',
        color: 'white',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography>Itinerary not found</Typography>
      </Box>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || typeof dateString !== 'string') {
      return 'Date not specified';
    }
    
    const date = dateString.includes('T') 
      ? new Date(dateString)
      : new Date(dateString + 'T12:00:00');
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatPrice = (item: any): string => {
    const amt = item?.pricePerNight?.amount ?? item?.price?.amount ?? item?.priceAmount;
    const cur = item?.pricePerNight?.currency ?? item?.price?.currency ?? 'USD';
    if (typeof amt === 'number') {
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(amt);
      } catch (e) {
        return `${cur} ${amt}`;
      }
    }
    if (item?.price_level || item?.priceLevel) {
      const lvl = item.price_level ?? item.priceLevel;
      return `${'$'.repeat(Math.max(1, Math.min(4, Number(lvl) || 1)))}`;
    }
    return 'Price unknown';
  };

  const formatActivityPrice = (activity: any): string => {
    const amt = activity?.estimatedCost?.amount ?? activity?.price?.amount;
    const cur = activity?.estimatedCost?.currency ?? activity?.price?.currency ?? 'USD';
    if (typeof amt === 'number') {
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(amt);
      } catch (e) {
        return `${cur} ${amt}`;
      }
    }
    const lvl = activity?.price_level ?? activity?.priceLevel ?? activity?.estimatedCost?.price_level;
    if (lvl !== undefined && lvl !== null) {
      const v = Number(lvl) || 1;
      return `${'$'.repeat(Math.max(1, Math.min(4, v)))}`;
    }
    return 'Price TBD';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3), transparent 50%)',
      color: 'white',
      p: { xs: 1, sm: 2, md: 3 }
    }}>
      {/* TravalPass Branding Header */}
      <Box sx={{ 
        textAlign: 'center', 
        mb: 3,
        p: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 'bold',
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
          mb: 1
        }}>
          🌍 TravalPass.com
        </Typography>
        <Typography variant="subtitle1" sx={{ 
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}>
          AI-Generated Travel Itinerary
        </Typography>
      </Box>

      {/* Header Section */}
      <Card sx={{ 
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <CardContent>
          <Typography variant="h4" gutterBottom sx={{ 
            color: 'white',
            fontSize: { xs: '1.5rem', sm: '2rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            {itineraryData.destination}
          </Typography>
          
          <Typography color="rgba(255, 255, 255, 0.7)" gutterBottom sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            {formatDate(itineraryData.startDate)} - {formatDate(itineraryData.endDate)}
          </Typography>

          {itineraryData.description && (
            <Typography variant="body1" paragraph sx={{ 
              mt: 2, 
              fontStyle: 'italic', 
              color: 'white',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}>
              "{itineraryData.description}"
            </Typography>
          )}
          
          {metadata && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              {metadata.confidence && (
                <Chip 
                  label={`Confidence: ${Math.round(metadata.confidence * 100)}%`} 
                  size="small" 
                  color="primary" 
                />
              )}
              {metadata.aiModel && (
                <Chip 
                  label={`${metadata.aiModel}`} 
                  size="small" 
                  variant="outlined" 
                />
              )}
              {metadata.processingTime && (
                <Chip 
                  label={`Generated in ${Math.round(metadata.processingTime / 1000)}s`} 
                  size="small" 
                  variant="outlined" 
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {costBreakdown && costBreakdown.total && (
        <Accordion sx={{ 
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ color: 'white', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Cost Breakdown - ${costBreakdown.total.toFixed(2)} Total
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Total Cost
                </Typography>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  ${costBreakdown.total.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Per Person
                </Typography>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  ${costBreakdown.perPerson?.toFixed(2) || '0.00'}
                </Typography>
              </Grid>
            </Grid>
            
            {costBreakdown.byCategory && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(costBreakdown.byCategory).map(([category, amount]) => (
                  <Chip
                    key={category}
                    label={`${category}: $${(amount as number).toFixed(0)}`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: 'white'
                    }}
                  />
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Flights */}
      {recommendations?.flights && Array.isArray(recommendations.flights) && recommendations.flights.length > 0 && (
        <Accordion sx={{ 
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightTakeoff sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ color: 'white', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Flight Options ({recommendations.flights.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recommendations.flights.slice(0, 5).map((flight: any, index: number) => (
                <Card key={index} variant="outlined" sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {flight.airline || 'Airline'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {flight.flightNumber || 'Flight'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {flight.route || `${flight.departure?.airport || 'DEP'} → ${flight.arrival?.airport || 'ARR'}`}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Duration: {flight.duration || 'N/A'} • Stops: {flight.stops || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="h6" sx={{ color: 'white', textAlign: { xs: 'left', sm: 'right' } }}>
                          {flight.price?.amount ? `$${flight.price.amount}` : 'Price TBD'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Accommodations */}
      {recommendations?.accommodations && Array.isArray(recommendations.accommodations) && recommendations.accommodations.length > 0 && (
        <Accordion sx={{
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Hotel sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ color: 'white', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Hotels ({recommendations.accommodations.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {recommendations.accommodations.slice(0, 6).map((accommodation: any, index: number) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined" sx={{
                    height: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                      <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                        {accommodation.name || 'Hotel'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                        {accommodation.type || 'Hotel'} • ⭐ {accommodation.rating || 'N/A'}
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {formatPrice(accommodation)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Daily Itinerary */}
      <Typography variant="h6" gutterBottom sx={{ color: 'white', fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
        Daily Itinerary
      </Typography>
      
      {(() => {
        const dailyData = itineraryData?.days || itineraryData?.dailyPlans;
        
        if (dailyData && Array.isArray(dailyData) && dailyData.length > 0) {
          return dailyData.map((day: any, index: number) => (
            <Accordion key={index} defaultExpanded={index === 0} sx={{
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:before': { display: 'none' }
            }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                    Day {index + 1} - {formatDate(day.date)}
                  </Typography>
                  <Chip 
                    label={`${(day.activities?.length || 0) + (day.meals?.length || 0)} items`} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: 'white'
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Activities */}
                  {day.activities && Array.isArray(day.activities) && day.activities.map((activity: any, actIndex: number) => (
                    <Card key={`activity-${actIndex}`} variant="outlined" sx={{
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      border: '1px solid rgba(33, 150, 243, 0.3)'
                    }}>
                      <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocalActivity sx={{ color: 'rgba(33, 150, 243, 0.8)' }} />
                          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {activity.name || 'Activity'}
                          </Typography>
                          <Chip 
                            label={formatActivityPrice(activity)}
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              borderColor: 'rgba(33, 150, 243, 0.5)',
                              color: 'white',
                              ml: 'auto'
                            }}
                          />
                        </Box>
                        {activity.description && (
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
                            {activity.description}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {activity.timing?.startTime || activity.startTime} - {activity.timing?.endTime || activity.endTime}
                          {activity.location?.name && ` • ${activity.location.name}`}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Meals */}
                  {day.meals && Array.isArray(day.meals) && day.meals.map((meal: any, mealIndex: number) => (
                    <Card key={`meal-${mealIndex}`} variant="outlined" sx={{
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)'
                    }}>
                      <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Restaurant sx={{ color: 'rgba(76, 175, 80, 0.8)' }} />
                          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {meal.restaurant?.name || meal.name || 'Restaurant'}
                          </Typography>
                          <Chip 
                            label={meal.type?.charAt(0).toUpperCase() + meal.type?.slice(1) || 'Meal'}
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              borderColor: 'rgba(76, 175, 80, 0.5)',
                              color: 'white',
                              ml: 'auto'
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {meal.timing?.time || meal.time}
                          {meal.restaurant?.cuisine && ` • ${meal.restaurant.cuisine} Cuisine`}
                          {meal.restaurant?.priceRange && ` • ${meal.restaurant.priceRange}`}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ));
        } else {
          return (
            <Card sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <CardContent>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No daily itinerary data available
                </Typography>
              </CardContent>
            </Card>
          );
        }
      })()}

      {/* TravalPass Footer */}
      <Box sx={{ 
        textAlign: 'center', 
        mt: 4, 
        p: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="h6" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          ✨ Create Your Own AI Travel Itinerary
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
          Get personalized travel recommendations powered by AI
        </Typography>
        <Typography variant="h5" sx={{ 
          fontWeight: 'bold',
          color: 'rgba(33, 150, 243, 0.9)',
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}>
          🌍 TravalPass.com
        </Typography>
      </Box>
    </Box>
  );
};

export default PublicAIItineraryView;
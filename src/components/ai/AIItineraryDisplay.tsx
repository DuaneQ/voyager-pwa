import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
  AccessTime, 
  LocationOn, 
  AttachMoney, 
  Hotel, 
  DirectionsCar, 
  LocalActivity,
  Star,
  TrendingUp,
  TrendingDown,
  Flight,
  Phone,
  Language,
  Restaurant,
} from '@mui/icons-material';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';

interface AIItineraryDisplayProps {
  itinerary: AIGeneratedItinerary;
}

export const AIItineraryDisplay: React.FC<AIItineraryDisplayProps> = ({ itinerary }) => {
  const itineraryData = itinerary.response?.data?.itinerary;
  const costBreakdown = itinerary.response?.data?.costBreakdown;
  const metadata = itinerary.response?.data?.metadata;
  const recommendations = itinerary.response?.data?.recommendations;

  if (!itineraryData) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            No itinerary data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Box sx={{ color: 'white' }}>
      {/* Header */}
      <Card sx={{ 
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
            {itineraryData.destination}
          </Typography>
          <Typography color="rgba(255, 255, 255, 0.7)" gutterBottom>
            {formatDate(itineraryData.startDate)} - {formatDate(itineraryData.endDate)}
          </Typography>

          {/* AI-Generated Description */}
          {itineraryData.description && (
            <Typography variant="body1" paragraph sx={{ mt: 2, fontStyle: 'italic', color: 'white' }}>
              "{itineraryData.description}"
            </Typography>
          )}
          
          {/* Metadata */}
          {metadata && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Confidence: ${Math.round(metadata.confidence * 100)}%`} 
                size="small" 
                color="primary" 
              />
              <Chip 
                label={`${metadata.aiModel}`} 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                label={`Generated in ${Math.round(metadata.processingTime / 1000)}s`} 
                size="small" 
                variant="outlined" 
              />
            </Box>
          )}


        </CardContent>
      </Card>

      {/* Cost Breakdown Accordion */}
      {costBreakdown && (
        <Accordion sx={{ 
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ color: 'white' }}>
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
                  ${costBreakdown.perPerson.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
            
            {/* Category Breakdown */}
            {costBreakdown.byCategory && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
                  By Category
                </Typography>
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
              </Box>
            )}

            {/* Daily Cost Breakdown */}
            {costBreakdown.byDay && costBreakdown.byDay.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
                  Daily Cost Breakdown
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {costBreakdown.byDay.map((dayCost, index) => (
                    <Card key={index} variant="outlined" sx={{ 
                      p: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                          Day {dayCost.day} ({new Date(dayCost.date).toLocaleDateString()})
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          ${dayCost.total.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {dayCost.accommodation > 0 && (
                          <Chip label={`🏨 Accommodation: $${dayCost.accommodation.toFixed(0)}`} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                        )}
                        {dayCost.food > 0 && (
                          <Chip label={`🍽️ Food: $${dayCost.food.toFixed(0)}`} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                        )}
                        {dayCost.activities > 0 && (
                          <Chip label={`🎯 Activities: $${dayCost.activities.toFixed(0)}`} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                        )}
                        {dayCost.transportation > 0 && (
                          <Chip label={`🚗 Transport: $${dayCost.transportation.toFixed(0)}`} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                        )}
                        {dayCost.misc > 0 && (
                          <Chip label={`💼 Miscellaneous: $${dayCost.misc.toFixed(0)}`} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                        )}
                      </Box>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Flight Prices Section */}
      {recommendations?.flights && recommendations.flights.length > 0 && (
        <Accordion sx={{ 
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>✈️ Flight Options</Typography>
              <Chip 
                label={`${recommendations.flights.length} options`} 
                size="small" 
                color="primary" 
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
              {recommendations.flights.map((flight: any, index: number) => (
                <Card key={flight.id || index} variant="outlined" sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                          {flight.airline} {flight.flightNumber}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {flight.route}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary">
                          ${flight.price.amount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {flight.class}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      <Chip icon={<AccessTime sx={{ color: 'white' }} />} 
                            label={flight.duration} 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                      <Chip label={flight.departureTime} 
                            size="small" 
                            variant="outlined"
                            sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }} />
                      {flight.stops === 0 ? (
                        <Chip label="Direct" 
                              size="small" 
                              sx={{ backgroundColor: 'rgba(76, 175, 80, 0.3)', color: 'white' }} />
                      ) : (
                        <Chip label={`${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} 
                              size="small" 
                              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Accommodation Recommendations - Moved from AI Recommendations section */}
      {recommendations?.accommodations && recommendations.accommodations.length > 0 && (
        <Accordion sx={{
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Hotel sx={{ color: 'white' }} />
              <Typography variant="h6" sx={{ color: 'white' }}>
                Accommodation Recommendations ({recommendations.accommodations.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {recommendations.accommodations.map((accommodation) => (
                <Grid item xs={12} sm={6} key={accommodation.id}>
                  <Card variant="outlined" sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                          {accommodation.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Star sx={{ color: '#FFD700', fontSize: 16 }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {accommodation.rating}
                          </Typography>
                        </Box>
                      </Box>

                      <Chip 
                        label={accommodation.type} 
                        size="small" 
                        sx={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          mb: 1
                        }}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {accommodation.location.name}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                        <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          ${accommodation.pricePerNight.amount}/night
                        </Typography>
                      </Box>

                      {/* Amenities */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'white' }}>Amenities:</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {accommodation.amenities && accommodation.amenities.slice(0, 3).map((amenity, idx) => (
                            <Chip 
                              key={idx} 
                              label={amenity} 
                              size="small" 
                              sx={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                                color: 'white' 
                              }} 
                            />
                          ))}
                          {accommodation.amenities && accommodation.amenities.length > 3 && (
                            <Chip 
                              label={`+${accommodation.amenities.length - 3} more`} 
                              size="small" 
                              variant="outlined" 
                              sx={{ 
                                borderColor: 'rgba(255, 255, 255, 0.3)', 
                                color: 'white' 
                              }} 
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Pros and Cons */}
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#81C784' }}>
                            <TrendingUp sx={{ fontSize: 16 }} /> Pros
                          </Typography>
                          {accommodation.pros && accommodation.pros.slice(0, 2).map((pro, idx) => (
                            <Typography key={idx} variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              • {pro}
                            </Typography>
                          ))}
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#FFB74D' }}>
                            <TrendingDown sx={{ fontSize: 16 }} /> Cons
                          </Typography>
                          {accommodation.cons && accommodation.cons.slice(0, 2).map((con, idx) => (
                            <Typography key={idx} variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              • {con}
                            </Typography>
                          ))}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Hotel Recommendations Section */}
      {itineraryData.externalData?.hotelRecommendations && itineraryData.externalData.hotelRecommendations.length > 0 && (
        <Accordion sx={{ 
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>🏨 Hotel Recommendations</Typography>
              <Chip 
                label={`${itineraryData.externalData.hotelRecommendations.length} hotels`} 
                size="small" 
                color="primary" 
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
              {itineraryData.externalData.hotelRecommendations.map((hotel: any, index: number) => (
                <Card key={hotel.id || index} variant="outlined" sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                          {hotel.name}
                        </Typography>
                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                          <LocationOn fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                          {hotel.address}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary">
                          ${hotel.pricePerNight}/night
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Star fontSize="small" sx={{ color: '#FFD700' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {hotel.rating} ({hotel.reviewCount} reviews)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {hotel.amenities && hotel.amenities.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {hotel.amenities.slice(0, 4).map((amenity: string, amenityIndex: number) => (
                          <Chip key={amenityIndex} 
                                label={amenity} 
                                size="small" 
                                variant="outlined"
                                sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }} />
                        ))}
                        {hotel.amenities.length > 4 && (
                          <Chip label={`+${hotel.amenities.length - 4} more`} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Daily Itinerary */}
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Daily Itinerary
      </Typography>
      
      {/* Check for both days and dailyPlans data structures */}
      {(() => {
        const dailyData = itineraryData.days || itineraryData.dailyPlans;
        
        if (dailyData && dailyData.length > 0) {
          return dailyData.map((day: any, index: number) => (
            <Accordion key={index} defaultExpanded={index === 0} sx={{
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:before': { display: 'none' }
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Day {day.day || (index + 1)}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {formatDate(day.date)}
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
                  {/* Display Activities */}
                  {day.activities && day.activities.map((activity: any, activityIndex: number) => (
                    <Card key={activity.id || `activity-${activityIndex}`} variant="outlined" sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                            {activity.name}
                          </Typography>
                          <Chip 
                            label={activity.category} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ 
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                              color: 'white'
                            }}
                          />
                        </Box>
                        
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }} paragraph>
                          {activity.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          {activity.timing && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {activity.timing.startTime} - {activity.timing.endTime}
                              </Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {activity.location?.name || activity.location || 'Location not specified'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              ${activity.cost?.amount?.toFixed(2) || activity.estimatedCost?.amount?.toFixed(2) || '0.00'} {activity.cost?.currency || activity.estimatedCost?.currency || 'USD'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Display tips if available */}
                        {activity.tips && activity.tips.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'white' }}>Tips:</Typography>
                            {activity.tips.map((tip: string, tipIndex: number) => (
                              <Typography key={tipIndex} variant="caption" display="block" sx={{ ml: 1, mb: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                                • {tip}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Display Meals */}
                  {day.meals && day.meals.map((meal: any, mealIndex: number) => (
                    <Card key={meal.id || `meal-${mealIndex}`} variant="outlined" sx={{ 
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                            🍽️ {meal.name}
                          </Typography>
                          <Chip 
                            label={meal.type || 'meal'} 
                            size="small" 
                            sx={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              color: 'white'
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {meal.timing?.time}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {meal.restaurant?.name || 'Restaurant not specified'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              ${meal.cost?.amount?.toFixed(2) || '0.00'} {meal.cost?.currency || 'USD'}
                            </Typography>
                          </Box>

                          {meal.restaurant?.rating && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Star sx={{ color: '#FFD700', fontSize: 16 }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {meal.restaurant.rating}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {meal.restaurant?.cuisine && (
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                            Cuisine: {meal.restaurant.cuisine}
                          </Typography>
                        )}

                        {/* Booking Information */}
                        {(meal.restaurant?.phone || meal.restaurant?.website || meal.restaurant?.bookingUrl || meal.bookingInfo) && (
                          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {(meal.restaurant?.phone || meal.bookingInfo?.phone) && (
                              <Button
                                size="small"
                                startIcon={<Phone />}
                                href={`tel:${meal.restaurant?.phone || meal.bookingInfo?.phone}`}
                                sx={{ color: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                                variant="outlined"
                              >
                                Call
                              </Button>
                            )}
                            {(meal.restaurant?.website || meal.bookingInfo?.website) && (
                              <Button
                                size="small"
                                startIcon={<Language />}
                                href={meal.restaurant?.website || meal.bookingInfo?.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                                variant="outlined"
                              >
                                Website
                              </Button>
                            )}
                            {(meal.restaurant?.bookingUrl || meal.bookingInfo?.reservationUrl) && (
                              <Button
                                size="small"
                                startIcon={<Restaurant />}
                                href={meal.restaurant?.bookingUrl || meal.bookingInfo?.reservationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ 
                                  color: 'rgba(255, 255, 255, 0.9)', 
                                  borderColor: 'rgba(76, 175, 80, 0.5)',
                                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                  }
                                }}
                                variant="outlined"
                              >
                                Make Reservation
                              </Button>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Display Transportation */}
                  {day.transportation && day.transportation.map((transport: any, transportIndex: number) => (
                    <Card key={transport.id || `transport-${transportIndex}`} variant="outlined" sx={{ 
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      border: '1px solid rgba(33, 150, 243, 0.3)'
                    }}>
                      <CardContent>
                        <Typography variant="h6" component="h3" sx={{ mb: 1, color: 'white' }}>
                          🚗 {transport.mode} - {transport.from?.name} to {transport.to?.name}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {transport.duration} min
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              ${transport.cost?.amount?.toFixed(2) || '0.00'} {transport.cost?.currency || 'USD'}
                            </Typography>
                          </Box>
                        </Box>

                        {transport.notes && (
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                            Note: {transport.notes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Display day notes if available */}
                  {day.notes && (
                    <Card variant="outlined" sx={{ 
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)'
                    }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'white' }}>📝 Day Notes:</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {day.notes}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ));
        } else {
          return (
            <Card sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
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

      {/* Recommendations Section */}
      {recommendations && (
        <Box sx={{ mt: 3 }}>

          {/* Transportation Recommendations */}
          {recommendations.transportation && recommendations.transportation.length > 0 && (
            <Accordion sx={{
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:before': { display: 'none' }
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DirectionsCar sx={{ color: 'white' }} />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Transportation Options ({recommendations.transportation.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {recommendations.transportation.map((transport, idx) => (
                    <Grid item xs={12} sm={6} key={idx}>
                      <Card variant="outlined" sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" component="h3" gutterBottom sx={{ color: 'white' }}>
                            {transport.mode} - {transport.provider}
                          </Typography>

                          <Box sx={{ display: 'flex', justify: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                ${transport.estimatedCost?.amount?.toFixed(2) || '0.00'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {transport.duration}
                              </Typography>
                            </Box>
                          </Box>

                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#81C784' }}>
                                <TrendingUp sx={{ fontSize: 16 }} /> Pros
                              </Typography>
                              {transport.pros && transport.pros.slice(0, 2).map((pro, idx) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  • {pro}
                                </Typography>
                              ))}
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#FFB74D' }}>
                                <TrendingDown sx={{ fontSize: 16 }} /> Cons
                              </Typography>
                              {transport.cons && transport.cons.slice(0, 2).map((con, idx) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  • {con}
                                </Typography>
                              ))}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Alternative Activities */}
          {recommendations.alternativeActivities && recommendations.alternativeActivities.length > 0 && (
            <Accordion sx={{
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:before': { display: 'none' }
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalActivity sx={{ color: 'white' }} />
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    Alternative Activities ({recommendations.alternativeActivities.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {recommendations.alternativeActivities.map((activity) => (
                    <Grid item xs={12} sm={6} key={activity.id}>
                      <Card variant="outlined" sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                              {activity.name}
                            </Typography>
                            <Chip 
                              label={activity.category} 
                              size="small" 
                              sx={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                                color: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.3)'
                              }}
                              variant="outlined" 
                            />
                          </Box>

                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} paragraph>
                            {activity.description}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {activity.location?.name || 'Location not specified'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                ${activity.estimatedCost?.amount?.toFixed(2) || '0.00'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {activity.duration ? Math.round(activity.duration / 60) : 0}h
                              </Typography>
                            </Box>
                            {activity.rating && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Star sx={{ color: '#FFD700', fontSize: 16 }} />
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                  {activity.rating}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AIItineraryDisplay;

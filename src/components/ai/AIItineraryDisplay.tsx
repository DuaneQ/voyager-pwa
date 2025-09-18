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
  Phone,
  Link,
  Language,
  Restaurant,
  Book,
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
    // Handle both date-only strings (YYYY-MM-DD) and full datetime strings
    const date = dateString.includes('T') 
      ? new Date(dateString)
      : new Date(dateString + 'T12:00:00'); // Add noon time to avoid timezone issues
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Use UTC to prevent timezone shifting for date-only values
    });
  };

  const formatFlightDateTime = (dateString: string, timeString: string) => {
    if (!dateString || !timeString) return 'Time TBD';
    
    try {
      // Handle different date formats
      let formattedDate = dateString;
      if (dateString.length === 10 && !dateString.includes('T')) {
        // YYYY-MM-DD format
        formattedDate = dateString;
      }
      
      // Handle different time formats
      let formattedTime = timeString;
      if (timeString.length === 5 && timeString.includes(':')) {
        // HH:MM format, add seconds
        formattedTime = timeString + ':00';
      } else if (timeString.length === 4 && !timeString.includes(':')) {
        // HHMM format, convert to HH:MM:SS
        formattedTime = timeString.substring(0, 2) + ':' + timeString.substring(2) + ':00';
      }
      
      // Create the datetime string
      const dateTimeString = `${formattedDate}T${formattedTime}`;
      const date = new Date(dateTimeString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' • ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting flight datetime:', error, { dateString, timeString });
      return 'Invalid Date';
    }
  };

  // Helpers for rendering hotel cards
  const PLACEHOLDER_IMAGE = '/DEFAULT_AVATAR.png';

  const getImageUrl = (item: any): string => {
    // Try common fields in order of likelihood
    if (!item) return PLACEHOLDER_IMAGE;
    if (Array.isArray(item.photos) && item.photos.length > 0) {
      // accommodations may already contain full URLs
      const first = item.photos[0];
      if (typeof first === 'string') {
        // Accept relative (local) or absolute URLs
        if (first.startsWith('http') || first.startsWith('/')) return first;
        return PLACEHOLDER_IMAGE;
      }
      if (first.photo_reference) {
        // We don't expose the Places API key to the client here; return placeholder.
        return PLACEHOLDER_IMAGE;
      }
    }
    // vendorRaw may contain provider photos (for externalData entries)
    if (item.vendorRaw && Array.isArray(item.vendorRaw.photos) && item.vendorRaw.photos.length > 0) {
      const p = item.vendorRaw.photos[0];
      if (p.photo_reference) {
        // prefer a proxy if you add one; otherwise use placeholder to avoid broken backgrounds
        return PLACEHOLDER_IMAGE;
      }
    }
    // fallback
    return PLACEHOLDER_IMAGE;
  };

  const formatPrice = (item: any): string => {
    // accommodation shape may include pricePerNight { amount, currency } or price { amount }
    const amt = item?.pricePerNight?.amount ?? item?.price?.amount ?? item?.priceAmount;
    const cur = item?.pricePerNight?.currency ?? item?.price?.currency ?? 'USD';
    if (typeof amt === 'number') {
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(amt);
      } catch (e) {
        return `${cur} ${amt}`;
      }
    }
    // If provider only has a coarse price level, show that
    if (item?.price_level || item?.priceLevel) {
      const lvl = item.price_level ?? item.priceLevel;
      return `${'$'.repeat(Math.max(1, Math.min(4, Number(lvl) || 1)))}`;
    }
    return 'Price unknown';
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
            {costBreakdown.byDay && Array.isArray(costBreakdown.byDay) && costBreakdown.byDay.length > 0 && (
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

      {/* Flight Prices Section - Support both legacy and new flight data structures */}
      {((recommendations?.flights && Array.isArray(recommendations.flights) && recommendations.flights.length > 0) || 
        ((itineraryData as any)?.flights && Array.isArray((itineraryData as any).flights) && (itineraryData as any).flights.length > 0)) && (
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
                label={`${(recommendations?.flights || (itineraryData as any)?.flights || []).length} options`} 
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
              {(recommendations?.flights || (itineraryData as any)?.flights || []).filter((flight: any) => flight).map((flight: any, index: number) => (
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
                        {flight.departure && flight.departure.date && flight.departure.time && (
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5 }}>
                            Departure: {formatFlightDateTime(flight.departure.date, flight.departure.time)}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          ${flight.price?.amount || 'Price TBD'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {flight.cabin || flight.class}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      <Chip icon={<AccessTime sx={{ color: 'white' }} />} 
                            label={flight.duration} 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                      <Chip label={flight.departureTime || flight.departure?.time} 
                            size="small" 
                            variant="outlined"
                            sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }} />
                      {flight.stops === 0 ? (
                        <Chip label="Direct" 
                              size="small" 
                              sx={{ backgroundColor: 'rgba(76, 175, 80, 0.3)', color: 'white' }} />
                      ) : (
                        <Chip label={flight.stops === undefined ? "undefined stop" : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} 
                              size="small" 
                              sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                      )}
                      {flight.tripType && (
                        <Chip label={flight.tripType} 
                              size="small" 
                              sx={{ backgroundColor: 'rgba(156, 39, 176, 0.3)', color: 'white' }} />
                      )}
                    </Box>

                    {/* Return flight info for round-trip */}
                    {flight.return && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
                          Return Flight
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                              {flight.return.airline || flight.airline} {flight.return.flightNumber || flight.flightNumber}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {flight.return.route || `${flight.return.departure?.iata || ''} → ${flight.return.arrival?.iata || ''}`}
                            </Typography>
                            {flight.return.departure && flight.return.departure.date && flight.return.departure.time && (
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5 }}>
                                Departure: {formatFlightDateTime(flight.return.departure.date, flight.return.departure.time)}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" sx={{ color: 'white' }}>
                              ${flight.price?.amount || 'Price TBD'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {flight.cabin || flight.class}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          <Chip icon={<AccessTime sx={{ color: 'white' }} />} 
                                label={flight.return.duration || 'Duration TBD'} 
                                size="small" 
                                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                          <Chip label={flight.return.departure?.time || 'Time TBD'} 
                                size="small" 
                                variant="outlined"
                                sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }} />
                          {flight.return.stops === 0 ? (
                            <Chip label="Direct" 
                                  size="small" 
                                  sx={{ backgroundColor: 'rgba(76, 175, 80, 0.3)', color: 'white' }} />
                          ) : flight.return.stops === undefined ? (
                            <Chip label="TBD stops" 
                                  size="small" 
                                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                          ) : (
                            <Chip label={`${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''}`} 
                                  size="small" 
                                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                          )}
                        </Box>
                      </Box>
                    )}

                  </CardContent>
                </Card>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Accommodation Recommendations - Moved from AI Recommendations section */}
      {recommendations?.accommodations && Array.isArray(recommendations.accommodations) && recommendations.accommodations.length > 0 && (
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
              {recommendations.accommodations.filter(accommodation => accommodation).map((accommodation, accommodationIndex) => {
                const acc: any = accommodation;
                const img = getImageUrl(acc);
                const hotelName = acc.name || acc.vendorRaw?.name || (acc.location && acc.location.name) || 'Unknown Hotel';
                const priceLabel = formatPrice(acc);
                // Determine booking/website link
                const bookingLink = acc.bookingUrl || acc.website || acc.vendorRaw?.website || (acc.placeId ? `https://www.google.com/maps/place/?q=place_id:${acc.placeId}` : null);

                return (
                  <Grid item xs={12} md={6} key={acc.placeId || acc.id || accommodationIndex}>
                    <Card
                      sx={{
                        position: 'relative',
                        borderRadius: 2,
                        overflow: 'hidden',
                        // Increase card height (keep visual balance) using padding-top trick (3:2)
                        width: '100%',
                        '&:before': {
                          content: "''",
                          display: 'block',
                          paddingTop: '95%' // further increased to ensure title is not clipped
                        },
                        backgroundColor: '#111',
                      }}
                    >
                      <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />

                      {/* Overlay content anchored at bottom */}
                      <Box sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pt: 3,
                        pb: 3,
                        px: 2,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.08))',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                      }}>
                        <Typography
                          variant="h6"
                          sx={{
                            color: 'white',
                            fontWeight: 900,
                            fontSize: '1.22rem',
                            lineHeight: 1.08,
                            whiteSpace: 'normal',
                            overflowWrap: 'break-word',
                            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                            // clamp to 2 lines to prevent overflow and clipping
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            mt: 1,
                            mb: 0.25,
                            transform: 'translateY(4px)'
                          }}
                        >
                          {hotelName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{acc.address || acc.formatted_address || (acc.location && acc.location.address)}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                          <Chip label={`⭐ ${acc.rating ?? acc.starRating ?? 'N/A'}`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                          <Chip label={`${acc.userRatingsTotal ?? acc.user_ratings_total ?? 0} reviews`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                          <Chip label={priceLabel} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                          {bookingLink && (
                            <Button size="small" variant="contained" href={bookingLink} target="_blank" rel="noopener noreferrer" sx={{ ml: 'auto', backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}>
                              Book
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

  {/* NOTE: Removed duplicate 'Hotel Recommendations' accordion to avoid showing identical data twice. */}

      {/* Daily Itinerary */}
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Daily Itinerary
      </Typography>
      
      {/* Check for both days and dailyPlans data structures */}
      {(() => {
        const dailyData = itineraryData.days || itineraryData.dailyPlans;
        
        if (dailyData && Array.isArray(dailyData) && dailyData.length > 0) {
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
                  {day.activities && Array.isArray(day.activities) && day.activities.filter((activity: any) => activity).map((activity: any, activityIndex: number) => (
                    <Card key={`day-${index}-activity-${activityIndex}-${activity.id || activityIndex}`} variant="outlined" sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                            {activity.name || 'Activity'}
                          </Typography>
                          <Chip 
                            label={activity.category || 'Activity'} 
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
                          {activity.description || 'No description available'}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          {activity.timing && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {activity.timing.startTime || activity.startTime || 'Time'} - {activity.timing.endTime || activity.endTime || 'TBD'}
                              </Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {typeof activity.location === 'string' 
                                ? activity.location 
                                : (activity.location as any)?.name || 'Location not specified'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              Price TBD
                            </Typography>
                          </Box>
                        </Box>

                        {/* Website and booking links */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {activity.website && (
                            <Button
                              href={activity.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              startIcon={<Link sx={{ fontSize: 16 }} />}
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.5)'
                                }
                              }}
                            >
                              Visit Website
                            </Button>
                          )}
                          
                          {activity.bookingUrl && (
                            <Button
                              href={activity.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              startIcon={<Book sx={{ fontSize: 16 }} />}
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(33, 150, 243, 0.5)',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                  border: '1px solid rgba(33, 150, 243, 0.7)'
                                }
                              }}
                            >
                              Book Now
                            </Button>
                          )}
                        </Box>

                        {/* Display tips if available */}
                        {activity.tips && Array.isArray(activity.tips) && activity.tips.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'white' }}>Tips:</Typography>
                            {activity.tips.map((tip: string, tipIndex: number) => (
                              <Typography key={`day-${index}-activity-${activityIndex}-tip-${tipIndex}`} variant="caption" display="block" sx={{ ml: 1, mb: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                                • {tip}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Display Meals */}
                  {day.meals && Array.isArray(day.meals) && day.meals.filter((meal: any) => meal).map((meal: any, mealIndex: number) => (
                    <Card key={`day-${index}-meal-${mealIndex}-${meal.id || mealIndex}`} variant="outlined" sx={{ 
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                      border: '1px solid rgba(255, 193, 7, 0.3)'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                            🍽️ {meal.name || 'Meal'}
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
                              {meal.timing?.time || meal.time || 'Time TBD'}
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
                              ${meal.cost?.amount?.toFixed(2) || 'Price TBD'} {meal.cost?.currency || ''}
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
                  {day.transportation && Array.isArray(day.transportation) && day.transportation.filter((transport: any) => transport).map((transport: any, transportIndex: number) => (
                    <Card key={`day-${index}-transport-${transportIndex}-${transport.id || transportIndex}`} variant="outlined" sx={{ 
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
                              ${transport.cost?.amount?.toFixed(2) || 'Price TBD'} {transport.cost?.currency || ''}
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

          {/* Alternative Activities */}
          {recommendations.alternativeActivities && Array.isArray(recommendations.alternativeActivities) && recommendations.alternativeActivities.length > 0 && (
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
                  {recommendations.alternativeActivities.filter((activity: any) => activity).map((activity, activityIndex) => (
                    <Grid item xs={12} sm={6} key={`alt-activity-${activityIndex}-${activity.id || activityIndex}`}>
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
                                {typeof activity.location === 'string' 
                                  ? activity.location 
                                  : (activity.location as any)?.name || 'Location not specified'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Price TBD
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

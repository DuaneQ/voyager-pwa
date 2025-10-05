import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography, Grid, Card, CardContent, Chip, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Restaurant, LocationOn, AttachMoney, Star, Phone, Language } from '@mui/icons-material';

interface Props {
  restaurants: any[];
}

const AlternativeRestaurantsSection: React.FC<Props> = ({ restaurants }) => {
  if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) return null;

  return (
    <Accordion sx={{
      mb: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      '&:before': { display: 'none' }
    }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} /> }>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Restaurant sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white' }}>
            Alternative Restaurants ({restaurants.length})
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {restaurants.filter((restaurant: any) => restaurant).map((restaurant: any, restaurantIndex: number) => (
            <Grid item xs={12} sm={6} key={`alt-restaurant-${restaurantIndex}-${restaurant.id || restaurantIndex}`}>
              <Card variant="outlined" sx={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ color: 'white' }}>{restaurant.name}</Typography>
                    <Chip label={restaurant.category || 'restaurant'} size="small" sx={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', color: 'white', borderColor: 'rgba(255, 193, 7, 0.5)' }} variant="outlined" />
                  </Box>

                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} paragraph>{restaurant.description}</Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{typeof restaurant.location === 'string' ? restaurant.location : (restaurant.location as any)?.name || 'Location not specified'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {(() => {
                            if (restaurant.estimatedCost && (restaurant.estimatedCost.amount !== undefined && restaurant.estimatedCost.amount !== null)) {
                              return `${restaurant.estimatedCost.amount} ${restaurant.estimatedCost.currency || 'USD'}`;
                            }
                            const lvl = restaurant.estimatedCost?.price_level ?? restaurant.price_level ?? restaurant.priceLevel;
                            if (lvl !== undefined && lvl !== null) {
                              const v = Number(lvl) || 1;
                              return '$'.repeat(Math.max(1, Math.min(4, v)));
                            }
                            if (restaurant.price) return String(restaurant.price);
                            return 'Price TBD';
                          })()}
                        </Typography>
                    </Box>
                    {restaurant.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star sx={{ color: '#FFD700', fontSize: 16 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{restaurant.rating}</Typography>
                      </Box>
                    )}
                    {(restaurant.phone || restaurant.website) && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, width: '100%' }}>
                        {restaurant.phone && (
                          <Button size="small" startIcon={<Phone />} href={`tel:${restaurant.phone}`} sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Call</Button>
                        )}
                        {restaurant.website && (
                          <Button size="small" startIcon={<Language />} href={restaurant.website} target="_blank" rel="noopener noreferrer" sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Website</Button>
                        )}
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
  );
};

export default AlternativeRestaurantsSection;

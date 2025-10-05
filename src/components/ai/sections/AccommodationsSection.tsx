import React from 'react';
import { Box, Typography, Card, Grid, CardContent, Chip, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Hotel, CheckCircle } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface AccommodationsSectionProps {
  accommodations: any[];
  isEditing: boolean;
  selectedAccommodations: Set<number>;
  onToggleAccommodationSelection: (index: number) => void;
}

const PLACEHOLDER_IMAGE = '/DEFAULT_AVATAR.png';

const getImageUrl = (item: any): string => {
  if (!item) return PLACEHOLDER_IMAGE;
  if (Array.isArray(item.photos) && item.photos.length > 0) {
    const first = item.photos[0];
    if (typeof first === 'string') {
      if (first.startsWith('http') || first.startsWith('/')) return first;
      return PLACEHOLDER_IMAGE;
    }
    if (first.photo_reference) return PLACEHOLDER_IMAGE;
  }
  if (item.vendorRaw && Array.isArray(item.vendorRaw.photos) && item.vendorRaw.photos.length > 0) {
    const p = item.vendorRaw.photos[0];
    if (p.photo_reference) return PLACEHOLDER_IMAGE;
  }
  return PLACEHOLDER_IMAGE;
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
  return '';
};

const AccommodationsSection: React.FC<AccommodationsSectionProps> = ({ accommodations, isEditing, selectedAccommodations, onToggleAccommodationSelection }) => {
  if (!accommodations || !Array.isArray(accommodations) || accommodations.length === 0) return null;

  return (
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
            Accommodation Recommendations ({accommodations.length})
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {accommodations.filter((ac: any) => ac).map((accommodation: any, accommodationIndex: number) => {
            const acc: any = accommodation;
            const img = getImageUrl(acc);
            const hotelName = acc.name || acc.vendorRaw?.name || (acc.location && acc.location.name) || 'Unknown Hotel';
            const priceLabel = formatPrice(acc);
            const bookingLink = acc.bookingUrl || acc.website || acc.vendorRaw?.website || (acc.placeId ? `https://www.google.com/maps/place/?q=place_id:${acc.placeId}` : null);

            return (
              <Grid item xs={12} md={6} key={acc.placeId || acc.id || accommodationIndex}>
                <Card
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    width: '100%',
                    '&:before': {
                      content: "''",
                      display: 'block',
                      paddingTop: '95%'
                    },
                    backgroundColor: selectedAccommodations.has(accommodationIndex) ? 'rgba(244, 67, 54, 0.2)' : '#111',
                    border: selectedAccommodations.has(accommodationIndex) ? '3px solid #f44336' : 'none',
                    cursor: isEditing ? 'pointer' : 'default'
                  }}
                  onClick={isEditing ? () => onToggleAccommodationSelection(accommodationIndex) : undefined}
                >
                  <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />

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
                      {priceLabel ? <Chip label={priceLabel} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }} /> : null}
                      {bookingLink && (
                        <Button size="small" variant="contained" href={bookingLink} target="_blank" rel="noopener noreferrer" sx={{ ml: 'auto', backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}>
                          Book
                        </Button>
                      )}
                    </Box>

                    {isEditing && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                          🏨 Click to select for deletion
                        </Typography>
                        {selectedAccommodations.has(accommodationIndex) && (
                          <Chip 
                            icon={<CheckCircle sx={{ color: 'white !important' }} />}
                            label="Selected"
                            size="small"
                            sx={{ 
                              backgroundColor: '#f44336',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default AccommodationsSection;

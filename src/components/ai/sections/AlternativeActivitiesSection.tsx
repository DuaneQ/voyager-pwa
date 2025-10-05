import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography, Grid, Card, CardContent, Chip, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarIcon from '@mui/icons-material/Star';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import LocalActivityIcon from '@mui/icons-material/LocalActivity';

interface Props {
  activities: any[];
}

const formatCost = (a: any) => {
  if (!a) return 'Price TBD';
  // Prefer structured estimatedCost.amount
  if (a.estimatedCost && (a.estimatedCost.amount !== undefined && a.estimatedCost.amount !== null)) {
    return `${a.estimatedCost.amount} ${a.estimatedCost.currency || 'USD'}`;
  }
  // If a price_level is provided, render dollar signs ($ - $$$$)
  const lvl = a.estimatedCost?.price_level ?? a.price_level ?? a.priceLevel;
  if (lvl !== undefined && lvl !== null) {
    const v = Number(lvl) || 1;
    return '$'.repeat(Math.max(1, Math.min(4, v)));
  }
  if (a.price) return String(a.price);
  return 'Price TBD';
};

const formatLocation = (loc: any) => {
  if (!loc) return 'Location not specified';
  if (typeof loc === 'string') return loc;
  return loc.name || loc.address || 'Location not specified';
};

const AlternativeActivitiesSection: React.FC<Props> = ({ activities }) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) return null;

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
          <LocalActivityIcon sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white' }}>
            Alternative Activities ({activities.length})
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {activities.filter((act: any) => act).map((activity: any, idx: number) => (
            <Grid item xs={12} sm={6} key={`alt-activity-${idx}-${activity.id || idx}`}>
              <Card variant="outlined" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.06)', border: '1px solid rgba(33, 150, 243, 0.12)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ color: 'white' }}>{activity.name}</Typography>
                    <Chip label={activity.category || 'activity'} size="small" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.12)', color: 'white', borderColor: 'rgba(33, 150, 243, 0.2)' }} variant="outlined" />
                  </Box>

                  {activity.description && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.75)' }} paragraph>{activity.description}</Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{formatLocation(activity.location)}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachMoneyIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{formatCost(activity)}</Typography>
                    </Box>

                    {activity.duration && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{activity.duration}</Typography>
                      </Box>
                    )}

                    {activity.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StarIcon sx={{ color: '#FFD700', fontSize: 16 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{activity.rating}</Typography>
                      </Box>
                    )}

                  </Box>

                  {(activity.phone || activity.website || activity.bookingUrl) && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, width: '100%' }}>
                      {activity.phone && (
                        <Button size="small" startIcon={<PhoneIcon />} href={`tel:${activity.phone}`} sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Call</Button>
                      )}
                      {activity.website && (
                        <Button size="small" startIcon={<LanguageIcon />} href={activity.website} target="_blank" rel="noopener noreferrer" sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Website</Button>
                      )}
                      {activity.bookingUrl && (
                        <Button size="small" startIcon={<LanguageIcon />} href={activity.bookingUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Book</Button>
                      )}
                    </Box>
                  )}

                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default AlternativeActivitiesSection;

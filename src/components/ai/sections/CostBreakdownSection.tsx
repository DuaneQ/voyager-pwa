import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AttachMoney } from '@mui/icons-material';

interface DayCost {
  day: number;
  date: string;
  total: number;
  accommodation: number;
  food: number;
  activities: number;
  transportation: number;
  misc: number;
}

interface CostBreakdown {
  total: number;
  perPerson?: number;
  byCategory?: Record<string, number>;
  byDay?: DayCost[];
}

interface CostBreakdownSectionProps {
  costBreakdown: CostBreakdown;
}

export const CostBreakdownSection: React.FC<CostBreakdownSectionProps> = ({
  costBreakdown
}) => {
  if (!costBreakdown || !costBreakdown.total) {
    return null;
  }

  return (
    <Accordion sx={{ mb: 2, transform: 'translateX(-4%)', backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', '&:before': { display: 'none' } }}>
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
              ${costBreakdown.total ? costBreakdown.total.toFixed(2) : '0.00'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Per Person
            </Typography>
            <Typography variant="h6" sx={{ color: 'white' }}>
              ${costBreakdown.perPerson ? costBreakdown.perPerson.toFixed(2) : '0.00'}
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
              {costBreakdown.byDay.map((dayCost: DayCost, index: number) => (
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
  );
};

export default CostBreakdownSection;
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
  AccessTime, 
  LocationOn, 
  AttachMoney,
  Edit,
  Save,
  Cancel,
  Delete,
  CheckCircle,
  Star,
  Phone,
  Link,
  Language,
  Restaurant,
  Book
} from '@mui/icons-material';

interface Activity {
  name: string;
  description?: string;
  category?: string;
  timing?: { startTime?: string; endTime?: string };
  startTime?: string;
  endTime?: string;
  location?: string | { name: string };
  cost?: string;
  price?: string;
  estimatedCost?: string | number | { amount: number; currency?: string };
  website?: string;
  bookingUrl?: string;
  tips?: string[];
}

interface DailyItinerarySectionProps {
  dailyData: any[];
  isEditing: boolean;
  editingData: any;
  selectedActivities: Set<string>;
  onToggleActivitySelection: (dayIndex: number, activityIndex: number) => void;
  onUpdateEditingData: (updatedData: any) => void;
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

// Normalize a user-provided URL for use in an href. Do NOT mutate the stored value.
// If the value already has a scheme (http, https, mailto, tel) we return it as-is.
// Otherwise prefix with https:// so the browser treats it as an absolute URL.
const normalizeExternalUrl = (u?: string | null) => {
  if (!u) return undefined;
  const val = String(u).trim();
  if (!val) return undefined;
  // If it already contains a scheme, return as-is
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(val)) return val;
  // Otherwise assume https
  return `https://${val}`;
};

export const DailyItinerarySection: React.FC<DailyItinerarySectionProps> = ({
  dailyData,
  isEditing,
  editingData,
  selectedActivities,
  onToggleActivitySelection,
  onUpdateEditingData
}) => {
  if (!dailyData || !Array.isArray(dailyData) || dailyData.length === 0) {
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

  const handleActivityFieldUpdate = (
    dayIndex: number,
    activityIndex: number,
    field: string,
    value: string,
    subField?: string
  ) => {
    if (!editingData) return;
    
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const dailyDataPath = updatedData.response?.data?.itinerary?.days || updatedData.response?.data?.itinerary?.dailyPlans;
    
    if (dailyDataPath && dailyDataPath[dayIndex] && dailyDataPath[dayIndex].activities[activityIndex]) {
      const activity = dailyDataPath[dayIndex].activities[activityIndex];
      
      if (subField) {
        if (!activity[field]) {
          activity[field] = {};
        }
        activity[field][subField] = value;
      } else {
        activity[field] = value;
      }
      
      onUpdateEditingData(updatedData);
    }
  };

  const handleMealFieldUpdate = (
    dayIndex: number,
    mealIndex: number,
    field: string,
    value: string,
    subField?: string
  ) => {
    if (!editingData) return;
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const dailyDataPath = updatedData.response?.data?.itinerary?.days || updatedData.response?.data?.itinerary?.dailyPlans;

    if (dailyDataPath && dailyDataPath[dayIndex] && Array.isArray(dailyDataPath[dayIndex].meals) && dailyDataPath[dayIndex].meals[mealIndex]) {
      const meal = dailyDataPath[dayIndex].meals[mealIndex];

      if (subField) {
        if (!meal[field]) meal[field] = {};
        // If cost amount, try to coerce to number when appropriate
        if (field === 'cost' && subField === 'amount') {
          const n = Number(value);
          meal[field][subField] = Number.isNaN(n) ? value : n;
        } else {
          meal[field][subField] = value;
        }
      } else {
        meal[field] = value;
      }

      onUpdateEditingData(updatedData);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 900, lg: 1200 }, mx: 'auto', px: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Daily Itinerary
      </Typography>
      
      {dailyData.map((day: any, dayIndex: number) => (
        <Accordion key={dayIndex} defaultExpanded={dayIndex === 0} sx={{
          mb: 2,
          transform: { xs: 'translateX(-13%)', sm: 'translateX(-13%)', md: 'translateX(-6%)', lg: 'translateX(-4%)' },
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Day {day.day || (dayIndex + 1)}
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
              {day.activities && Array.isArray(day.activities) && day.activities
                .filter((activity: any) => activity)
                .map((activity: Activity, activityIndex: number) => (
                  <ActivityCard
                    key={`day-${dayIndex}-activity-${activityIndex}-${activity.name || activityIndex}`}
                    activity={activity}
                    dayIndex={dayIndex}
                    activityIndex={activityIndex}
                    isEditing={isEditing}
                    isSelected={selectedActivities.has(`${dayIndex}-${activityIndex}`)}
                    onToggleSelection={() => onToggleActivitySelection(dayIndex, activityIndex)}
                    onFieldUpdate={handleActivityFieldUpdate}
                  />
                ))}

              {/* Display Meals */}
              {day.meals && Array.isArray(day.meals) && day.meals
                .filter((meal: any) => meal)
                .map((meal: any, mealIndex: number) => (
                  <MealCard
                    key={`day-${dayIndex}-meal-${mealIndex}-${meal.id || mealIndex}`}
                    meal={meal}
                    dayIndex={dayIndex}
                    mealIndex={mealIndex}
                    isEditing={isEditing}
                    onMealFieldUpdate={handleMealFieldUpdate}
                  />
                ))}

              {/* Display Transportation */}
              {day.transportation && Array.isArray(day.transportation) && day.transportation
                .filter((transport: any) => transport)
                .map((transport: any, transportIndex: number) => (
                  <TransportationCard
                    key={`day-${dayIndex}-transport-${transportIndex}-${transport.id || transportIndex}`}
                    transport={transport}
                  />
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
      ))}
    </Box>
  );
};

// Activity Card Component
const ActivityCard: React.FC<{
  activity: Activity;
  dayIndex: number;
  activityIndex: number;
  isEditing: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onFieldUpdate: (dayIndex: number, activityIndex: number, field: string, value: string, subField?: string) => void;
}> = ({ activity, dayIndex, activityIndex, isEditing, isSelected, onToggleSelection, onFieldUpdate }) => {
  return (
    <Card variant="outlined" sx={{
      backgroundColor: isSelected ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      border: isSelected ? '2px solid #f44336' : '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <CardContent>
        {/* Activity Header with Edit Mode Indicator */}
        {isEditing && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 2,
            p: 1.5,
            backgroundColor: 'rgba(76, 175, 80, 0.15)',
            borderRadius: 1,
            border: '2px solid rgba(76, 175, 80, 0.5)'
          }}>
            <Edit sx={{ fontSize: 18, color: '#4caf50' }} />
            <Typography variant="body2" sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
            }}>
              ✏️ EDIT MODE: Click on text to modify
            </Typography>
          </Box>
        )}
        
        {/* Activity Title and Category */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1,
          mb: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isEditing ? (
              <Box sx={{ flex: 1, mr: 2 }}>
                <TextField
                  value={activity.name || 'Activity'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onFieldUpdate(dayIndex, activityIndex, 'name', e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  variant="standard"
                  fullWidth
                  sx={{
                    '& .MuiInputBase-input': {
                      color: 'white',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      padding: '4px 0',
                      backgroundColor: 'transparent'
                    },
                    '& .MuiInput-underline:before': {
                      borderBottomColor: 'transparent'
                    },
                    '& .MuiInput-underline:hover:before': {
                      borderBottomColor: 'rgba(255, 255, 255, 0.3)'
                    },
                    '& .MuiInput-underline:after': {
                      borderBottomColor: 'rgba(76, 175, 80, 0.8)'
                    }
                  }}
                />
              </Box>
            ) : (
              <Typography variant="h6" component="h3" sx={{ 
                color: 'white',
                flex: 1
              }}>
                {activity.name || 'Activity'}
              </Typography>
            )}
            
            <Chip 
              label={activity.category || 'Activity'} 
              size="small" 
              color="primary" 
              variant="outlined"
              sx={{ 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                flexShrink: 0
              }}
            />
          </Box>
        </Box>
        
        {/* Description Field */}
        {isEditing ? (
          <TextField
            value={activity.description || 'No description available'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              onFieldUpdate(dayIndex, activityIndex, 'description', e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            multiline
            rows={2}
            variant="standard"
            fullWidth
            sx={{
              mb: 2,
              '& .MuiInputBase-input': {
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '1rem',
                backgroundColor: 'transparent'
              },
              '& .MuiInput-underline:before': {
                borderBottomColor: 'transparent'
              },
              '& .MuiInput-underline:hover:before': {
                borderBottomColor: 'rgba(255, 255, 255, 0.3)'
              },
              '& .MuiInput-underline:after': {
                borderBottomColor: 'rgba(76, 175, 80, 0.8)'
              }
            }}
          />
        ) : (
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }} paragraph>
            {activity.description || 'No description available'}
          </Typography>
        )}
        
        {/* Activity Details */}
        <ActivityDetails 
          activity={activity}
          dayIndex={dayIndex}
          activityIndex={activityIndex}
          isEditing={isEditing}
          onFieldUpdate={onFieldUpdate}
        />

        {/* Selection indicator in edit mode */}
        {isEditing && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, p: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              🎯 Click to select for deletion
            </Typography>
            {isSelected && (
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
      </CardContent>
    </Card>
  );
};

// Activity Details Component
const ActivityDetails: React.FC<{
  activity: Activity;
  dayIndex: number;
  activityIndex: number;
  isEditing: boolean;
  onFieldUpdate: (dayIndex: number, activityIndex: number, field: string, value: string, subField?: string) => void;
}> = ({ activity, dayIndex, activityIndex, isEditing, onFieldUpdate }) => {
  const websiteHref = normalizeExternalUrl(activity.website);
  const bookingHref = normalizeExternalUrl(activity.bookingUrl);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {(activity.timing || isEditing) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
            {isEditing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  value={activity.timing?.startTime || activity.startTime || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onFieldUpdate(dayIndex, activityIndex, 'timing', e.target.value, 'startTime');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Start time"
                  variant="standard"
                  size="small"
                  sx={{ width: 80, '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', backgroundColor: 'transparent' } }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>-</Typography>
                <TextField
                  value={activity.timing?.endTime || activity.endTime || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onFieldUpdate(dayIndex, activityIndex, 'timing', e.target.value, 'endTime');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="End time"
                  variant="standard"
                  size="small"
                  sx={{ width: 80, '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', backgroundColor: 'transparent' } }}
                />
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {activity.timing?.startTime || activity.startTime || 'Time'} - {activity.timing?.endTime || activity.endTime || 'TBD'}
              </Typography>
            )}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LocationOn sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
          {isEditing ? (
            <TextField
              value={typeof activity.location === 'string' 
                ? activity.location 
                : (activity.location as any)?.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onFieldUpdate(dayIndex, activityIndex, 'location', e.target.value);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Location"
              variant="standard"
              size="small"
              sx={{ width: 200, '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', backgroundColor: 'transparent' } }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {typeof activity.location === 'string' 
                ? activity.location 
                : (activity.location as any)?.name || 'Location not specified'}
            </Typography>
          )}
        </Box>
        
        {/* Cost Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {(() => {
              if (activity.cost && typeof activity.cost === 'string') return activity.cost;
              if (activity.price && typeof activity.price === 'string') return activity.price;
              if (activity.estimatedCost) {
                if (typeof activity.estimatedCost === 'string') return activity.estimatedCost;
                if (typeof activity.estimatedCost === 'number') return `$${activity.estimatedCost}`;
                if ((activity.estimatedCost as any).amount) return `$${(activity.estimatedCost as any).amount}`;
                return '$TBD';
              }
              return '$TBD';
            })()}
          </Typography>
        </Box>
      </Box>
      
      {/* Website and booking links */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {isEditing ? (
          <>
            <TextField
              value={activity.website || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldUpdate(dayIndex, activityIndex, 'website', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Website"
              variant="standard"
              size="small"
              sx={{ '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.85)', backgroundColor: 'transparent' }, width: 260 }}
            />
            <TextField
              value={activity.bookingUrl || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFieldUpdate(dayIndex, activityIndex, 'bookingUrl', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Booking URL"
              variant="standard"
              size="small"
              sx={{ '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.85)', backgroundColor: 'transparent' }, width: 260 }}
            />
          </>
        ) : (
          <>
            {websiteHref && (
              <Button
                href={websiteHref}
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

            {bookingHref && (
              <Button
                href={bookingHref}
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
          </>
        )}
      </Box>

      {/* Display tips if available */}
      {activity.tips && Array.isArray(activity.tips) && activity.tips.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'white' }}>Tips:</Typography>
          {activity.tips.map((tip: string, tipIndex: number) => (
            <Typography key={tipIndex} variant="caption" display="block" sx={{ ml: 1, mb: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
              • {tip}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Meal Card Component
const MealCard: React.FC<{ meal: any; dayIndex: number; mealIndex: number; isEditing: boolean; onMealFieldUpdate: (dayIndex: number, mealIndex: number, field: string, value: string, subField?: string) => void }> = ({ meal, dayIndex, mealIndex, isEditing, onMealFieldUpdate }) => {
  const mealWebsiteHref = normalizeExternalUrl(meal.restaurant?.website || meal.bookingInfo?.website);
  const mealBookingHref = normalizeExternalUrl(meal.restaurant?.bookingUrl || meal.bookingInfo?.reservationUrl);

  return (
    <Card variant="outlined" sx={{ 
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      border: '1px solid rgba(255, 193, 7, 0.3)'
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography sx={{ color: 'white', fontSize: '1.25rem' }}>🍽️</Typography>
            {isEditing ? (
              <TextField
                value={meal.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMealFieldUpdate(dayIndex, mealIndex, 'name', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                variant="standard"
                fullWidth
                sx={{ '& .MuiInputBase-input': { color: 'white', fontSize: '1.25rem', fontWeight: 600, backgroundColor: 'transparent' } }}
              />
            ) : (
              <Typography variant="h6" component="h3" sx={{ color: 'white' }}>{meal.name || 'Meal'}</Typography>
            )}
          </Box>
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
            {isEditing ? (
              <TextField
                value={meal.restaurant?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMealFieldUpdate(dayIndex, mealIndex, 'restaurant', e.target.value, 'name')}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Restaurant name"
                variant="standard"
                size="small"
                sx={{ '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.7)', backgroundColor: 'transparent' }, width: 200 }}
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{meal.restaurant?.name || 'Restaurant not specified'}</Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AttachMoney sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
            {isEditing ? (
              <TextField
                value={meal.cost?.amount !== undefined ? String(meal.cost.amount) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMealFieldUpdate(dayIndex, mealIndex, 'cost', e.target.value, 'amount')}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Cost"
                variant="standard"
                size="small"
                sx={{ '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.7)', backgroundColor: 'transparent' }, width: 120 }}
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>${meal.cost?.amount?.toFixed(2) || 'Price TBD'} {meal.cost?.currency || ''}</Typography>
            )}
          </Box>

          {meal.restaurant?.rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Star sx={{ color: '#FFD700', fontSize: 16 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{meal.restaurant.rating}</Typography>
            </Box>
          )}
        </Box>

        {meal.restaurant?.cuisine && (
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>Cuisine: {meal.restaurant.cuisine}</Typography>
        )}

        {/* Booking Information */}
        {(meal.restaurant?.phone || meal.restaurant?.website || meal.restaurant?.bookingUrl || meal.bookingInfo) && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {isEditing ? (
              <>
                <TextField
                  value={meal.restaurant?.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMealFieldUpdate(dayIndex, mealIndex, 'restaurant', e.target.value, 'phone')}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Phone"
                  variant="standard"
                  size="small"
                  sx={{ '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.85)', backgroundColor: 'transparent' }, width: 160 }}
                />
                <TextField
                  value={meal.restaurant?.website || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMealFieldUpdate(dayIndex, mealIndex, 'restaurant', e.target.value, 'website')}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Website"
                  variant="standard"
                  size="small"
                  sx={{ '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.85)', backgroundColor: 'transparent' }, width: 260 }}
                />
                <TextField
                  value={meal.restaurant?.bookingUrl || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onMealFieldUpdate(dayIndex, mealIndex, 'restaurant', e.target.value, 'bookingUrl')}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Booking URL"
                  variant="standard"
                  size="small"
                  sx={{ '& .MuiInputBase-input': { color: 'rgba(255, 255, 255, 0.85)', backgroundColor: 'transparent' }, width: 260 }}
                />
              </>
            ) : (
              <>
                {(meal.restaurant?.phone || meal.bookingInfo?.phone) && (
                  <Button size="small" startIcon={<Phone />} href={`tel:${meal.restaurant?.phone || meal.bookingInfo?.phone}`} sx={{ color: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Call</Button>
                )}
                {mealWebsiteHref && (
                  <Button size="small" startIcon={<Language />} href={mealWebsiteHref} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(255, 255, 255, 0.3)' }} variant="outlined">Website</Button>
                )}
                {mealBookingHref && (
                  <Button size="small" startIcon={<Restaurant />} href={mealBookingHref} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(76, 175, 80, 0.5)', backgroundColor: 'rgba(76, 175, 80, 0.1)', '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.2)' } }} variant="outlined">Make Reservation</Button>
                )}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Transportation Card Component
const TransportationCard: React.FC<{ transport: any }> = ({ transport }) => {
  return (
    <Card variant="outlined" sx={{ 
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
  );
};

export default DailyItinerarySection;
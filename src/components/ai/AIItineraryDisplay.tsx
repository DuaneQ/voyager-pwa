import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { 
  Delete, 
  ExpandMore,
} from '@mui/icons-material';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';
import { useAIGeneratedItineraries } from '../../hooks/useAIGeneratedItineraries';
import useUpdateItinerary from '../../hooks/useUpdateItinerary';

// Import refactored sections
import { AIItineraryHeader } from './sections/AIItineraryHeader';
import { CostBreakdownSection } from './sections/CostBreakdownSection';
import FlightOptionsSection from './sections/FlightOptionsSection';
import { DailyItinerarySection } from './sections/DailyItinerarySection';
import ShareAIItineraryModal from '../modals/ShareAIItineraryModal';
import AccommodationsSection from './sections/AccommodationsSection';
import AlternativeActivitiesSection from './sections/AlternativeActivitiesSection';
import AlternativeRestaurantsSection from './sections/AlternativeRestaurantsSection';
import { db } from '../../environments/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../../environments/firebaseConfig';

interface AIItineraryDisplayProps {
  itinerary?: AIGeneratedItinerary | null;
}

export const AIItineraryDisplay: React.FC<AIItineraryDisplayProps> = ({ itinerary }) => {
  const { itineraries, refreshItineraries } = useAIGeneratedItineraries();
  const { updateItinerary } = useUpdateItinerary();
  const [selectedId, setSelectedId] = useState<string | null>(itinerary?.id || null);
  const [selectedItinerary, setSelectedItinerary] = useState<AIGeneratedItinerary | null>(itinerary || null);
  
  // Selection state for better deletion UX
  const [selectedFlights, setSelectedFlights] = useState<Set<number>>(new Set());
  const [selectedAccommodations, setSelectedAccommodations] = useState<Set<number>>(new Set());
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  
  // Basic editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<AIGeneratedItinerary | null>(null);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Selection handlers
  const toggleFlightSelection = (flightIndex: number) => {
    setSelectedFlights(prev => {
      const newSet = new Set(prev);
      newSet.has(flightIndex) ? newSet.delete(flightIndex) : newSet.add(flightIndex);
      return newSet;
    });
  };

  const toggleAccommodationSelection = (accommodationIndex: number) => {
    setSelectedAccommodations(prev => {
      const newSet = new Set(prev);
      newSet.has(accommodationIndex) ? newSet.delete(accommodationIndex) : newSet.add(accommodationIndex);
      return newSet;
    });
  };

  const toggleActivitySelection = (dayIndex: number, activityIndex: number) => {
    const activityId = `${dayIndex}-${activityIndex}`;
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      newSet.has(activityId) ? newSet.delete(activityId) : newSet.add(activityId);
      return newSet;
    });
  };

  const clearAllSelections = () => {
    setSelectedFlights(new Set());
    setSelectedAccommodations(new Set());
    setSelectedActivities(new Set());
  };

  useEffect(() => {
    // Always update when the prop changes - parent controls the selection
    if (itinerary) {
      setSelectedId(itinerary.id);
      setSelectedItinerary(itinerary);
    } else {
      // If prop becomes null, clear selection
      setSelectedId(null);
      setSelectedItinerary(null);
    }
  }, [itinerary]);

  useEffect(() => {
    if (selectedId && itineraries && itineraries.length > 0) {
      const found = itineraries.find(i => i.id === selectedId);
      if (found) setSelectedItinerary(found);
    } else if (!selectedId && itineraries && itineraries.length > 0) {
      // Auto-select the first itinerary if none is selected
      const firstItinerary = itineraries[0];
      setSelectedId(firstItinerary.id);
      setSelectedItinerary(firstItinerary);
    }
  }, [selectedId, itineraries]);

  // Log for debugging: which user and how many itineraries the UI received
  useEffect(() => {
    try {
  const uid = auth.currentUser?.uid || (itineraries && (itineraries[0] as any)?.userInfo?.uid) || 'unknown';
      console.info('[AIItineraryDisplay] user:', uid, 'itinerariesReceived:', Array.isArray(itineraries) ? itineraries.length : 0);
    } catch (e) {
      console.info('[AIItineraryDisplay] itinerariesUpdated', Array.isArray(itineraries) ? itineraries.length : 0);
    }
  }, [itineraries]);

  // Use editingData when in edit mode, otherwise use selectedItinerary
  const currentItinerary = isEditing && editingData ? editingData : selectedItinerary;
  const itineraryData = currentItinerary?.response?.data?.itinerary;
  const costBreakdown = currentItinerary?.response?.data?.costBreakdown;
  // Canonical source: `response.data.metadata`.
  // The `useAIGeneration` hook and `searchActivities` return and persist
  // filtering metadata under `response.data.metadata.filtering`. Read only
  // from that location to avoid hiding issues where metadata was not saved.
  const metadata = currentItinerary?.response?.data?.metadata as any;
  const recommendations = currentItinerary?.response?.data?.recommendations;

  // Flight data source (UI prefers itinerary.flights first, then recommendations.flights)
  const flightSource: any[] = (() => {
    if (isEditing && editingData) {
      return (editingData.response?.data?.itinerary as any)?.flights || editingData.response?.data?.recommendations?.flights || [];
    }
    return (itineraryData as any)?.flights || recommendations?.flights || [];
  })();

  const handleBatchDeleteFlights = () => {
    if (!editingData) return;
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const sortedIndices = Array.from(selectedFlights).sort((a, b) => b - a);
    const itineraryFlights = updatedData.response?.data?.itinerary?.flights;
    const recommendationFlights = updatedData.response?.data?.recommendations?.flights;
    if (itineraryFlights && Array.isArray(itineraryFlights)) {
      sortedIndices.forEach(index => {
        updatedData.response.data.itinerary.flights.splice(index, 1);
      });
    } else if (recommendationFlights && Array.isArray(recommendationFlights)) {
      sortedIndices.forEach(index => {
        updatedData.response.data.recommendations.flights.splice(index, 1);
      });
    }
    setEditingData(updatedData);
    setSelectedFlights(new Set());
  };

  // Early return if no itineraries AND no selected itinerary - parent should handle no-data case
  // Allow rendering when a selected itinerary prop was provided (useful in tests and direct displays)
  if ((!itineraries || itineraries.length === 0) && !selectedItinerary) {
    return null;
  }

  // If we have itineraries but no selected itinerary data to display
  if (!itineraryData) {
    return (
      <Card sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <CardContent>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Select an itinerary from the dropdown above to view its details.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // At this point we know we have itineraryData, render the main component
  if (!itineraryData) {
    return null; // This should never happen but satisfies TypeScript
  }

  // Save function for editing
  const handleSave = async () => {
    if (!editingData || !selectedItinerary) return;

    try {
      // Build the minimal updates object expected by the updateItinerary RPC
      const updatePayload: any = {
        response: editingData.response,
        updatedAt: new Date().toISOString(),
        destination: editingData.response?.data?.itinerary?.destination || editingData.destination,
        startDate: editingData.response?.data?.itinerary?.startDate || editingData.startDate,
        endDate: editingData.response?.data?.itinerary?.endDate || editingData.endDate
      };

      // Use the RPC-based updater (matches how non-AI itineraries are updated)
      await updateItinerary(selectedItinerary.id, updatePayload as any);

      // Update local state and refresh the list
      setSelectedItinerary(editingData);
      await refreshItineraries();
      setIsEditing(false);
      clearAllSelections();
      setEditingData(null);

      alert('Changes saved successfully!');
    } catch (error) {
      alert(`Failed to save changes: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEditStart = () => {
    setIsEditing(true);
    setEditingData(selectedItinerary ? JSON.parse(JSON.stringify(selectedItinerary)) : null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    clearAllSelections();
    setEditingData(null);
  };

  const handleShare = async () => {
    if (!selectedItinerary) return;

    try {
      // Save directly to Firestore so the legacy share page (which reads
      // from Firestore) can serve the itinerary. Doing this inline keeps the
      // behavior local to the component and avoids introducing a new hook.
      const id = selectedItinerary.id;

      // Ensure we save the full itinerary structure including all nested data
      // (response.data.recommendations, response.data.metadata, etc.)
      const payload = {
        ...selectedItinerary,
        id,
        createdAt: selectedItinerary.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Explicitly preserve the response object to ensure recommendations and metadata are saved
        response: selectedItinerary.response || {},
      } as any;

      const ref = doc(db, 'itineraries', id);
      // Use merge: false to ensure we write the complete document
      await setDoc(ref, payload, { merge: false });

      // Update UI to reflect the persisted id and refresh the list
      setSelectedItinerary({ ...selectedItinerary, id } as any);
      try { await refreshItineraries(); } catch (e) { /* best-effort */ }
      setShareModalOpen(true);
    } catch (err: any) {
      console.error('Error saving itinerary to Firestore for share', err);
      alert('Unable to create a shareable link right now. Please try again.');
    }
  };

  const handleShareClose = () => {
    setShareModalOpen(false);
  };

  return (
    <Box sx={{ color: 'white', width: '100%', maxWidth: { xs: '100%', md: 900, lg: 1200 }, mx: 'auto', px: { xs: 2, md: 3 } }}>
      {/* Header Section */}
      <AIItineraryHeader
        itineraryData={itineraryData}
        metadata={metadata}
        isEditing={isEditing}
        onEditStart={handleEditStart}
        onSave={handleSave}
        onCancel={handleCancel}
        onShare={handleShare}
      />

          {/* Batch Delete Controls - Show only in edit mode */}
          {isEditing && (selectedFlights.size > 0 || selectedAccommodations.size > 0 || selectedActivities.size > 0) && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: 'rgba(244, 67, 54, 0.1)', 
              borderRadius: 1,
              border: '1px solid rgba(244, 67, 54, 0.3)'
            }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                🗑️ Batch Delete Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedFlights.size > 0 && (
                  <Button
                    startIcon={<Delete />}
                    onClick={() => {
                      if (!editingData) return;
                      
                      const updatedData = JSON.parse(JSON.stringify(editingData));
                      const sortedIndices = Array.from(selectedFlights).sort((a, b) => b - a);
                      
                      // Determine the correct flight data source that UI uses
                      const itineraryFlights = updatedData.response?.data?.itinerary?.flights;
                      const recommendationFlights = updatedData.response?.data?.recommendations?.flights;
                      
                      // Delete from the primary data source (UI uses itinerary flights first, then recommendations)
                      if (itineraryFlights && Array.isArray(itineraryFlights)) {
                        sortedIndices.forEach(index => {
                          updatedData.response.data.itinerary.flights.splice(index, 1);
                        });
                      } else if (recommendationFlights && Array.isArray(recommendationFlights)) {
                        sortedIndices.forEach(index => {
                          updatedData.response.data.recommendations.flights.splice(index, 1);
                        });
                      }
                      
                      setEditingData(updatedData);
                      setSelectedFlights(new Set());
                    }}
                    size="small"
                    variant="contained"
                    color="error"
                    sx={{ 
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                    >
                    Delete {selectedFlights.size} Flight{selectedFlights.size > 1 ? 's' : ''}
                  </Button>
                )}
                {selectedAccommodations.size > 0 && (
                  <Button
                    startIcon={<Delete />}
                    onClick={() => {
                      if (!editingData) return;
                      
                      const updatedData = JSON.parse(JSON.stringify(editingData));
                      const sortedIndices = Array.from(selectedAccommodations).sort((a, b) => b - a);
                      
                      // Accommodations are only in recommendations, not in itinerary data
                      const accommodations = updatedData.response?.data?.recommendations?.accommodations;
                      
                      if (accommodations && Array.isArray(accommodations)) {
                        sortedIndices.forEach(index => {
                          updatedData.response.data.recommendations.accommodations.splice(index, 1);
                        });
                      }
                      
                      setEditingData(updatedData);
                      setSelectedAccommodations(new Set());
                    }}
                    size="small"
                    variant="contained"
                    color="error"
                    sx={{ 
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    Delete {selectedAccommodations.size} Hotel{selectedAccommodations.size > 1 ? 's' : ''}
                  </Button>
                )}
                {selectedActivities.size > 0 && (
                  <Button
                    startIcon={<Delete />}
                    onClick={() => {
                      if (!editingData) return;
                      
                      const updatedData = JSON.parse(JSON.stringify(editingData));
                      const dailyData = updatedData.response?.data?.itinerary?.days || updatedData.response?.data?.itinerary?.dailyPlans;
                      
                      // Delete activities from their respective days (need to sort by activityIndex desc to avoid index shifting)
                      const sortedActivityIds = Array.from(selectedActivities).sort((a, b) => {
                        const [, aActivityIndex] = a.split('-').map(Number);
                        const [, bActivityIndex] = b.split('-').map(Number);
                        return bActivityIndex - aActivityIndex;
                      });
                      
                      sortedActivityIds.forEach(activityId => {
                        const [dayIndex, activityIndex] = activityId.split('-').map(Number);
                        if (dailyData && dailyData[dayIndex] && dailyData[dayIndex].activities) {
                          dailyData[dayIndex].activities.splice(activityIndex, 1);
                        }
                      });
                      
                      setEditingData(updatedData);
                      setSelectedActivities(new Set());
                    }}
                    size="small"
                    variant="contained"
                    color="error"
                    sx={{ 
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    Delete {selectedActivities.size} Activity{selectedActivities.size > 1 ? 'ies' : 'y'}
                  </Button>
                )}
                <Button
                  onClick={clearAllSelections}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.5)'
                    }
                  }}
                >
                  Clear Selection
                </Button>
              </Box>
            </Box>
          )}

          {/* Edit Mode Instructions */}
          {isEditing && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: 'rgba(33, 150, 243, 0.1)', 
              borderRadius: 1,
              border: '1px solid rgba(33, 150, 243, 0.3)'
            }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' }}>
                  💡 <strong>Edit Mode:</strong> Click on flights ✈️, hotels 🏨, and activities � to select them for deletion. Use batch delete buttons above to remove selected items.
                </Typography>
            </Box>
          )}

      {/* Cost Breakdown Accordion */}
      {costBreakdown && costBreakdown.total && (
        <CostBreakdownSection costBreakdown={costBreakdown} />
      )}

      {/* Travel Recommendations Section - For non-flight transportation */}
      {(() => {
        // Transportation may be stored directly under response.data.transportation (preferred)
        // or under response.data.recommendations.transportation (older payloads). Check both.
        const rawTransport = (currentItinerary?.response?.data?.transportation ?? currentItinerary?.response?.data?.recommendations?.transportation) as any;
        // Normalize multiple possible shapes so tests and UI can rely on a single shape
        const transport = rawTransport ? {
          mode: rawTransport.mode,
          // Accept either a pre-formatted string ("5h") or numeric hours (5)
          estimatedTime: rawTransport.estimatedTime ?? (rawTransport.estimated_duration_hours ? `${rawTransport.estimated_duration_hours}h` : null),
          estimatedDistance: rawTransport.estimatedDistance ?? (rawTransport.estimated_distance_miles ? `${rawTransport.estimated_distance_miles} miles` : null),
          // Accept either a simple number/string (estimated_cost_usd) or an object { amount, currency }
          estimatedCost: rawTransport.estimated_cost_usd ? (typeof rawTransport.estimated_cost_usd === 'number' ? `${rawTransport.estimated_cost_usd} USD` : String(rawTransport.estimated_cost_usd))
                         : (rawTransport.estimatedCost && typeof rawTransport.estimatedCost === 'object' ? `${rawTransport.estimatedCost.amount} ${rawTransport.estimatedCost.currency || 'USD'}` : (rawTransport.estimatedCost ? String(rawTransport.estimatedCost) : null)),
          // Providers may be a single provider string or an array of provider objects
          providers: rawTransport.providers && Array.isArray(rawTransport.providers) ? rawTransport.providers : (rawTransport.provider ? [{ name: rawTransport.provider }] : []),
          // Steps (ordered guidance) may be provided on transport
          steps: rawTransport.steps ? (Array.isArray(rawTransport.steps) ? rawTransport.steps : [String(rawTransport.steps)]) : [],
          // Tips may be a string or an array
          tips: rawTransport.tips ? (Array.isArray(rawTransport.tips) ? rawTransport.tips : [String(rawTransport.tips)]) : []
        } : null;

        // Also read any raw assumptions saved on the itinerary. Surface these
        // when either transport recommendations exist or assumptions are present
        // (tests expect assumptions-only itineraries to render this section).
        const assumptions = (currentItinerary as any)?.response?.data?.assumptions as any;

        const shouldShowRecommendations = Boolean(
          (transport && transport.mode !== 'flight') ||
          (assumptions && (
            (assumptions.providers && assumptions.providers.length > 0) ||
            (assumptions.steps && assumptions.steps.length > 0) ||
            (assumptions.tips && assumptions.tips.length > 0)
          ))
        );

        // Combine providers from transport and assumptions (dedupe by url/name)
        const combinedProviders: any[] = (() => {
          const list: any[] = [];
          if (transport?.providers && Array.isArray(transport.providers)) list.push(...transport.providers);
          if (assumptions?.providers && Array.isArray(assumptions.providers)) list.push(...assumptions.providers);
          // Normalize provider URL fields (some providers use website, url, link, href, etc.)
          const normalizeUrl = (p: any) => p?.url || p?.website || p?.link || p?.href || p?.site || null;
          const seen = new Set<string>();
          const out: any[] = [];
          for (const p of list) {
            const url = normalizeUrl(p);
            const key = url || p?.name || JSON.stringify(p);
            if (seen.has(key)) continue;
            seen.add(key);
            const clone = { ...p, _normalizedUrl: url };
            out.push(clone);
          }
          // If multiple providers share the same normalized URL, remove the URL
          // for those duplicates so the UI doesn't show multiple links to the
          // same place (avoids confusion). Keep links only when unique.
          const urlCounts = out.reduce((acc: any, p: any) => {
            const u = p._normalizedUrl || null;
            if (!u) return acc;
            acc[u] = (acc[u] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          if (Object.keys(urlCounts).length > 0) {
            for (const p of out) {
              if (p._normalizedUrl && urlCounts[p._normalizedUrl] > 1) {
                p._normalizedUrl = null;
              }
            }
          }
          return out;
        })();

        const combinedTips: string[] = (() => {
          const t: string[] = [];
          if (transport?.tips && Array.isArray(transport.tips)) t.push(...transport.tips.map(String));
          if (assumptions?.tips) {
            if (Array.isArray(assumptions.tips)) t.push(...assumptions.tips.map(String));
            else t.push(String(assumptions.tips));
          }
          return t;
        })();

        // Combine ordered steps from transport and assumptions as well (transport steps first)
        const combinedSteps: string[] | null = (() => {
          const s: string[] = [];
          if (transport?.steps && Array.isArray(transport.steps)) s.push(...transport.steps.map(String));
          if (assumptions?.steps && Array.isArray(assumptions.steps)) s.push(...assumptions.steps.map(String));
          // dedupe identical step strings
          const uniq = Array.from(new Set(s));
          return uniq.length > 0 ? uniq : null;
        })();

  return shouldShowRecommendations && (
        <Accordion sx={{ 
          mb: 2,
                  transform: { xs: 'translateX(-6%)', sm: 'translateX(-6%)', md: 'translateX(-3%)', lg: 'translateX(-2%)' },
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-testid="travel-recommendations-header">
              <Typography variant="h6" sx={{ color: 'white' }}>
                Travel Recommendations
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Card variant="outlined" sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 2, color: 'white' }}>
                  🚗 Transportation Details
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label={`Mode: ${transport?.mode}`}
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                  />
                  
                  {transport?.estimatedTime && (
                    <Chip 
                      label={`Estimated Time: ${transport.estimatedTime}`}
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }}
                    />
                  )}

                  {transport?.estimatedDistance && (
                    <Chip 
                      label={`Estimated Distance: ${transport.estimatedDistance}`}
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }}
                    />
                  )}

                  {transport?.estimatedCost && (
                    <Chip 
                      label={`Estimated Cost: ${transport.estimatedCost}`}
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }}
                    />
                  )}

                  {/* Note: provider summary removed per UX — providers are shown below as clickable links */}
                </Box>
                  {combinedTips && combinedTips.length > 0 && (
                    <Box sx={{ mt: 2, textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5, textAlign: 'left' }}>
                        Tips: {combinedTips.join(' ')}
                      </Typography>
                    </Box>
                  )}

                  {/* Provider buttons, steps, and tips from assumptions (rendered when transport exists) */}
                  {combinedProviders && combinedProviders.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: 'white', mb: 0.5 }}>Providers:</Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {combinedProviders.map((p: any, i: number) => (
                          <Box key={`provider-${i}`}>
                            {/* Render as a clear link so users recognize clickability */}
                            <a
                              href={p._normalizedUrl || undefined}
                              target={p._normalizedUrl ? '_blank' : undefined}
                              rel={p._normalizedUrl ? 'noopener noreferrer' : undefined}
                              style={{ color: 'white', textDecoration: 'underline', cursor: p._normalizedUrl ? 'pointer' : 'default', fontSize: '0.95rem' }}
                            >
                              {p.name || p._normalizedUrl || 'Provider'}
                            </a>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* For older payloads where a single provider string is present at transport.provider */}
                  {rawTransport && rawTransport.provider && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Provider: {rawTransport.provider}
                      </Typography>
                    </Box>
                  )}

                  {combinedSteps && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: 'white', mb: 0.5 }}>Steps:</Typography>
                      <ol style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 16, textAlign: 'left', paddingLeft: 18 }}>
                        {combinedSteps.map((s: string, idx: number) => <li key={`step-${idx}`} style={{ marginBottom: 6 }}>{s}</li>)}
                      </ol>
                    </Box>
                  )}
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>
        );
      })()}

      {/* Flight Prices Section - Support both legacy and new flight data structures */}
      <FlightOptionsSection
        flights={flightSource}
        isEditing={isEditing}
        selectedFlights={selectedFlights}
        onToggleSelection={toggleFlightSelection}
        onBatchDelete={handleBatchDeleteFlights}
        showBatchDelete={false}
      />

      {/* Accommodation Recommendations */}
      <AccommodationsSection
        accommodations={(() => {
          return isEditing && editingData ? (editingData.response?.data?.recommendations?.accommodations || []) : (recommendations?.accommodations || []);
        })()}
        isEditing={isEditing}
        selectedAccommodations={selectedAccommodations}
        onToggleAccommodationSelection={toggleAccommodationSelection}
      />

  {/* NOTE: Removed duplicate 'Hotel Recommendations' accordion to avoid showing identical data twice. */}

      {/* Daily Itinerary */}
      <DailyItinerarySection
        dailyData={(() => {
          const sourceData = isEditing && editingData ? editingData.response?.data?.itinerary : itineraryData;
          return sourceData?.days || sourceData?.dailyPlans || [];
        })()}
        isEditing={isEditing}
        editingData={editingData}
        selectedActivities={selectedActivities}
        onToggleActivitySelection={(dayIndex: number, activityIndex: number) => toggleActivitySelection(dayIndex, activityIndex)}
        onUpdateEditingData={(updatedData: any) => setEditingData(updatedData)}
      />
      {/* Recommendations Section */}
      {recommendations && (
        <Box sx={{ mt: 3 }}>

          {/* Alternative Activities (centralized component) */}
          <AlternativeActivitiesSection activities={recommendations.alternativeActivities || []} />

          {/* Alternative Restaurants (centralized component) */}
          <AlternativeRestaurantsSection restaurants={recommendations.alternativeRestaurants || []} />
        </Box>
      )}
      
      {/* Share Modal */}
      {selectedItinerary && (
        <ShareAIItineraryModal
          open={shareModalOpen}
          onClose={handleShareClose}
          itinerary={selectedItinerary}
        />
      )}
    </Box>
  );
};

export default AIItineraryDisplay;

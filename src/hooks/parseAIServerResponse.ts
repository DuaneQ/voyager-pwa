import { parseAssistantJSON } from '../utils/ai/parsers';
import { auth } from '../environments/firebaseConfig';
import logger from '../utils/logger';

export function parseAIServerResponse(params: {
  aiSettled: any;
  generationId: string;
  request: any;
  userProfile: any;
  alternativeActivities: any[];
  alternativeRestaurants: any[];
  accommodations: any[];
}) {
  const { aiSettled, generationId, request, userProfile, alternativeActivities, alternativeRestaurants, accommodations } = params;

  let aiData: any = null;
  let parsedTransportation: any = null;
  let serverToSave: any = null;

  try {
    if (aiSettled) {
      if (aiSettled.status === 'fulfilled') {
        aiData = (aiSettled.value && (aiSettled.value.data || aiSettled.value)) || null;
        const aiPayload = aiData && (aiData.success === true || aiData.data) ? (aiData.data || aiData) : aiData;
        logger.debug('✅ [useAIGeneration] Server-side AI generation successful; aiData summary=', {
          hasAiData: !!aiData,
          keys: aiPayload && typeof aiPayload === 'object' ? Object.keys(aiPayload).slice(0, 10) : null
        });
        aiData = aiPayload;
      } else {
        logger.warn('[useAIGeneration] Server-side AI generation failed:', aiSettled.reason);
      }
    }

    // Attempt to parse assistant text from aiData (string or object)
    let assistantTextCandidate: string | null = null;
    if (aiData && typeof aiData === 'string') {
      assistantTextCandidate = aiData as string;
    } else if (aiData && typeof aiData === 'object') {
      assistantTextCandidate = (aiData as any).assistant || (aiData as any).response?.data?.assistant || (aiData as any).data?.assistant || null;
    }
    if (assistantTextCandidate && typeof assistantTextCandidate === 'string') {
      const parsed = parseAssistantJSON(assistantTextCandidate);
      if (parsed && parsed.transportation) {
        parsedTransportation = parsed.transportation;
      }
    }

    if (aiData && typeof aiData === 'object') {

      if ((aiData as any).transportation) {
        parsedTransportation = (aiData as any).transportation;
      }

      if ((aiData as any).id || (aiData as any).response) {
        serverToSave = aiData;
        const assistantText = (aiData as any).assistant || (aiData as any).response?.data?.assistant || (aiData as any).data?.assistant || null;
        if (assistantText && typeof assistantText === 'string') {
          try {
            const maybe = parseAssistantJSON(assistantText);
            if (maybe && maybe.transportation) parsedTransportation = maybe.transportation;
          } catch (e) {
            logger.warn('[useAIGeneration] parseAssistantJSON failed:', e);
          }
        }
      } else if ((aiData as any).itinerary || (aiData as any).response?.data?.itinerary || (aiData as any).data?.itinerary) {
        serverToSave = {
          id: generationId,
          userId: auth.currentUser?.uid || null,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          destination: request.destination,
          startDate: request.startDate,
          endDate: request.endDate,
          lowerRange: 18,
          upperRange: 110,
          ai_status: "completed",
          userInfo: {
            username: userProfile?.username || 'Anonymous',
            gender: userProfile?.gender || 'Any',
            dob: userProfile?.dob || '',
            uid: auth.currentUser?.uid || '',
            email: userProfile?.email || auth.currentUser?.email || '',
            status: userProfile?.status || 'Any',
            sexualOrientation: userProfile?.sexualOrientation || 'Any',
            blocked: userProfile?.blocked || []
          },
          response: {
            success: true,
            data: {
              itinerary: (aiData as any).itinerary || (aiData as any).response?.data?.itinerary || aiData,
              metadata: (aiData as any).metadata || (aiData as any).response?.data?.metadata || { generationId },
              recommendations: (aiData as any).recommendations || (aiData as any).response?.data?.recommendations || { alternativeActivities, alternativeRestaurants }
            }
          }
        };
        const assistantText = (aiData as any).assistant || (aiData as any).response?.data?.assistant || (aiData as any).data?.assistant || null;
        if (assistantText && typeof assistantText === 'string') {
          try {
            const maybe = parseAssistantJSON(assistantText);
            if (maybe && maybe.transportation) parsedTransportation = maybe.transportation;
          } catch (e) {
            logger.warn('[useAIGeneration] parseAssistantJSON (itinerary) failed:', e);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[useAIGeneration] Server-side AI generation failed; aborting generation', e);
  }

  return { aiData, parsedTransportation, serverToSave };
}

export default parseAIServerResponse;

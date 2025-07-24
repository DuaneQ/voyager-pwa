// AI Generation types for the modal component
export interface AIGenerationRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: {
    total: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize?: number;
  tripType: 'leisure' | 'business' | 'adventure' | 'romantic' | 'family';
  preferenceProfileId: string;
  specialRequests?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
}

export interface AIGenerationResponse {
  id: string;
  request: AIGenerationRequest;
  itinerary?: any; // Will be defined later when backend is implemented
  recommendations?: {
    accommodations: any[];
    transportation: any[];
    activities: any[];
  };
  costBreakdown?: {
    total: number;
    perPerson: number;
    byCategory: Record<string, number>;
  };
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress?: {
    stage: number;
    totalStages: number;
    message: string;
  };
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface AIGenerationStage {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export const AI_GENERATION_STAGES: AIGenerationStage[] = [
  { id: 1, name: 'Analyzing Preferences', description: 'Processing your travel preferences and past behavior', completed: false, active: false },
  { id: 2, name: 'Finding Activities', description: 'Discovering the best activities and attractions', completed: false, active: false },
  { id: 3, name: 'Optimizing Schedule', description: 'Creating the perfect daily schedule', completed: false, active: false },
  { id: 4, name: 'Calculating Costs', description: 'Estimating costs and finding deals', completed: false, active: false },
  { id: 5, name: 'Finalizing Itinerary', description: 'Adding final touches and recommendations', completed: false, active: false },
];

export const TRIP_TYPES = [
  { value: 'leisure', label: 'Leisure', icon: '🏖️', description: 'Relaxed sightseeing and experiences' },
  { value: 'business', label: 'Business', icon: '💼', description: 'Work trips with some free time' },
  { value: 'adventure', label: 'Adventure', icon: '🏔️', description: 'Outdoor activities and exploration' },
  { value: 'romantic', label: 'Romantic', icon: '💕', description: 'Couples trips and romantic experiences' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Family-friendly activities and venues' },
] as const;

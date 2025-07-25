// AI Generation types for the modal component
export interface AIGenerationRequest {
  destination: string;
  departure?: string; // Added departure location for flight pricing
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
  // Flight preferences
  flightPreferences?: {
    class: 'economy' | 'premium-economy' | 'business' | 'first';
    stopPreference: 'non-stop' | 'one-stop' | 'any';
    preferredAirlines?: string[];
  };
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  location: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  estimatedCost: {
    amount: number;
    currency: string;
  };
  duration: number; // minutes
  rating?: number;
  bookingInfo?: {
    requiresReservation?: boolean;
    bookingUrl?: string;
    phone?: string;
    advanceBookingDays?: number;
  };
}

export interface AccommodationRecommendation {
  id: string;
  name: string;
  type: 'hotel' | 'hostel' | 'apartment' | 'bnb';
  location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  pricePerNight: {
    amount: number;
    currency: string;
  };
  rating: number;
  amenities: string[];
  website?: string;
  bookingUrl?: string;
  pros: string[];
  cons: string[];
}

export interface AIGenerationResponse {
  id: string;
  request: AIGenerationRequest;
  itinerary?: any; // Will be defined later when backend is implemented
  recommendations?: {
    flights?: any[]; // Flight options with pricing and details
    accommodations: AccommodationRecommendation[];
    transportation: any[];
    alternativeActivities: Activity[];
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
  { value: 'business', label: 'Business', icon: '💼', description: 'Professional travel with some leisure' },
  { value: 'adventure', label: 'Adventure', icon: '🏔️', description: 'Active and thrilling experiences' },
  { value: 'romantic', label: 'Romantic', icon: '💕', description: 'Intimate and romantic getaway' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Family-friendly activities and venues' },
];

export const FLIGHT_CLASSES = [
  { value: 'economy', label: 'Economy', icon: '💺', description: 'Standard comfort and pricing' },
  { value: 'premium-economy', label: 'Premium Economy', icon: '🪑', description: 'Extra legroom and amenities' },
  { value: 'business', label: 'Business', icon: '💼', description: 'Lie-flat seats and premium service' },
  { value: 'first', label: 'First Class', icon: '👑', description: 'Ultimate luxury and privacy' },
];

export const STOP_PREFERENCES = [
  { value: 'non-stop', label: 'Non-stop only', icon: '✈️', description: 'Direct flights only' },
  { value: 'one-stop', label: '1 stop max', icon: '🔄', description: 'Up to one connection' },
  { value: 'any', label: 'Any stops', icon: '🌐', description: 'Best price regardless of stops' },
];

export const POPULAR_AIRLINES = [
  // North American Airlines
  'American Airlines',
  'Delta Air Lines', 
  'United Airlines',
  'Southwest Airlines',
  'JetBlue Airways',
  'Alaska Airlines',
  'Air Canada',
  'WestJet',
  
  // European Airlines
  'Lufthansa',
  'British Airways',
  'Air France',
  'KLM Royal Dutch Airlines',
  'Swiss International Air Lines',
  'Austrian Airlines',
  'Iberia',
  'Alitalia',
  'SAS Scandinavian Airlines',
  'TAP Air Portugal',
  'Turkish Airlines',
  'Finnair',
  'LOT Polish Airlines',
  'Czech Airlines',
  'Brussels Airlines',
  'Aegean Airlines',
  'Air Serbia',
  'Croatia Airlines',
  'Aeroflot',
  'S7 Airlines',
  'Wizz Air',
  'Ryanair',
  'EasyJet',
  'Vueling',
  'Norwegian Air',
  
  // Middle Eastern Airlines
  'Emirates',
  'Qatar Airways',
  'Etihad Airways',
  'Saudi Arabian Airlines',
  'Royal Jordanian',
  'Middle East Airlines',
  'Kuwait Airways',
  'Oman Air',
  'Gulf Air',
  
  // Asian Airlines
  'Singapore Airlines',
  'Cathay Pacific',
  'Japan Airlines (JAL)',
  'All Nippon Airways (ANA)',
  'Korean Air',
  'Asiana Airlines',
  'China Southern Airlines',
  'China Eastern Airlines',
  'Air China',
  'Hainan Airlines',
  'Thai Airways',
  'Malaysia Airlines',
  'Garuda Indonesia',
  'Philippine Airlines',
  'Cebu Pacific',
  'Vietnam Airlines',
  'VietJet Air',
  'IndiGo',
  'Air India',
  'SpiceJet',
  'Jet Airways',
  'Sri Lankan Airlines',
  'Pakistan International Airlines',
  'Biman Bangladesh Airlines',
  
  // African Airlines
  'Ethiopian Airlines',
  'South African Airways',
  'Kenya Airways',
  'EgyptAir',
  'Royal Air Maroc',
  'Tunisair',
  'Air Algerie',
  'Cameroon Airlines',
  'Air Mauritius',
  'Air Seychelles',
  'RwandAir',
  'TAAG Angola Airlines',
  'Cabo Verde Airlines',
  'Air Madagascar',
  'Air Zimbabwe',
  'Fastjet',
  
  // Oceania Airlines
  'Qantas',
  'Virgin Australia',
  'Jetstar Airways',
  'Air New Zealand',
  'Fiji Airways',
  'Solomon Airlines',
  'Air Vanuatu',
  
  // Latin American Airlines
  'LATAM Airlines',
  'Avianca',
  'Copa Airlines',
  'Aeroméxico',
  'Volaris',
  'Interjet',
  'GOL Linhas Aéreas',
  'Azul Brazilian Airlines',
  'TAM Airlines',
  'Aerolíneas Argentinas',
  'Sky Airline',
  'JetSMART',
  'Viva Air',
  'Spirit Airlines',
];

// AI Generation types for the modal component
export interface AIGenerationRequest {
  destination: string;
  destinationAirportCode?: string; // IATA code for destination airport
  departure?: string; // Added departure location for flight pricing
  departureAirportCode?: string; // IATA code for departure airport
  startDate: string;
  endDate: string;
  budget?: {
    total: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize?: number;
  tripType: 'leisure' | 'business' | 'adventure' | 'romantic' | 'family' | 'bachelor' | 'bachelorette';
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
  
  // User data passed from frontend to avoid unnecessary Firestore reads
  userInfo?: {
    uid: string;
    username: string;
    gender: string;
    dob: string;
    status: string;
    sexualOrientation: string;
    email: string;
    blocked: string[];
  };
  travelPreferences?: any; // Travel preference profile passed from frontend
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
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Family-friendly activities and venues.  Amusement parks and kid friendly events.' },
  { value: 'bachelor', label: 'Bachelor Party', icon: '🎉', description: 'Bachelor party, group celebration, nightlife and fun' },
  { value: 'bachelorette', label: 'Bachelorette Party', icon: '👰‍♀️', description: 'Bachelorette party, group celebration, pampering and fun' },
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
  'Aegean Airlines',
  'Aeroflot',
  'Aerolíneas Argentinas',
  'Aeroméxico',
  'Air Algerie',
  'Air Canada',
  'Air China',
  'Air France',
  'Air India',
  'Air Madagascar',
  'Air Mauritius',
  'Air New Zealand',
  'Air Serbia',
  'Air Seychelles',
  'Air Vanuatu',
  'Air Zimbabwe',
  'Alaska Airlines',
  'Alitalia',
  'All Nippon Airways (ANA)',
  'American Airlines',
  'Asiana Airlines',
  'Austrian Airlines',
  'Avianca',
  'Azul Brazilian Airlines',
  'Biman Bangladesh Airlines',
  'British Airways',
  'Brussels Airlines',
  'Cabo Verde Airlines',
  'Cameroon Airlines',
  'Cathay Pacific',
  'Cebu Pacific',
  'China Eastern Airlines',
  'China Southern Airlines',
  'Copa Airlines',
  'Croatia Airlines',
  'Czech Airlines',
  'Delta Air Lines',
  'EasyJet',
  'EgyptAir',
  'Emirates',
  'Ethiopian Airlines',
  'Etihad Airways',
  'Fastjet',
  'Fiji Airways',
  'Finnair',
  'Garuda Indonesia',
  'GOL Linhas Aéreas',
  'Gulf Air',
  'Hainan Airlines',
  'Iberia',
  'IndiGo',
  'Interjet',
  'Japan Airlines (JAL)',
  'Jet Airways',
  'JetBlue Airways',
  'Jetstar Airways',
  'JetSMART',
  'Kenya Airways',
  'KLM Royal Dutch Airlines',
  'Korean Air',
  'Kuwait Airways',
  'LATAM Airlines',
  'LOT Polish Airlines',
  'Lufthansa',
  'Malaysia Airlines',
  'Middle East Airlines',
  'Norwegian Air',
  'Oman Air',
  'Pakistan International Airlines',
  'Philippine Airlines',
  'Qantas',
  'Qatar Airways',
  'Royal Air Maroc',
  'Royal Jordanian',
  'RwandAir',
  'Ryanair',
  'S7 Airlines',
  'SAS Scandinavian Airlines',
  'Saudi Arabian Airlines',
  'Singapore Airlines',
  'Sky Airline',
  'Solomon Airlines',
  'South African Airways',
  'Southwest Airlines',
  'SpiceJet',
  'Spirit Airlines',
  'Sri Lankan Airlines',
  'Swiss International Air Lines',
  'TAAG Angola Airlines',
  'TAM Airlines',
  'TAP Air Portugal',
  'Thai Airways',
  'Tunisair',
  'Turkish Airlines',
  'United Airlines',
  'Vietnam Airlines',
  'VietJet Air',
  'Virgin Australia',
  'Viva Air',
  'Volaris',
  'Vueling',
  'WestJet',
  'Wizz Air',
];

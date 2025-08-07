// Airport-related types and interfaces

export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distance?: number; // Distance from search location in km
  isInternational: boolean;
}

export interface AirportSearchResult {
  airports: Airport[];
  searchLocation: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

/**
 * Airline name to IATA code mapping utility
 * Follows Single Responsibility Principle - only handles airline code conversions
 */

export interface AirlineMapping {
  name: string;
  iataCode: string;
}

// Mapping of full airline names to their 2-character IATA codes
// Based on the POPULAR_AIRLINES list in AIGeneration.ts
export const AIRLINE_NAME_TO_IATA: Record<string, string> = {
  'Aegean Airlines': 'A3',
  'Aeroflot': 'SU',
  'Aerolíneas Argentinas': 'AR',
  'Aeroméxico': 'AM',
  'Air Algerie': 'AH',
  'Air Canada': 'AC',
  'Air China': 'CA',
  'Air France': 'AF',
  'Air India': 'AI',
  'Air Madagascar': 'MD',
  'Air Mauritius': 'MK',
  'Air New Zealand': 'NZ',
  'Air Serbia': 'JU',
  'Air Seychelles': 'HM',
  'Air Vanuatu': 'NF',
  'Air Zimbabwe': 'UM',
  'Alaska Airlines': 'AS',
  'Alitalia': 'AZ',
  'All Nippon Airways (ANA)': 'NH',
  'American Airlines': 'AA',
  'Asiana Airlines': 'OZ',
  'Austrian Airlines': 'OS',
  'Avianca': 'AV',
  'Azul Brazilian Airlines': 'AD',
  'Biman Bangladesh Airlines': 'BG',
  'British Airways': 'BA',
  'Brussels Airlines': 'SN',
  'Cabo Verde Airlines': 'VR',
  'Cameroon Airlines': 'UY',
  'Cathay Pacific': 'CX',
  'Cebu Pacific': '5J',
  'China Eastern Airlines': 'MU',
  'China Southern Airlines': 'CZ',
  'Copa Airlines': 'CM',
  'Croatia Airlines': 'OU',
  'Czech Airlines': 'OK',
  'Delta Air Lines': 'DL',
  'EasyJet': 'U2',
  'EgyptAir': 'MS',
  'Emirates': 'EK',
  'Ethiopian Airlines': 'ET',
  'Etihad Airways': 'EY',
  'Fastjet': 'FN',
  'Fiji Airways': 'FJ',
  'Finnair': 'AY',
  'Garuda Indonesia': 'GA',
  'GOL Linhas Aéreas': 'G3',
  'Gulf Air': 'GF',
  'Hainan Airlines': 'HU',
  'Iberia': 'IB',
  'IndiGo': '6E',
  'Interjet': '4O',
  'Japan Airlines (JAL)': 'JL',
  'Jet Airways': '9W',
  'JetBlue Airways': 'B6',
  'Jetstar Airways': 'JQ',
  'JetSMART': 'JA',
  'Kenya Airways': 'KQ',
  'KLM Royal Dutch Airlines': 'KL',
  'Korean Air': 'KE',
  'Kuwait Airways': 'KU',
  'LATAM Airlines': 'LA',
  'LOT Polish Airlines': 'LO',
  'Lufthansa': 'LH',
  'Malaysia Airlines': 'MH',
  'Middle East Airlines': 'ME',
  'Norwegian Air': 'DY',
  'Oman Air': 'WY',
  'Pakistan International Airlines': 'PK',
  'Philippine Airlines': 'PR',
  'Qantas': 'QF',
  'Qatar Airways': 'QR',
  'Royal Air Maroc': 'AT',
  'Royal Jordanian': 'RJ',
  'RwandAir': 'WB',
  'Ryanair': 'FR',
  'S7 Airlines': 'S7',
  'SAS Scandinavian Airlines': 'SK',
  'Saudi Arabian Airlines': 'SV',
  'Singapore Airlines': 'SQ',
  'Sky Airline': 'H2',
  'Solomon Airlines': 'IE',
  'South African Airways': 'SA',
  'Southwest Airlines': 'WN',
  'SpiceJet': 'SG',
  'Spirit Airlines': 'NK',
  'Sri Lankan Airlines': 'UL',
  'Swiss International Air Lines': 'LX',
  'TAAG Angola Airlines': 'DT',
  'TAM Airlines': 'JJ',
  'TAP Air Portugal': 'TP',
  'Thai Airways': 'TG',
  'Tunisair': 'TU',
  'Turkish Airlines': 'TK',
  'United Airlines': 'UA',
  'Vietnam Airlines': 'VN',
  'VietJet Air': 'VJ',
  'Virgin Australia': 'VA',
  'Viva Air': 'VV',
  'Volaris': 'Y4',
  'Vueling': 'VY',
  'WestJet': 'WS',
  'Wizz Air': 'W6',
};

/**
 * Converts airline name(s) to IATA code(s)
 * Follows Open/Closed Principle - can be extended without modification
 */
export class AirlineCodeConverter {
  /**
   * Convert a single airline name to IATA code
   * @param airlineName Full airline name
   * @returns IATA code or null if not found
   */
  static convertNameToCode(airlineName: string): string | null {
    return AIRLINE_NAME_TO_IATA[airlineName] || null;
  }

  /**
   * Convert array of airline names to array of IATA codes
   * Filters out any names that don't have valid IATA codes
   * @param airlineNames Array of full airline names
   * @returns Array of valid IATA codes
   */
  static convertNamesToCodes(airlineNames: string[]): string[] {
    return airlineNames
      .map(name => this.convertNameToCode(name))
      .filter((code): code is string => code !== null);
  }

  /**
   * Check if an airline name has a valid IATA code mapping
   * @param airlineName Full airline name
   * @returns true if mapping exists
   */
  static hasValidMapping(airlineName: string): boolean {
    return airlineName in AIRLINE_NAME_TO_IATA;
  }

  /**
   * Get all available airline names
   * @returns Array of airline names that have IATA code mappings
   */
  static getAvailableAirlineNames(): string[] {
    return Object.keys(AIRLINE_NAME_TO_IATA);
  }
}

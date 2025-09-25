import { formatDurationMinutes, mapItineraryToFlight } from '../searchFlights';

describe('searchFlights helpers', () => {
  test('formatDurationMinutes handles numbers and strings', () => {
    expect(formatDurationMinutes(90)).toBe('1h 30m');
    expect(formatDurationMinutes('45')).toBe('45m');
    expect(formatDurationMinutes(undefined)).toBe('');
  });

  test('mapItineraryToFlight maps a simple itinerary', () => {
    const item = {
      id: 'it1',
      price: { total: '200', currency: 'USD' },
      itineraries: [
        {
          duration: '2h 30m',
          segments: [
            {
              carrierCode: 'AA',
              number: '100',
              departure: { at: '2025-10-01T08:00:00', iataCode: 'JFK' },
              arrival: { at: '2025-10-01T10:30:00', iataCode: 'LAX' }
            },
            {
              departure: { iataCode: 'JFK' },
              arrival: { iataCode: 'LAX' }
            }
          ]
        }
      ],
      travelerPricings: [{ fareDetailsBySegment: [{ cabin: 'ECONOMY' }] }]
    } as any;

    const f = mapItineraryToFlight(item);
    expect(f).not.toBeNull();
    if (f) {
      expect(f.id).toBe('it1');
      expect(f.price.amount).toBe(200);
      expect(f.departure.iata).toBe('JFK');
      expect(f.duration).toBe('2h 30m');
    }
  });

  test('mapItineraryToFlight returns null for missing outbound', () => {
    const item = { id: 'bad' } as any;
    expect(mapItineraryToFlight(item)).toBeNull();
  });
});

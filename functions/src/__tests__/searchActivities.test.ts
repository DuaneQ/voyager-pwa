import { mapPlaceToActivity } from '../searchActivities';

describe('searchActivities.mapPlaceToActivity', () => {
  it('maps a full place object to activity shape', () => {
    const place = {
      place_id: 'p1',
      name: 'Test Place',
      types: ['tourist_attraction', 'point_of_interest'],
      description: 'A lovely test attraction',
      vicinity: '123 Test St',
      formatted_address: '123 Test St, Testville',
      geometry: { location: { lat: 12.34, lng: 56.78 } },
      rating: 4.5,
      user_ratings_total: 150
    } as any;

    const activity = mapPlaceToActivity(place);
    expect(activity).not.toBeNull();
    expect(activity.id).toBe('p1');
    expect(activity.placeId).toBe('p1');
    expect(activity.name).toBe('Test Place');
    expect(activity.category).toBe('tourist_attraction');
    expect(activity.location.coordinates.lat).toBe(12.34);
    expect(activity.location.coordinates.lng).toBe(56.78);
    expect(activity.rating).toBe(4.5);
    expect(activity.userRatingsTotal).toBe(150);
  });

  it('handles missing optional fields gracefully', () => {
    const place = {
      place_id: 'p2',
      name: 'Partial Place'
    } as any;

    const activity = mapPlaceToActivity(place);
    expect(activity).not.toBeNull();
    expect(activity.placeId).toBe('p2');
    expect(activity.name).toBe('Partial Place');
    expect(activity.category).toBe('attraction');
    expect(activity.location.address).toBe('');
  });
});

export function shouldIncludeFlights(preferenceProfile?: any, request?: any): boolean {
  // Canonical check: explicit boolean on the profile
  if (preferenceProfile?.transportation?.includeFlights === true) return true;

  // Request-level override
  if (request?.includeFlights === true) return true;

  // Default: do not include flights for now; this is a new-feature-only flag.
  return false;
}

export default shouldIncludeFlights;

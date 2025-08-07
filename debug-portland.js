// Debug script to test Portland, ME airport lookup
const query = 'airports near Portland, ME, USA';
const normalizedQuery = query.toLowerCase().replace(/[,\s]+/g, ' ').trim();

console.log('Testing Portland, ME airport lookup');
console.log('Original query:', query);
console.log('Normalized query:', normalizedQuery);

// Simulate the airport database lookup logic
const airportKeys = [
  'portland',
  'portland or',
  'portland or usa', 
  'portland oregon',
  'portland oregon usa',
  'portland me',
  'portland me usa',
  'portland maine',
  'portland maine usa'
];

console.log('\nTesting exact match:');
console.log('airportDatabase[normalizedQuery]:', airportKeys.includes(normalizedQuery));

console.log('\nTesting substring matches with length prioritization:');
let bestMatch = '';
let bestKey = '';

for (const key of airportKeys) {
  const match1 = normalizedQuery.includes(key);
  const match2 = key.includes(normalizedQuery);
  const matches = match1 || match2;
  
  console.log(`Key '${key}' (length ${key.length}): matches=${matches}`);
  
  if (matches && key.length > bestMatch.length) {
    bestMatch = key;
    bestKey = key;
    console.log(`  -> New best match: '${bestKey}' (length ${key.length})`);
  }
}

console.log(`\nFinal best match: '${bestKey}' (length ${bestMatch.length})`);
console.log('This should be a Portland ME key, not Portland OR!');

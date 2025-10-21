#!/bin/bash
# Quick test to verify searchItineraries is working with age field

echo "🧪 Testing searchItineraries function with age field..."
echo ""
echo "Calling deployed function in mundo1-dev..."
echo ""

# Test with Joy's actual criteria
curl -X POST \
  "https://us-central1-mundo1-dev.cloudfunctions.net/searchItineraries" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "destination": "Miami, FL, USA",
      "gender": "Female",
      "status": "couple",
      "sexualOrientation": "No Preference",
      "minStartDay": 1731283200000,
      "lowerRange": 18,
      "upperRange": 100,
      "excludedIds": ["test-viewed-1", "test-viewed-2", "test-viewed-3"],
      "pageSize": 15
    }
  }' 2>&1 | head -100

echo ""
echo ""
echo "✅ If you see a valid response above (not an error about 'age' field), the deployment worked!"
echo "Expected: 12 matching itineraries from test data"

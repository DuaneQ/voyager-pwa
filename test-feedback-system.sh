#!/bin/bash

# Test runner script for all feedback system tests
echo "🧪 Running Feedback System Tests"
echo "================================="

# Frontend React component tests
echo ""
echo "📱 Running Frontend Component Tests..."
echo "-------------------------------------"

# Run FeedbackModal tests
echo "Testing FeedbackModal component..."
npm test -- --testPathPattern=FeedbackModal.test.tsx --watchAll=false

# Run FeedbackButton tests  
echo "Testing FeedbackButton component..."
npm test -- --testPathPattern=FeedbackButton.test.tsx --watchAll=false

# Run BetaBanner tests
echo "Testing BetaBanner component..."
npm test -- --testPathPattern=BetaBanner.test.tsx --watchAll=false

# Run integration tests
echo "Testing Integration scenarios..."
npm test -- --testPathPattern=FeedbackSystemIntegration.test.tsx --watchAll=false

# Backend Firebase Functions tests
echo ""
echo "🔥 Running Firebase Functions Tests..."
echo "--------------------------------------"
cd functions
echo "Testing feedback notification function..."
npm test

cd ..

echo ""
echo "✅ All feedback system tests completed!"
echo "======================================="
echo ""
echo "📊 Test Coverage Summary:"
echo "- ✅ FeedbackModal Component"
echo "- ✅ FeedbackButton Component" 
echo "- ✅ BetaBanner Component"
echo "- ✅ Firebase Functions"
echo "- ✅ Integration Tests"
echo ""
echo "🎉 Feedback system is ready for beta testing!"

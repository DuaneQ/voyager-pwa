#!/usr/bin/env node

/**
 * Script to trigger email campaigns for TravalPass
 * 
 * Usage:
 *   node run-email-campaign.js new-features-2025                    # Send to all users
 *   node run-email-campaign.js new-features-2025 test@example.com   # Test mode
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFunctions } = require('firebase-admin/functions');

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
  projectId: 'mundo1-1' // Your project ID
});

const functions = getFunctions();

async function runEmailCampaign() {
  const campaignId = process.argv[2];
  const testEmail = process.argv[3];

  if (!campaignId) {
    console.error('❌ Campaign ID is required');
    process.exit(1);
  }

  
  if (testEmail) {
  } else {    
    // Confirmation prompt for production
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Are you sure you want to proceed? (type "yes" to confirm): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      process.exit(0);
    }
  }

  try {
    // Call the Cloud Function
    const result = await functions.httpsCallable('sendEmailCampaign')({
      campaignId,
      testEmail
    });
    
  } catch (error) {
    console.error('❌ Campaign failed:', error.message);
    process.exit(1);
  }
}

runEmailCampaign();
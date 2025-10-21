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
    console.log('Usage: node run-email-campaign.js <campaignId> [testEmail]');
    console.log('Available campaigns: new-features-2025');
    process.exit(1);
  }

  console.log(`🚀 Starting email campaign: ${campaignId}`);
  
  if (testEmail) {
    console.log(`📧 Test mode - sending only to: ${testEmail}`);
  } else {
    console.log('📧 Production mode - sending to all users');
    console.log('⚠️  This will send emails to ALL users in the database!');
    
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
      console.log('❌ Campaign cancelled');
      process.exit(0);
    }
  }

  try {
    // Call the Cloud Function
    const result = await functions.httpsCallable('sendEmailCampaign')({
      campaignId,
      testEmail
    });

    console.log('✅ Campaign completed successfully!');
    console.log('📊 Results:', result.data);
    
  } catch (error) {
    console.error('❌ Campaign failed:', error.message);
    process.exit(1);
  }
}

runEmailCampaign();
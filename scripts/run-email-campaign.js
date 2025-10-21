#!/usr/bin/env node

/**
 * Email Campaign Runner
 * 
 * Usage:
 *   node run-email-campaign.js <campaignId> [testEmail]
 * 
 * Examples:
 *   node run-email-campaign.js new-features-2025                    # Send to all users
 *   node run-email-campaign.js new-features-2025 test@example.com  # Send to test email only
 */

const { initializeApp } = require('firebase/app');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

// Firebase config for production environment
const firebaseConfig = {
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  projectId: "mundo1-1",
  storageBucket: "mundo1-1.appspot.com",
  messagingSenderId: "533074391000",
  appId: "1:533074391000:web:2ef7404546e97f4aa2ccad"
};

async function runEmailCampaign() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node run-email-campaign.js <campaignId> [testEmail]');
    console.error('');
    console.error('Examples:');
    console.error('  node run-email-campaign.js new-features-2025');
    console.error('  node run-email-campaign.js new-features-2025 test@example.com');
    process.exit(1);
  }

  const campaignId = args[0];
  const testEmail = args[1];

  console.log('🚀 Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const functions = getFunctions(app);

  // Check if we're running against local emulator (optional)
  if (process.env.FIREBASE_EMULATOR_HUB) {
    console.log('🔧 Connecting to Functions emulator...');
    connectFunctionsEmulator(functions, 'localhost', 5001);
  }

  console.log(`📧 Running email campaign: ${campaignId}`);
  if (testEmail) {
    console.log(`🎯 Test mode: sending only to ${testEmail}`);
  } else {
    console.log('📬 Production mode: sending to all eligible users');
  }

  try {
    const sendEmailCampaign = httpsCallable(functions, 'sendEmailCampaign');
    
    const result = await sendEmailCampaign({
      campaignId,
      testEmail
    });

    console.log('✅ Campaign completed successfully!');
    console.log('📊 Results:', result.data);
    
    if (result.data.success) {
      console.log(`📧 Emails sent: ${result.data.emailsSent}`);
      console.log(`👥 Users processed: ${result.data.usersProcessed}`);
      if (result.data.errors && result.data.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.data.errors.length}`);
        result.data.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Campaign failed:', error.message);
    if (error.details) {
      console.error('📋 Details:', error.details);
    }
    process.exit(1);
  }
}

// Run the campaign
runEmailCampaign().catch(console.error);
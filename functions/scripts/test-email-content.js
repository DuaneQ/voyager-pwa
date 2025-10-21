#!/usr/bin/env node

/**
 * Local test script for email campaign content
 * Tests the email generation without sending emails
 */

// Simulate the campaign function locally
function createCampaignEmailContent(userEmail, campaignId, username) {
  const campaigns = {
    "new-features-2025": {
      subject: "Thank you for being one of the first travelers on TravalPass ✈️",
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">TravalPass</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Find Travel Companions</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #1976d2; margin: 0 0 20px 0; font-size: 24px;">Hi ${username}! 👋</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for being one of the very first travelers to join TravalPass! Your early support means the world to me.
            </p>

            <!-- Sample content truncated for brevity -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://travalpass.com/share-itinerary/gen_1759794137253_r16fdynnc" 
                 style="display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                🗺️ View Sample AI Itinerary
              </a>
            </div>

            <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
              <h4 style="color: #1976d2; margin: 0 0 10px 0; font-size: 18px;">📹 Quick Tutorial</h4>
              <a href="https://youtube.com/shorts/hyRvN9cHtRM?feature=share" 
                 style="display: inline-block; background: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                ▶️ Watch the Tutorial
              </a>
            </div>

            <p style="color: #1976d2; font-size: 16px; font-weight: 500; margin: 20px 0 0 0;">
              – Duane, Founder of TravalPass ✈️
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              <a href="https://travalpass.com" style="color: #1976d2; text-decoration: none;">TravalPass.com</a> | 
              Find Travel Companions | © 2025 TravalPass
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi ${username}!

Thank you for being one of the very first travelers to join TravalPass!

🤖 AI ITINERARY GENERATION
- Set your Travel Preference Profile on your profile page
- Generate personalized daily itineraries for your entire trip  

View sample: https://travalpass.com/share-itinerary/gen_1759794137253_r16fdynnc
Tutorial: https://youtube.com/shorts/hyRvN9cHtRM?feature=share

– Duane, Founder of TravalPass ✈️
      `
    }
  };

  return campaigns[campaignId];
}

// Test the email content
console.log('🧪 Testing Email Campaign Content\n');

const testEmail = process.argv[2] || 'test@example.com';
const campaignId = 'new-features-2025';
const username = 'Test User';

const emailContent = createCampaignEmailContent(testEmail, campaignId, username);

if (emailContent) {
  console.log('✅ Campaign found:', campaignId);
  console.log('📧 Test email:', testEmail);
  console.log('👤 Username:', username);
  console.log('\n📝 Subject:', emailContent.subject);
  console.log('\n📱 Text Content Preview:');
  console.log(emailContent.textContent.substring(0, 200) + '...');
  console.log('\n🌐 HTML Content Length:', emailContent.htmlContent.length, 'characters');
  console.log('\n✨ Email content generated successfully!');
  console.log('\n🚀 To send actual emails, deploy the function and use:');
  console.log(`   firebase deploy --only functions:sendEmailCampaign`);
  console.log(`   node run-email-campaign.js ${campaignId} ${testEmail}`);
} else {
  console.error('❌ Campaign not found:', campaignId);
}
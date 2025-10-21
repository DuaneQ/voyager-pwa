# Email Campaign System

This system allows you to send email campaigns to TravalPass users using Firebase Cloud Functions and SendGrid.

## Features

- ✅ Send to all users or test with a single email
- ✅ Automatic duplicate prevention (tracks which users received each campaign)
- ✅ Beautiful HTML email template with TravalPass branding
- ✅ Campaign tracking in user documents
- ✅ Easy to modify for different campaigns

## Quick Start

### 1. Deploy the Function
```bash
cd functions
npm run deploy
# Or deploy just the email function:
firebase deploy --only functions:sendEmailCampaign
```

### 2. Test the Campaign
```bash
cd functions/scripts
node run-email-campaign.js new-features-2025 your-email@example.com
```

### 3. Send to All Users
```bash
cd functions/scripts
node run-email-campaign.js new-features-2025
# Will ask for confirmation before sending
```

## Campaign Management

### Current Campaigns
- `new-features-2025`: Welcome back email highlighting AI itinerary generation

### Adding New Campaigns

1. Edit `functions/src/index.ts`
2. Add your campaign to the `campaigns` object in `createCampaignEmailContent()`
3. Include subject, htmlContent, and textContent
4. Deploy the updated function

Example:
```typescript
const campaigns = {
  "new-features-2025": { /* existing campaign */ },
  "holiday-special-2025": {
    subject: "🎄 Holiday Travel Deals on TravalPass",
    htmlContent: `<!-- Your HTML content -->`,
    textContent: `Your plain text content`
  }
};
```

## Email Tracking

Each campaign tracks participation in the user document:
```javascript
{
  emailCampaigns: {
    "new-features-2025": {
      sentAt: "2025-01-15T10:30:00Z",
      campaignId: "new-features-2025"
    }
  }
}
```

## Template Variables

The email template supports these variables:
- `${username}` - User's display name (falls back to "Traveler")
- `${campaignId}` - The campaign identifier
- Custom variables can be added by modifying the `createCampaignEmailContent()` function

## Current Template Features

The "new-features-2025" campaign includes:
- ✈️ TravalPass branding and colors
- 🤖 AI Itinerary Generation feature highlight
- 📹 YouTube tutorial placeholder (update the link when ready)
- 🗺️ Sample itinerary link: https://travalpass.com/share-itinerary/gen_1759794137253_r16fdynnc
- 📧 Feedback email and floating button mention
- 🚀 Call-to-action to set up travel profile
- 📱 Mobile-responsive design

## Testing

Always test campaigns before sending to all users:
```bash
# Test with your email
node run-email-campaign.js new-features-2025 duane@travalpass.com

# Test with a colleague's email  
node run-email-campaign.js new-features-2025 team@travalpass.com
```

## Monitoring

Check the Firebase Console for:
- Function execution logs
- SendGrid mail collection documents
- User document updates for campaign tracking

## Security

- Uses Firebase Admin SDK with service account credentials
- Requires confirmation for production sends
- Prevents duplicate sends automatically
- All emails go through SendGrid (configured in your Firebase mail collection)

## Troubleshooting

**Function not found**: Make sure you've deployed the function
**Permission denied**: Ensure your Firebase Admin credentials are configured
**No emails sent**: Check that users have email addresses in their profiles
**Duplicate prevention**: Users who already received a campaign will be skipped

## Updating YouTube Link

When your tutorial video is ready, replace `[YOUTUBE_TUTORIAL_LINK_PLACEHOLDER]` in the campaign template with your actual YouTube URL.
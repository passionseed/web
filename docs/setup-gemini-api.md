# Setting Up Google Gemini API for Expert Interview

This guide walks you through setting up Google Gemini API access for the PassionSeed expert-interview feature.

## Overview

The expert-interview feature uses **Google Gemini 2.5 Flash** for:
- Real-time interview conversation flow management
- Career data extraction and PathLab curriculum generation
- Intelligent follow-up question generation

## Prerequisites

- Google Cloud account
- Credit card (for billing, though there's a generous free tier)
- Access to Google AI Studio or Google Cloud Console

## Setup Steps

### Option 1: Google AI Studio (Recommended - Fastest Setup)

1. **Go to Google AI Studio**
   - Visit: https://aistudio.google.com/
   - Sign in with your Google account

2. **Get API Key**
   - Click "Get API key" in the top navigation
   - Click "Create API key in new project" (or select existing project)
   - Copy the generated API key (starts with `AIza...`)

3. **Add to Your Environment**
   ```bash
   # In your .env.local file
   GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your-key-here...
   ```

4. **That's it!** Google AI Studio keys come with:
   - Free tier: 15 requests per minute (RPM)
   - 1 million requests per day
   - No credit card required initially

### Option 2: Google Cloud Console (For Production)

1. **Create or Select a Project**
   - Go to: https://console.cloud.google.com/
   - Create a new project or select existing one
   - Note your Project ID

2. **Enable Gemini API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Generative Language API"
   - Click "Enable"

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key
   - (Optional) Click "Restrict Key" to limit usage

4. **Set Up Billing** (for production scale)
   - Go to "Billing" in Cloud Console
   - Link a billing account
   - Set up budget alerts (recommended)

5. **Add to Environment**
   ```bash
   # In your .env.local file
   GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your-key-here...
   ```

## API Key Security

### Restrict Your API Key (Recommended)

1. In Google Cloud Console > Credentials
2. Click on your API key
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "Generative Language API"
4. Under "Application restrictions":
   - For development: "None"
   - For production: "HTTP referrers" or "IP addresses"

### Environment Variables

**Never commit API keys to Git!** Your `.env.local` file is already in `.gitignore`.

```bash
# .env.local (already exists in your project)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your-key-here...
```

## Pricing & Free Tier

### Free Tier (Google AI Studio)
- **Gemini 2.5 Flash**: 15 requests/minute, 1M requests/day
- **Perfect for**: Development, testing, small-scale apps
- **No credit card required**

### Paid Tier Pricing (as of March 2024)
- **Gemini 2.5 Flash**:
  - Input: $0.075 per 1M tokens
  - Output: $0.30 per 1M tokens
- **Extremely affordable**: ~$0.0004 per interview (8 questions)

### Cost Estimation
For expert-interview feature:
- Average interview: 8 questions + data extraction
- ~10 API calls per interview
- ~2,000 tokens total (input + output)
- **Cost per interview: ~$0.0007** (less than 0.1 cent)
- **1,000 interviews: ~$0.70**

## Rate Limits

### Free Tier
- 15 requests per minute (RPM)
- 1 million requests per day
- 4 million tokens per minute

### Paid Tier
- 2,000 RPM
- No daily limit
- 4 million tokens per minute

## Verification

### Test Your API Key

Run this command to verify your setup:

```bash
curl \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello, Gemini!"}]}]}' \
  -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY"
```

Expected response: JSON with generated text.

### Test in Your App

1. Ensure dev server is running: `pnpm dev`
2. Visit: http://localhost:3000/expert-interview
3. Click "Start the interview"
4. Type an answer to the first question
5. Check server logs for successful API calls:
   ```
   [expert-interview/session] Session created: ...
   ```

## Troubleshooting

### Error: "API key not valid"
- Check that key is copied correctly (no extra spaces)
- Verify key is enabled in Google Cloud Console
- Ensure Generative Language API is enabled

### Error: "Quota exceeded"
- You've hit the free tier rate limit (15 RPM)
- Wait 1 minute or upgrade to paid tier
- Check quota usage: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

### Error: "Permission denied"
- API key may be restricted to specific APIs
- Go to Credentials > Edit API key > Remove restrictions

## Alternative Models

The app supports multiple AI providers. To switch models, edit:

**File**: `lib/expert-interview/chat-service.ts`

```typescript
// Line 327 & 371
model: getModel("gemini-2.5-flash")  // Current

// Alternatives:
model: getModel("gemini-3-flash-preview")  // Google Gemini 3
model: getModel("claude-haiku-4-5")        // Anthropic Claude (requires ANTHROPIC_API_KEY)
model: getModel("gpt-5-mini-2025-08-07")   // OpenAI GPT-5 (requires OPENAI_API_KEY)
```

## Production Checklist

- [ ] Get API key from Google AI Studio or Cloud Console
- [ ] Add key to `.env.local` (development) and deployment environment variables (production)
- [ ] Restrict API key to Generative Language API only
- [ ] Set up billing alerts in Google Cloud Console
- [ ] Monitor usage: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/metrics
- [ ] Test interview flow end-to-end
- [ ] Set up error logging for API failures

## Resources

- **Google AI Studio**: https://aistudio.google.com/
- **Gemini API Docs**: https://ai.google.dev/docs
- **Pricing**: https://ai.google.dev/pricing
- **Cloud Console**: https://console.cloud.google.com/
- **API Quotas**: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

## Support

For issues with:
- **API setup**: Check Google AI documentation or Cloud Console
- **PassionSeed integration**: Check `/lib/expert-interview/chat-service.ts`
- **Environment variables**: Check `.env.local` and restart dev server

---

**Last Updated**: March 2026
**Feature**: Expert Interview
**Model**: Google Gemini 2.5 Flash

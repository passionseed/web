# Discord Bot Setup for Mentor Notifications

This guide explains how to set up the Discord bot for sending mentor session notifications.

## Prerequisites

You have:
- Discord Bot Client ID: `1447582299779764406`
- Discord Bot Secret: `t4a-0c52siSjpnDAUPVd8qggEwXtj1JM`

## Step 1: Configure Bot Intents

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (ID: `1447582299779764406`)
3. Go to **Bot** section
4. Enable these **Privileged Gateway Intents**:
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
5. Click **Save Changes**

## Step 2: Add Bot to Your Server

1. Go to **OAuth2 > URL Generator**
2. Select scopes:
   - ✅ `bot`
3. Select permissions:
   - ✅ Send Messages
   - ✅ Read Message History
4. Copy the generated URL and open it in your browser
5. Select your Discord server and authorize

## Step 3: Configure Environment Variables

Add the Discord bot token to your `.env.local` file:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=t4a-0c52siSjpnDAUPVd8qggEwXtj1JM
```

**IMPORTANT**: Never commit the `.env.local` file to git!

## Step 4: Configure Mentor Discord User IDs

Mentors need to add their Discord User ID to their profile:

1. Enable Discord Developer Mode:
   - Open Discord Settings
   - Go to **Advanced**
   - Enable **Developer Mode**

2. Get your Discord User ID:
   - Right-click on your username
   - Click **Copy User ID**
   - Example: `123456789012345678`

3. Add to profile:
   - Go to your profile page in the app
   - Enter your Discord User ID in the "Discord User ID (UID)" field
   - Save

## How It Works

1. **Student schedules a mentor session**
   - Opens seed room
   - Clicks "Call Mentor" button
   - Selects date and time
   - Submits

2. **System creates session record**
   - Saves to `mentor_sessions` table
   - Status: `pending`

3. **Discord notification sent**
   - Bot looks up mentor's Discord UID
   - Sends DM to mentor with session details:
     - Student name and email
     - Seed title and room code
     - Scheduled date and time

4. **Mentor receives DM**
   - Can confirm or reschedule

## Testing

To test the Discord bot:

1. Make sure a mentor is assigned to the room
2. Make sure the mentor has their Discord UID in their profile
3. Make sure the bot is in the same Discord server as the mentor
4. Schedule a mentor session from a student account
5. Check the mentor's Discord DMs

## Troubleshooting

### Bot not sending DMs

- ✅ Check that `DISCORD_BOT_TOKEN` is set in `.env.local`
- ✅ Verify bot has correct intents enabled
- ✅ Ensure bot and mentor share at least one Discord server
- ✅ Check that mentor's Discord UID is correct in their profile
- ✅ Check server logs for error messages

### "Cannot send messages to this user"

This error means:
- The user has DMs disabled for server members
- The bot and user don't share a server
- The user has blocked the bot

Ask the mentor to:
1. Enable DMs from server members
2. Make sure they're in the same server as the bot

## API Endpoint

**POST** `/api/mentor-sessions/schedule`

Request body:
```json
{
  "roomId": "uuid",
  "scheduledDate": "2025-12-09",
  "scheduledTime": "14:30"
}
```

Response:
```json
{
  "success": true,
  "session": { ... },
  "discordNotificationSent": true
}
```

## Database Schema

Table: `mentor_sessions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| room_id | UUID | Seed room reference |
| student_id | UUID | Student who requested |
| mentor_id | UUID | Assigned mentor |
| scheduled_date | DATE | Session date |
| scheduled_time | TIME | Session time |
| status | TEXT | pending/confirmed/completed/cancelled |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Updated timestamp |

# Mobile App — Push Notification Setup

**Goal:** Enable the Expo mobile app to receive push notifications sent from the admin Push Sender panel. Participants should see notifications when the app is backgrounded or closed, and tapping a notification should deep-link to the relevant screen.

**Context:** The admin web app already sends push notifications via Expo's push API (`exp.host/--/api/v2/push/send`). Push tokens are stored in the `hackathon_participant_push_tokens` table. The mobile app needs to register for push, save its token to the database, and handle incoming notifications.

---

## Task 1: Install expo-notifications

```bash
npx expo install expo-notifications expo-device expo-constants
```

Add the config plugin to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification_icon.png",
          "color": "#5b21b6"
        }
      ]
    ]
  }
}
```

---

## Task 2: Configure FCM credentials for Android

Without this, Android push notifications will fail with "Unable to retrieve the FCM server key".

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → Project Settings → Service Accounts
2. Click "Generate new private key" (downloads a JSON file)
3. Upload to Expo via CLI: `eas credentials --platform android`
   - Select "Push Notifications: Manage your FCM V1 API Key"
   - Upload the JSON file

Alternatively, upload via [expo.dev](https://expo.dev) → Project → Credentials → Android → FCM V1 Service Account Key.

---

## Task 3: Register for push notifications and save token

Create a utility function that requests permission, gets the Expo push token, and saves it to the backend:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotifications(sessionToken: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5b21b6',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // Get Expo push token
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId
    ?? Constants?.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID not found');

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // Save to backend
  await fetch('https://www.passionseed.org/api/hackathon/push-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      subscription: token, // e.g. "ExponentPushToken[xxxxxx]"
    }),
  });

  return token;
}
```

> **Important:** The `/api/hackathon/push-subscribe` endpoint currently expects `subscription` to be a JSON object (web push format). It needs a small update to also accept a plain string (Expo token). See Task 6.

---

## Task 4: Set up notification handler (foreground display)

In your app's root layout or entry point:

```typescript
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

Without this, notifications received while the app is in the foreground will be silently dropped.

---

## Task 5: Handle notification taps (deep linking)

In your root layout, add a listener that navigates when a notification is tapped:

```typescript
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url);
      }
    }

    // Handle tap when app was killed
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirect(lastResponse.notification);
    }

    // Handle tap while app is running
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      redirect(response.notification);
    });

    return () => sub.remove();
  }, []);
}
```

The admin Push Sender sends `data: { url }` in the payload, so this will work out of the box.

---

## Task 6: Update push-subscribe API to accept Expo tokens

The current `/api/hackathon/push-subscribe` endpoint expects a web push subscription object. Update it to also accept a plain Expo push token string:

In `app/api/hackathon/push-subscribe/route.ts`, update the POST handler:

```typescript
// Accept either a web push subscription object or an Expo push token string
const { subscription } = await req.json();

let pushToken: string;
let platform: string;

if (typeof subscription === 'string' && subscription.startsWith('ExponentPushToken[')) {
  // Expo push token from mobile app
  pushToken = subscription;
  platform = 'ios'; // or detect from a `platform` field in the request body
} else if (subscription?.endpoint) {
  // Web push subscription
  pushToken = JSON.stringify(subscription);
  platform = 'web';
} else {
  return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
}
```

Also accept an optional `platform` field in the request body so the mobile app can specify `ios` or `android`.

---

## Task 7: Call registration on login

After the participant logs in and has a session token, call `registerForPushNotifications(sessionToken)`. Good places:

- After successful login in the login screen
- On app launch if already logged in (in case the token rotated)

```typescript
// After login
const token = await registerForPushNotifications(sessionToken);
if (token) console.log('Push registered:', token);
```

---

## Task 8: Build and test

1. Run `eas build --platform ios --profile development` (or android)
2. Install the dev build on a physical device
3. Log in as a participant
4. Go to admin Push Sender → select yourself → send a notification
5. Verify:
   - Notification appears when app is backgrounded
   - Notification appears when app is in foreground (banner)
   - Tapping notification navigates to the correct URL
   - "Check Receipts" in admin shows "Delivered"

---

## Summary of changes needed

| Where | What |
|-------|------|
| Mobile app | Install `expo-notifications`, `expo-device`, `expo-constants` |
| Mobile app | Add config plugin to `app.json` |
| Mobile app | Create `registerForPushNotifications()` utility |
| Mobile app | Add `setNotificationHandler` in root layout |
| Mobile app | Add notification tap → deep link handler |
| Mobile app | Call registration on login / app launch |
| Expo/EAS | Upload FCM V1 credentials for Android |
| Web API | Update `/api/hackathon/push-subscribe` to accept Expo token strings |

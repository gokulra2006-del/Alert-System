# Campus Shield

Campus Shield is a mobile-first safety platform integrating a Node.js/Express backend with an Expo-managed React Native mobile application.

## Integrations Status

Based on the initial design specifications and subsequent overrides, here is the status of the integrations:

### 🟢 Live (Implemented)
- **Data Layer (Firebase)**: We have replaced the Taskade API with a Firebase Admin SDK wrapper (`server/firebaseBridge/`) to handle CRUD operations for Incident Reports, Patrol Logs, Wellness Check-ins, and Safety Resources. (You must provide a `serviceAccountKey.json` for it to connect to your real Firebase project).
- **AI/LLM (Gemini via OpenRouter)**: Post-mortems, heatmap analysis, and weekly briefings are structured to accept API calls to Gemini using OpenRouter keys.

### 🔴 Requires Real Credentials / Not Connected (Mocks)
As per the requirement to be honest about hardware/services not yet configured:
- **Twilio SMS / Voice**: The `smsWebhook.js` and notification dispatchers in `sosFlow.js` and `onboardingWelcome.js` are fully coded to accept payloads and log actions, but do not yet have a Twilio Client initialized.
- **Wearable Integration**: `sleepStressCorrelation.js` honestly returns a "not connected" response.
- **Weather API**: `weatherAlerts.js` logs that the API is not connected and assumes clear weather.
- **GPS Hardware**: The `LiveMap.jsx` component renders a mock view stating it requires `react-native-maps` and a real device location provider.
- **Push Notifications (FCM)**: The `buddySystem.js` logs push notifications instead of dispatching them over FCM.

## How to Run

### 1. Server
```bash
cd campus-shield/server
npm install
npm run dev
```
*(Ensure you add your `.env` file with `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, and place your Firebase `serviceAccountKey.json` in the root).*

### 2. Mobile App (Expo)
```bash
cd campus-shield/mobile
npm install
npx expo start
```
*(You will need to install `@react-navigation/native` and `@react-navigation/stack` to wire up the provided screens in `src/screens` to your `App.js`).*

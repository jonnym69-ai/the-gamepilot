# API Keys Setup

GamePilot requires API keys to function properly. Follow these steps to set up your own API keys:

## 1. Create a .env file

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

## 2. Get Your API Keys

### Steam API Key
1. Go to https://steamcommunity.com/dev/apikey
2. Log in with your Steam account
3. Enter any domain name (e.g., localhost)
4. Copy your API key

### Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Log in with your Google account
3. Create a new API key
4. Copy your API key

### CORS Proxy (Optional)
The default CORS proxy is provided, but you can use your own if needed.

## 3. Update Your .env File

Replace the placeholder values in your `.env` file:
```
REACT_APP_STEAM_API_KEY=your_actual_steam_api_key
REACT_APP_GEMINI_API_KEY=your_actual_gemini_api_key
REACT_APP_CORS_PROXY=https://cors-anywhere.herokuapp.com/
```

## 4. Start GamePilot

```bash
npm start
```

## Important Notes

- **Never share your API keys** or commit them to version control
- **Your .env file is automatically ignored** by Git
- **Each user needs their own API keys** - the app won't work without them
- **API keys are free** but may have usage limits

## Troubleshooting

If you see API key errors:
1. Check that your `.env` file exists
2. Verify the keys are correct
3. Restart the app after changing the .env file
4. Make sure your Steam profile is public if using Steam features

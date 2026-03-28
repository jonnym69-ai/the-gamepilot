export async function handler(event) {
  const { steamid } = event.queryStringParameters;
  if (!steamid) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing steamid' }) };
  }
  try {
    const response = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamid}&format=json`);
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: 'Steam API error' }) };
    }
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
}

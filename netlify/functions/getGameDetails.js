export async function handler(event) {
  const { appids } = event.queryStringParameters;
  if (!appids) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing appids' }) };
  }
  const ids = appids.split(',');
  const details = {};
  for (const id of ids) {
    try {
      const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=en`);
      const data = await response.json();
      if (data[id] && data[id].success) {
        details[id] = data[id].data;
      }
    } catch (error) {
      console.error(`Failed to fetch details for ${id}`, error);
    }
  }
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(details),
  };
}

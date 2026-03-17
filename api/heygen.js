export const config = { runtime: 'edge' };
 
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
      }
    });
  }
 
  try {
    const apiKey = req.headers.get('X-Api-Key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'X-Api-Key header missing' }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
 
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/v2/avatars';
    const heygenUrl = 'https://api.heygen.com' + path;
 
    let fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      }
    };
 
    if (req.method === 'POST') {
      const body = await req.text();
      fetchOptions.body = body;
    }
 
    const resp = await fetch(heygenUrl, fetchOptions);
    const data = await resp.text();
 
    return new Response(data, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
 
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
 

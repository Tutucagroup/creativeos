export const config = { runtime: 'edge' };
 
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Api-Key',
      }
    });
  }
 
  const apiKey = req.headers.get('Api-Key');
  const body = await req.text();
 
  const resp = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
    },
    body,
  });
 
  const data = await resp.text();
  return new Response(data, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
 

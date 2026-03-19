export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Claid-Action, X-Claid-Job-Id',
      }
    });
  }

  try {
    const apiKey = process.env.CLAID_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'CLAID_KEY not set' }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const action = req.headers.get('X-Claid-Action') || 'photoshoot';

    // Scene Create API (product photography)
    if (action === 'photoshoot') {
      const body = await req.text();
      const r = await fetch('https://api.claid.ai/v1/scene/create', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        body: body
      });
      const data = await r.text();
      return new Response(data, {
        status: r.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Poll for async result
    if (action === 'poll') {
      const jobId = req.headers.get('X-Claid-Job-Id');
      if (!jobId) {
        return new Response(JSON.stringify({ error: 'X-Claid-Job-Id header missing' }), {
          status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      const r = await fetch('https://api.claid.ai/v1/scene/create/' + jobId, {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      const data = await r.text();
      return new Response(data, {
        status: r.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action: ' + action }), {
      status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch(err) {
    return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

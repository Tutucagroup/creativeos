export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Fal-Model, X-Fal-Action, X-Fal-Request-Id',
      }
    });
  }

  try {
    // Use env var — key never exposed to browser
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return new Response(JSON.stringify({ error: 'FAL_KEY not configured in Vercel environment' }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const model = req.headers.get('X-Fal-Model') || 'fal-ai/flux-pro/kontext';
    const action = req.headers.get('X-Fal-Action') || 'submit';

    let endpoint, method;
    if(action === 'status') {
      // Poll status: GET /requests/{id}/status
      const requestId = req.headers.get('X-Fal-Request-Id');
      endpoint = 'https://queue.fal.run/'+model+'/requests/'+requestId+'/status';
      method = 'GET';
    } else if(action === 'result') {
      // Get result: GET /requests/{id}
      const requestId = req.headers.get('X-Fal-Request-Id');
      endpoint = 'https://queue.fal.run/'+model+'/requests/'+requestId;
      method = 'GET';
    } else if(action === 'upload') {
      // Upload file to fal storage
      endpoint = 'https://fal.run/fal-ai/storage/upload';
      method = 'POST';
    } else {
      // Submit job
      endpoint = 'https://queue.fal.run/'+model;
      method = 'POST';
    }

    const fetchOpts = {
      method: method,
      headers: { 'Authorization': 'Key '+falKey }
    };

    if(method === 'POST') {
      const ct = req.headers.get('Content-Type') || '';
      if(ct.includes('multipart')) {
        fetchOpts.body = await req.formData();
      } else {
        fetchOpts.headers['Content-Type'] = 'application/json';
        fetchOpts.body = await req.text();
      }
    }

    const resp = await fetch(endpoint, fetchOpts);
    const data = await resp.text();

    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Fal-Model, X-Fal-Action, X-Fal-Request-Id',
    };

    return new Response(data, { status: resp.status, headers: corsHeaders });

  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

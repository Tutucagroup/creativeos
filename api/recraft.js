export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { message: 'Authorization header missing' } }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const contentType = req.headers.get('Content-Type') || '';
    
    // Route: image-to-image (multipart) vs text-to-image (JSON)
    let endpoint, fetchBody, fetchHeaders;

    if (contentType.includes('multipart/form-data')) {
      // Image-to-image: forward multipart as-is
      endpoint = 'https://external.api.recraft.ai/v1/images/imageToImage';
      const formData = await req.formData();
      fetchBody = formData;
      fetchHeaders = { 'Authorization': authHeader };
    } else {
      // Text-to-image: JSON body
      endpoint = 'https://external.api.recraft.ai/v1/images/generations';
      const body = await req.text();
      fetchBody = body;
      fetchHeaders = { 'Content-Type': 'application/json', 'Authorization': authHeader };
    }

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: fetchBody,
    });

    const responseText = await resp.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch(e) {
      return new Response(JSON.stringify({ error: { message: 'Recraft error: ' + responseText.substring(0, 300) } }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch(err) {
    return new Response(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

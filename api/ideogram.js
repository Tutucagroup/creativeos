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
 
  try {
    const apiKey = req.headers.get('Api-Key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'Api-Key header missing' } }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
 
    const body = await req.json();
    const imageRequest = body.image_request || {};
    const imageRefs = body.image_references || [];
 
    const aspectMap = {
      'ASPECT_1_1': '1x1',
      'ASPECT_9_16': '9x16',
      'ASPECT_4_5': '4x5',
      'ASPECT_16_9': '16x9'
    };
 
    // Build the V3 request body
    const v3Body = {
      prompt: imageRequest.prompt || '',
      aspect_ratio: aspectMap[imageRequest.aspect_ratio] || '1x1',
      magic_prompt: 'OFF',
      style: 'AUTO',
      rendering_speed: 'DEFAULT'
    };
 
    // Only add image_reference if we have a valid http URL (not base64)
    const httpRefs = imageRefs.filter(r => r.url && (r.url.startsWith('http://') || r.url.startsWith('https://')));
    if (httpRefs.length > 0) {
      v3Body.image_reference = {
        url: httpRefs[0].url,
        influence_strength: Math.min(1, Math.max(0, (httpRefs[0].weight || 50) / 100))
      };
    }
 
    const resp = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(v3Body),
    });
 
    const responseText = await resp.text();
 
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch(e) {
      // If response is not JSON, return it wrapped
      return new Response(JSON.stringify({ error: { message: 'Ideogram returned non-JSON: ' + responseText.substring(0, 200) } }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
 
    return new Response(JSON.stringify(parsed), {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
 
  } catch(err) {
    return new Response(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

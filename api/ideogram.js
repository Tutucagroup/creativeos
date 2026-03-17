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

    // Find the first product reference (base64 takes priority over http url)
    const productRef = imageRefs.find(r => r.base64) || imageRefs.find(r => r.url && r.url.startsWith('http'));

    let resp;

    if (productRef && productRef.base64) {
      // BASE64 PATH: use multipart/form-data with generate-with-image endpoint
      const mimeType = productRef.mimeType || 'image/jpeg';
      const binaryStr = atob(productRef.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const influenceStrength = Math.min(1, Math.max(0, (productRef.weight || 75) / 100));

      const form = new FormData();
      form.append('image_request', JSON.stringify({
        prompt: imageRequest.prompt || '',
        aspect_ratio: aspectMap[imageRequest.aspect_ratio] || '1x1',
        magic_prompt: 'OFF',
        style: 'AUTO',
        rendering_speed: 'DEFAULT',
        image_reference: { influence_strength: influenceStrength }
      }));
      form.append('image_reference_file', blob, 'product.jpg');

      resp = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate-with-image', {
        method: 'POST',
        headers: { 'Api-Key': apiKey },
        body: form,
      });

    } else {
      // HTTP URL PATH: standard JSON request
      const v3Body = {
        prompt: imageRequest.prompt || '',
        aspect_ratio: aspectMap[imageRequest.aspect_ratio] || '1x1',
        magic_prompt: 'OFF',
        style: 'AUTO',
        rendering_speed: 'DEFAULT'
      };

      if (productRef) {
        v3Body.image_reference = {
          url: productRef.url,
          influence_strength: Math.min(1, Math.max(0, (productRef.weight || 75) / 100))
        };
      }

      resp = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
        body: JSON.stringify(v3Body),
      });
    }

    const responseText = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch(e) {
      return new Response(JSON.stringify({ error: { message: 'Ideogram returned non-JSON: ' + responseText.substring(0, 200) } }), {
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

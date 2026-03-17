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

    const v3Body = {
      prompt: imageRequest.prompt || '',
      aspect_ratio: aspectMap[imageRequest.aspect_ratio] || '1x1',
      magic_prompt: 'OFF',
      style: 'AUTO',
      rendering_speed: 'DEFAULT'
    };

    // Step 1: if we have a base64 product ref, upload it to Ideogram first to get a URL
    const base64Ref = imageRefs.find(r => r.base64);
    const httpRef   = imageRefs.find(r => r.url && r.url.startsWith('http'));

    if (base64Ref) {
      // Upload image to Ideogram's own upload endpoint → get back a URL
      const mimeType  = base64Ref.mimeType || 'image/jpeg';
      const binaryStr = atob(base64Ref.base64);
      const bytes     = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });

      const uploadForm = new FormData();
      uploadForm.append('image', blob, 'product.jpg');

      const uploadResp = await fetch('https://api.ideogram.ai/upload', {
        method: 'POST',
        headers: { 'Api-Key': apiKey },
        body: uploadForm,
      });

      if (uploadResp.ok) {
        const uploadData = await uploadResp.json();
        const uploadedUrl = uploadData?.url || uploadData?.data?.url;
        if (uploadedUrl) {
          v3Body.image_reference = {
            url: uploadedUrl,
            influence_strength: Math.min(1, Math.max(0, (base64Ref.weight || 75) / 100))
          };
        }
      }
      // If upload fails, continue without image_reference (just prompt)

    } else if (httpRef) {
      v3Body.image_reference = {
        url: httpRef.url,
        influence_strength: Math.min(1, Math.max(0, (httpRef.weight || 75) / 100))
      };
    }

    const resp = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
      body: JSON.stringify(v3Body),
    });

    const responseText = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch(e) {
      return new Response(JSON.stringify({ error: { message: 'Ideogram error: ' + responseText.substring(0, 300) } }), {
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

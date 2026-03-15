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
  const body = await req.json();
  const prompt = body.image_request.prompt;
  const aspectRatio = body.image_request.aspect_ratio || 'ASPECT_1_1';
 
  // Map old aspect ratio format to V3 format
  const aspectMap = {
    'ASPECT_1_1': '1x1',
    'ASPECT_9_16': '9x16',
    'ASPECT_4_5': '4x5',
    'ASPECT_16_9': '16x9'
  };
 
  const resp = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: aspectMap[aspectRatio] || '1x1',
      magic_prompt: 'AUTO',
      style: 'AUTO',
      rendering_speed: 'DEFAULT'
    }),
  });
 
  const data = await resp.text();
  let parsed;
  try { parsed = JSON.parse(data); } catch(e) { parsed = { error: data }; }
  
  // Normalize response to match old format expected by frontend
  // V3 returns { data: [{ url: '...' }] } - same structure, should work
  return new Response(JSON.stringify(parsed), {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

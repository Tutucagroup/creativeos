import fetch from 'node-fetch';
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  const apiKey = process.env.CLAID_KEY;
  if (!apiKey) return res.status(500).json({ error: 'CLAID_KEY not set' });
 
  const action = req.headers['x-claid-action'] || 'photoshoot';
 
  // Claid AI Photoshoot API
  if (action === 'photoshoot') {
    const r = await fetch('https://api.claid.ai/v1-beta1/image/edit/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const d = await r.json();
    return res.status(r.status).json(d);
  }
 
  // Poll for async result
  if (action === 'poll') {
    const jobId = req.headers['x-claid-job-id'];
    const r = await fetch('https://api.claid.ai/v1-beta1/image/edit/' + jobId, {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    const d = await r.json();
    return res.status(r.status).json(d);
  }
 
  return res.status(400).json({ error: 'Unknown action' });
}
 

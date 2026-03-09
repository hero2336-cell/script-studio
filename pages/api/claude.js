export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, system, useWebSearch } = req.body;

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: system || '당신은 의학 전문 유튜브 스크립트 작가입니다.',
    messages: [{ role: 'user', content: prompt }],
  };

  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  res.status(200).json({ text });
}

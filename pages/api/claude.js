export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, system, useWebSearch } = req.body;

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: system || '당신은 의학 전문 유튜브 스크립트 작가입니다.',
    messages: [{ role: 'user', content: prompt }],
  };

  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return res.status(500).json({ error: data.error.message || 'API error', text: '' });
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    res.status(200).json({ text });
  } catch (err) {
    console.error('Claude API call failed:', err);
    res.status(500).json({ error: err.message, text: '' });
  }
}

import { TrendResult } from '@/trends/types';

export async function generateAIInsight(trend: TrendResult): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return `Multiple signals indicate increased activity around ${trend.topic}.`;
  }

  const prompt =
    `Analyze this AI ecosystem trend and produce a short insight summary:\n` +
    `Topic: ${trend.topic} ` +
    `Category: ${trend.category} ` +
    `Signals: ${trend.signal_count} ` +
    `Entities: ${trend.entities.join(', ')}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  const text = data.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');

  console.log(`AI insight generated for topic: ${trend.topic}`);
  return text;
}

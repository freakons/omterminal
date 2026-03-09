import { TrendResult } from '@/trends/types';

const insightCache = new Map<string, string>();

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAIInsight(trend: TrendResult): Promise<string> {
  const topic = trend.topic.toLowerCase();

  if (insightCache.has(topic)) {
    return insightCache.get(topic)!;
  }

  let insight: string;

  if (!process.env.OPENAI_API_KEY) {
    insight = `Multiple signals indicate increased activity around ${topic}.`;
  } else {
    const apiKey = process.env.OPENAI_API_KEY;

    const prompt =
      `Analyze this AI ecosystem trend and produce a short insight summary:\n` +
      `Topic: ${trend.topic} ` +
      `Category: ${trend.category} ` +
      `Signals: ${trend.signal_count} ` +
      `Entities: ${trend.entities.join(', ')}`;

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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

    insight = text;
  }

  insightCache.set(topic, insight);
  console.log(`AI insight generated for topic: ${topic}`);
  return insight;
}

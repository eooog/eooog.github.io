// providers/openai.mjs
// 모델명은 계정에서 실제로 쓸 수 있는 값으로 바꿔서 OPENAI_MODEL에 넣으세요.
// (OpenAI 모델 라인업은 자주 바뀌므로 기본값을 하드코딩해서 신뢰하지 마세요.)
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export async function openaiComplete({ system, userMessage }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API 오류: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

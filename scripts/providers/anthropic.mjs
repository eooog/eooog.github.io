// providers/anthropic.mjs
// ANTHROPIC_API_KEY(정적 키) 또는 WIF 관련 환경변수
// (ANTHROPIC_FEDERATION_RULE_ID, ANTHROPIC_ORGANIZATION_ID,
//  ANTHROPIC_SERVICE_ACCOUNT_ID, ANTHROPIC_IDENTITY_TOKEN_FILE 등)를
// SDK가 자동으로 감지해서 인증한다. 이 파일은 어느 쪽인지 신경 쓸 필요 없다.
//
// 클라이언트는 실제로 호출될 때 딱 한 번만 생성한다 (lazy).
// 모듈 로드 시점에 바로 생성하면, LLM_PROVIDER=openai로 이 파일을
// 아예 안 쓰는 경우에도 Anthropic 인증 정보가 없다고 즉시 에러가 날 수 있다.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export async function anthropicComplete({ system, userMessage }) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}

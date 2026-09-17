// providers/index.mjs
// 공통 포트: complete({ system, userMessage }) -> Promise<string>
// 새 provider 추가 시: 이 시그니처로 파일 하나 만들고 아래 providers에 등록만 하면 됨.

import { anthropicComplete } from './anthropic.mjs';
import { openaiComplete } from './openai.mjs';

const providers = {
  anthropic: anthropicComplete,
  openai: openaiComplete,
};

export async function complete({ system, userMessage }) {
  const name = (process.env.LLM_PROVIDER || 'anthropic').trim();
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `지원하지 않는 LLM_PROVIDER: "${name}" (가능한 값: ${Object.keys(providers).join(', ')})`
    );
  }
  return provider({ system, userMessage });
}

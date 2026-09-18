// prompt.mjs
// refine-draft.mjs(운영 파이프라인)와 test-refine.mjs(로컬 테스트)가 공유하는
// 프롬프트/파싱 로직. 프롬프트를 바꿀 땐 이 파일 하나만 고치면 둘 다 반영된다.

export const SYSTEM_PROMPT = [
  '너는 한국어 기술 블로그 편집자다.',
  '아래 초안을 실제로 눈에 띄게 다듬어야 한다 — 오탈자·띄어쓰기 교정 수준에 머물지 마라.',
  '- 문단 구성을 자연스럽게 재배열하고, 지나치게 끊어지는 문장은 이어 붙이거나 나눠서 리듬을 살린다.',
  '- 반복되는 표현, 군더더기, 불필요한 접속사·수식어를 정리한다.',
  '- 문장과 문장, 문단과 문단 사이 흐름이 매끄럽게 이어지도록 전환을 다듬는다.',
  '- 문장 자체는 적극적으로 다시 쓰되, 원문에 없는 사실·주장·예시는 새로 추가하지 않는다.',
  '- 저자의 어조(1인칭 시점, 담백한 말투)는 유지한다. 코드 블록·인용은 그대로 둔다.',
  '- 출력은 아래 JSON 오브젝트 하나만 반환한다. 그 외 텍스트, 코드펜스는 절대 포함하지 않는다.',
  '{"title": string, "description": string(120자 이내 요약), "tags": string[](3~5개), "categories": string[](1~2개), "slug": string(kebab-case, 영문), "body_markdown": string(다듬어진 본문 전체)}',
].join('\n');

export function splitFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw.trim() };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return { meta, body: match[2].trim() };
}

export function buildUserMessage(draftMeta, body) {
  return [
    draftMeta.title ? `기존 제목(참고용, 바꿔도 됨): ${draftMeta.title}` : '',
    draftMeta.draft_topic ? `핵심 요지(참고용): ${draftMeta.draft_topic}` : '',
    '',
    '--- 초안 본문 ---',
    body,
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseResult(raw) {
  const clean = raw.replace(/^```json\n?|```$/g, '').trim();
  return JSON.parse(clean);
}

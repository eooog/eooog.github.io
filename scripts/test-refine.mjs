#!/usr/bin/env node
/**
 * 프롬프트를 로컬에서 빠르게 테스트하는 스크립트.
 * GitHub Actions, WIF, git 전혀 안 거침 — 결과를 콘솔에 출력만 하고
 * _posts/로 옮기거나 원본 draft를 지우지 않는다.
 *
 * 사용법:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/test-refine.mjs _drafts/test.md
 *
 * (WIF는 GitHub Actions의 OIDC 토큰이 있어야 동작하므로 로컬에서는 못 씀.
 *  로컬 테스트용으로 임시 API 키 하나 발급해서 쓰는 걸 권장.)
 */

import { readFileSync } from 'node:fs';
import { complete } from './providers/index.mjs';
import { SYSTEM_PROMPT, splitFrontMatter, buildUserMessage, parseResult } from './prompt.mjs';

const path = process.argv[2];
if (!path) {
  console.error('사용법: node scripts/test-refine.mjs <draft파일경로>');
  process.exit(1);
}

const raw = readFileSync(path, 'utf8');
const { meta, body } = splitFrontMatter(raw);

console.log(`--- ${path} 다듬는 중 (provider: ${process.env.LLM_PROVIDER || 'anthropic'}) ---\n`);

const rawResult = await complete({
  system: SYSTEM_PROMPT,
  userMessage: buildUserMessage(meta, body),
});
const result = parseResult(rawResult);

console.log('title       :', result.title);
console.log('description :', result.description);
console.log('tags        :', result.tags.join(', '));
console.log('categories  :', result.categories.join(', '));
console.log('slug        :', result.slug);
console.log('\n--- body (다듬어진 본문) ---\n');
console.log(result.body_markdown);

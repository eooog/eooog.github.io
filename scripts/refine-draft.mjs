#!/usr/bin/env node
/**
 * _drafts/*.md 를 읽어 LLM으로 다듬고, front matter를 생성해
 * _posts/YYYY-MM-DD-slug.md 로 옮긴다. 원본 draft 파일은 삭제한다.
 *
 * 어떤 LLM을 쓸지는 LLM_PROVIDER 환경변수로 결정한다 (기본: anthropic).
 * 프롬프트/파싱 로직은 prompt.mjs에 있음 — test-refine.mjs(로컬 테스트)와 공유.
 */

import { readFileSync, writeFileSync, unlinkSync, readdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { complete } from './providers/index.mjs';
import { SYSTEM_PROMPT, splitFrontMatter, buildUserMessage, parseResult } from './prompt.mjs';

const DRAFTS_DIR = '_drafts';
const POSTS_DIR = '_posts';

async function refine(draftMeta, body) {
  const raw = await complete({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(draftMeta, body),
  });
  return parseResult(raw);
}

function toFrontMatter(fields) {
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const lines = ['---'];
  lines.push(`title: "${esc(fields.title)}"`);
  lines.push(`date: ${fields.date}`);
  lines.push(`description: "${esc(fields.description)}"`);
  lines.push(`tags: [${fields.tags.map((t) => `"${esc(t)}"`).join(', ')}]`);
  lines.push(`categories: [${fields.categories.map((c) => `"${esc(c)}"`).join(', ')}]`);
  lines.push('---');
  return lines.join('\n');
}

async function main() {
  const files = readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('처리할 초안이 없습니다.');
    return;
  }

  const titles = [];

  for (const file of files) {
    const raw = readFileSync(join(DRAFTS_DIR, file), 'utf8');
    const { meta, body } = splitFrontMatter(raw);

    console.log(`다듬는 중 (${process.env.LLM_PROVIDER || 'anthropic'}): ${file}`);
    const result = await refine(meta, body);

    const date = new Date().toISOString().slice(0, 10);
    const frontMatter = toFrontMatter({ ...result, date });
    const finalContent = `${frontMatter}\n\n${result.body_markdown}\n`;

    const outPath = join(POSTS_DIR, `${date}-${result.slug}.md`);
    writeFileSync(outPath, finalContent, 'utf8');
    unlinkSync(join(DRAFTS_DIR, file));

    titles.push(result.title);
    console.log(`생성됨: ${outPath}`);
  }

  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `POST_TITLE=${titles.join(', ')}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

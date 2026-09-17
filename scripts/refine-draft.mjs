#!/usr/bin/env node
/**
 * _drafts/*.md 를 읽어 LLM으로 다듬고, front matter를 생성해
 * _posts/YYYY-MM-DD-slug.md 로 옮긴다. 원본 draft 파일은 삭제한다.
 *
 * 어떤 LLM을 쓸지는 LLM_PROVIDER 환경변수로 결정한다 (기본: anthropic).
 * 실제 provider별 구현은 scripts/providers/ 아래 어댑터에 있고,
 * 이 파일은 그 포트(complete)만 호출하는 도메인 로직이라 provider가
 * 바뀌어도 이 파일은 건드릴 필요가 없다.
 */

import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { complete } from "./providers/index.mjs";

const DRAFTS_DIR = "_drafts";
const POSTS_DIR = "_posts";

function splitFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw.trim() };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return { meta, body: match[2].trim() };
}

const SYSTEM_PROMPT = [
  "너는 한국어 기술 블로그 편집자다.",
  "아래 초안을 다듬고 front matter를 생성해야 한다.",
  "- 문장/구성만 교정한다. 원문에 없는 사실이나 주장을 새로 추가하지 않는다.",
  "- 저자의 어조와 1인칭 시점, 코드 블록·인용은 그대로 유지한다.",
  "- 장황하거나 과장되거나 모호한 수식어를 붙이지 않는다",
  "- 출력은 아래 JSON 오브젝트 하나만 반환한다. 그 외 텍스트, 코드펜스는 절대 포함하지 않는다.",
  '{"title": string, "description": string(120자 이내 요약), "tags": string[](3~5개), "categories": string[](1~2개), "slug": string(kebab-case, 영문), "body_markdown": string(다듬어진 본문 전체)}',
].join("\n");

function buildUserMessage(draftMeta, body) {
  return [
    draftMeta.title ? `기존 제목(참고용, 바꿔도 됨): ${draftMeta.title}` : "",
    draftMeta.draft_topic ? `핵심 요지(참고용): ${draftMeta.draft_topic}` : "",
    "",
    "--- 초안 본문 ---",
    body,
  ]
    .filter(Boolean)
    .join("\n");
}

async function refine(draftMeta, body) {
  const raw = await complete({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(draftMeta, body),
  });
  const clean = raw.replace(/^```json\n?|```$/g, "").trim();
  return JSON.parse(clean);
}

function toFrontMatter(fields) {
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const lines = ["---"];
  lines.push(`title: "${esc(fields.title)}"`);
  lines.push(`date: ${fields.date}`);
  lines.push(`description: "${esc(fields.description)}"`);
  lines.push(`tags: [${fields.tags.map((t) => `"${esc(t)}"`).join(", ")}]`);
  lines.push(
    `categories: [${fields.categories.map((c) => `"${esc(c)}"`).join(", ")}]`,
  );
  lines.push("---");
  return lines.join("\n");
}

async function main() {
  const files = readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.log("처리할 초안이 없습니다.");
    return;
  }

  const titles = [];

  for (const file of files) {
    const raw = readFileSync(join(DRAFTS_DIR, file), "utf8");
    const { meta, body } = splitFrontMatter(raw);

    console.log(
      `다듬는 중 (${process.env.LLM_PROVIDER || "anthropic"}): ${file}`,
    );
    const result = await refine(meta, body);

    const date = new Date().toISOString().slice(0, 10);
    const frontMatter = toFrontMatter({ ...result, date });
    const finalContent = `${frontMatter}\n\n${result.body_markdown}\n`;

    const outPath = join(POSTS_DIR, `${date}-${result.slug}.md`);
    writeFileSync(outPath, finalContent, "utf8");
    unlinkSync(join(DRAFTS_DIR, file));

    titles.push(result.title);
    console.log(`생성됨: ${outPath}`);
  }

  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `POST_TITLE=${titles.join(", ")}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

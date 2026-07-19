import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { importIdioms, importQuestions } from "../lib/csv";
import { CURATED_IDIOMS, CURATED_QUESTIONS } from "../lib/content";

function sql(value: string | number | boolean | null) {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

const lines = [
  "-- Generated from the reviewed CSV drafts. Review source references before production publishing.",
  "insert into public.idioms (id,name,pinyin,meaning,example,category,source_ref,review_status,status) values",
  (existsSync("data/formal-500-idioms.csv") ? importIdioms(readFileSync("data/formal-500-idioms.csv", "utf8"), "formal-500-idioms.csv").idioms : CURATED_IDIOMS).map((item) => `(${[item.id, item.name, item.pinyin, item.meaning, item.example, item.category, item.sourceRef, item.reviewStatus, item.status].map(sql).join(",")})`).join(",\n") + "\non conflict (id) do update set name = excluded.name, pinyin = excluded.pinyin, meaning = excluded.meaning, example = excluded.example, category = excluded.category, source_ref = excluded.source_ref, review_status = excluded.review_status, status = excluded.status;",
  "",
  "insert into public.questions (id,stem,options,answer,explanation,source,source_ref,difficulty,status,content_status,reviewed_at) values",
  (existsSync("data/formal-200-questions.csv") ? importQuestions(readFileSync("data/formal-200-questions.csv", "utf8"), "formal-200-questions.csv").questions : CURATED_QUESTIONS).map((item) => `(${sql(item.id)},${sql(item.stem)},${sql(JSON.stringify(item.options))}::jsonb,${item.answer},${sql(item.explanation)},${sql(item.source)},${sql(item.sourceRef)},${sql(item.difficulty)},${sql(item.status)},${sql(item.contentStatus)},${sql(item.reviewedAt || null)})`).join(",\n") + "\non conflict (id) do update set stem = excluded.stem, options = excluded.options, answer = excluded.answer, explanation = excluded.explanation, source = excluded.source, source_ref = excluded.source_ref, difficulty = excluded.difficulty, status = excluded.status, content_status = excluded.content_status, reviewed_at = excluded.reviewed_at;",
  "",
];

mkdirSync("supabase", { recursive: true });
writeFileSync("supabase/seed.sql", `${lines.join("\n")}\n`, "utf8");

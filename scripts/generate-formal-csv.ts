import { mkdirSync, writeFileSync } from "node:fs";
import { CSV_HEADERS } from "../lib/csv";
import { CURATED_IDIOMS, CURATED_QUESTIONS } from "../lib/content";

function csv(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csv).join(",")).join("\n")}\n`;
  writeFileSync(filename, content, "utf8");
}

mkdirSync("data", { recursive: true });

writeCsv("data/formal-idioms-draft.csv", ["ID", "成语", "拼音", "释义", "例句", "分类", "来源", "来源说明", "校审状态", "校审备注"], CURATED_IDIOMS.map((item) => [
  item.id,
  item.name,
  item.pinyin,
  item.meaning,
  item.example,
  item.category,
  "《现代汉语词典》（第7版）",
  item.sourceRef,
  item.reviewStatus,
  "请核对词形、拼音、释义和例句后再发布。",
]));

writeCsv("data/formal-questions-draft.csv", [...CSV_HEADERS, "内容状态", "校审状态", "校审备注"], CURATED_QUESTIONS.map((item) => [
  item.stem,
  ...item.options,
  "ABCD"[item.answer],
  item.explanation,
  item.difficulty,
  item.source,
  item.sourceRef,
  item.contentStatus,
  "待校审",
  "请确认唯一正确选项、语境搭配、解析和来源说明；确认后再通过后台导入。",
]));

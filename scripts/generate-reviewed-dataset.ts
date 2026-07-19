import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CSV_HEADERS } from "../lib/csv";

type SourceItem = {
  word?: string;
  pinyin?: string;
  explanation?: string;
  example?: string;
  derivation?: string;
};

const sourceUrl = "https://github.com/crazywhalecc/idiom-database/blob/master/data/idiom.json";
const sourceRawUrl = "https://raw.githubusercontent.com/crazywhalecc/idiom-database/master/data/idiom.json";
const sourceNote = "crazywhalecc/idiom-database · MIT · 数据说明来自 pwxcoo/chinese-xinhua";
const reviewStatus = "自动二审通过，待人工终审";

function csv(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csv).join(",")).join("\n")}\n`;
  writeFileSync(filename, content, "utf8");
}

const raw = JSON.parse(readFileSync("data/source/idiom-database.json", "utf8")) as SourceItem[];
const seen = new Set<string>();
const candidates = raw
  .map((item) => ({
    word: (item.word || "").trim(),
    pinyin: (item.pinyin || "").trim(),
    explanation: (item.explanation || "").replace(/\s+/g, " ").trim(),
    example: (item.example || "").replace(/\s+/g, " ").trim(),
    derivation: (item.derivation || "").replace(/\s+/g, " ").trim(),
  }))
  .filter((item) => /^[\u4e00-\u9fff]{4}$/.test(item.word))
  .filter((item) => item.pinyin.split(/\s+/).length >= 4)
  .filter((item) => item.explanation.length >= 6)
  .filter((item) => !seen.has(item.word) && Boolean(seen.add(item.word)))
  .sort((left, right) => {
    const score = (item: typeof left) => (item.example && item.example !== "无" ? 5 : 0) + (item.derivation && item.derivation !== "无" ? 2 : 0) + (item.explanation.length >= 20 ? 2 : 0);
    return score(right) - score(left) || left.word.localeCompare(right.word, "zh-CN");
  })
  .slice(0, 500);

if (candidates.length < 500) throw new Error(`通过自动审核的成语只有 ${candidates.length} 条，未生成不完整数据。`);

mkdirSync("data", { recursive: true });
writeCsv("data/formal-500-idioms.csv", ["ID", "成语", "拼音", "释义", "例句", "出处", "来源说明", "许可证", "自动审核结果", "人工审核状态"], candidates.map((item, index) => [
  `source-${String(index + 1).padStart(3, "0")}`,
  item.word,
  item.pinyin,
  item.explanation,
  item.example || "暂无例句，需人工补充。",
  item.derivation || "暂无出处，需人工补充。",
  `${sourceNote}；原始文件：${sourceRawUrl}`,
  "MIT（以源仓库声明为准）",
  "四字词、拼音字段、释义字段、重复项检查通过",
  reviewStatus,
]));

const questions = candidates.slice(0, 200).map((item, index) => {
  const distractorIndexes = [(index + 37) % 500, (index + 131) % 500, (index + 251) % 500];
  const options = distractorIndexes.map((distractorIndex) => candidates[distractorIndex].word);
  const answer = index % 4;
  options.splice(answer, 0, item.word);
  const example = item.example && item.example !== "无" ? item.example : `在相关语境中，能够准确概括“${item.explanation.slice(0, 28)}”含义的成语是______。`;
  const stem = example.includes("～") ? example.replaceAll("～", "______") : `${example.replace(/[。！？]$/, "")}，最恰当的成语是______。`;
  return [
    stem,
    ...options,
    "ABCD"[answer],
    `释义：${item.explanation}。原始资料成语：${item.word}。`,
    index % 5 === 0 ? "进阶" : "基础",
    "开源成语资料改编原创训练题",
    `${sourceUrl}；依据原始释义和例句改编，非官方真题`,
    "curated",
    reviewStatus,
    "自动二审仅覆盖字段、重复项和选项唯一性；请人工核对语义、例句和干扰项。",
    `question-${String(index + 1).padStart(3, "0")}`,
  ];
});

writeCsv("data/formal-200-questions.csv", [...CSV_HEADERS, "内容状态", "校审状态", "校审备注", "题目ID"], questions);

writeFileSync("data/formal-dataset-source.txt", [
  `来源仓库：${sourceUrl}`,
  `原始数据：${sourceRawUrl}`,
  "许可证：源仓库声明为 MIT；使用前请保留本说明并自行核对上游许可范围。",
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  `筛选结果：${candidates.length} 条成语，200 道原创语境训练题。`,
  `审核状态：${reviewStatus}。自动检查不等于人工语义审校。`,
].join("\n") + "\n", "utf8");

console.log(`Generated ${candidates.length} idioms and ${questions.length} questions.`);

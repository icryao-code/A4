import type { CsvImportResult, Question } from "./types";

export const CSV_HEADERS = ["题干", "选项A", "选项B", "选项C", "选项D", "正确选项", "解析", "难度", "来源", "来源说明"];
export const IDIOM_CSV_HEADERS = ["ID", "成语", "拼音", "释义", "例句", "出处", "来源说明", "许可证", "自动审核结果", "人工审核状态"];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = ""; continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function escapeCsv(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function csvTemplate() {
  return `\uFEFF${CSV_HEADERS.join(",")}\n示例题干：根据语境选择恰当成语,选项A,选项B,选项C,选项D,A,请替换为正式解析,基础,来源名称,来源版本或链接\n`;
}

export function importQuestions(text: string, filename: string): CsvImportResult {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (rows.length < 2) return { questions: [], errors: ["CSV 至少需要一行表头和一行题目。"], warnings };
  const headers = rows.shift()!.map((header) => header.replace(/^\uFEFF/, "").trim());
  const missing = CSV_HEADERS.slice(0, 9).filter((header) => !headers.includes(header));
  if (missing.length) return { questions: [], errors: [`缺少必填字段：${missing.join("、")}。`], warnings };
  const indexOf = (header: string) => headers.indexOf(header);
  const questions: Question[] = [];
  const seen = new Set<string>();
  rows.forEach((row, rowIndex) => {
    const line = rowIndex + 2;
    const stem = row[indexOf("题干")]?.trim();
    const answerText = row[indexOf("正确选项")]?.trim().toUpperCase();
    const options = ["选项A", "选项B", "选项C", "选项D"].map((header) => row[indexOf(header)]?.trim() || "");
    if (!stem && row.every((cell) => !cell.trim())) return;
    if (!stem) { errors.push(`第 ${line} 行缺少题干。`); return; }
    if (seen.has(stem)) { errors.push(`第 ${line} 行题干重复。`); return; }
    if (options.some((option) => !option)) { errors.push(`第 ${line} 行四个选项必须填写完整。`); return; }
    if (!/^[ABCD]$/.test(answerText)) { errors.push(`第 ${line} 行正确选项必须是 A、B、C 或 D。`); return; }
    const difficulty = row[indexOf("难度")]?.trim() || "基础";
    if (difficulty !== "基础" && difficulty !== "进阶") { errors.push(`第 ${line} 行难度只能填写“基础”或“进阶”。`); return; }
    const source = row[indexOf("来源")]?.trim();
    const sourceRef = row[indexOf("来源说明")]?.trim();
    if (!source || !sourceRef) warnings.push(`第 ${line} 行缺少来源信息，建议补充来源名称和版本/链接。`);
    seen.add(stem);
    questions.push({
      id: row[indexOf("题目ID")]?.trim() || `import-${Date.now()}-${rowIndex}`,
      stem,
      options,
      answer: "ABCD".indexOf(answerText),
      explanation: row[indexOf("解析")]?.trim() || "待补充解析。",
      source: source || `CSV 导入 · ${filename}`,
      sourceRef: sourceRef || "待补充来源说明",
      difficulty: difficulty as "基础" | "进阶",
      status: "published",
      contentStatus: "imported",
    });
  });
  if (questions.length > 2000) errors.push("单次最多导入 2000 道题目。");
  return { questions: errors.length ? [] : questions, errors, warnings };
}

export function questionsToCsv(questions: Question[]) {
  const lines = [CSV_HEADERS.join(",")];
  for (const question of questions) {
    lines.push([
      question.stem,
      ...question.options,
      "ABCD"[question.answer],
      question.explanation,
      question.difficulty,
      question.source,
      question.sourceRef,
    ].map(escapeCsv).join(","));
  }
  return `\uFEFF${lines.join("\n")}\n`;
}

export function importIdioms(text: string, filename: string) {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (rows.length < 2) return { idioms: [], errors: ["成语 CSV 至少需要一行表头和一行数据。"], warnings };
  const headers = rows.shift()!.map((header) => header.replace(/^\uFEFF/, "").trim());
  const required = ["成语", "拼音", "释义", "例句", "来源说明"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) return { idioms: [], errors: [`成语 CSV 缺少字段：${missing.join("、")}。`], warnings };
  const indexOf = (header: string) => headers.indexOf(header);
  const seen = new Set<string>();
  const idioms = rows.map((row, rowIndex) => {
    const name = row[indexOf("成语")]?.trim() || "";
    const pinyin = row[indexOf("拼音")]?.trim() || "";
    const meaning = row[indexOf("释义")]?.trim() || "";
    const example = row[indexOf("例句")]?.trim() || "";
    if (!name && row.every((cell) => !cell.trim())) return null;
    if (!name || !pinyin || !meaning || !example) { errors.push(`第 ${rowIndex + 2} 行缺少成语、拼音、释义或例句。`); return null; }
    if (seen.has(name)) { errors.push(`第 ${rowIndex + 2} 行成语重复：${name}。`); return null; }
    seen.add(name);
    const reviewStatus = row[indexOf("人工审核状态")]?.trim() === "已校审" ? "已校审" : "待校审";
    if (reviewStatus !== "已校审") warnings.push(`第 ${rowIndex + 2} 行仍处于待校审状态。`);
    return { id: row[indexOf("ID")]?.trim() || `import-idiom-${Date.now()}-${rowIndex}`, name, pinyin, meaning, example, category: "待分类", sourceRef: row[indexOf("来源说明")]?.trim() || `导入文件 · ${filename}`, reviewStatus, status: "draft" } as const;
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  return { idioms: errors.length ? [] : idioms, errors, warnings };
}

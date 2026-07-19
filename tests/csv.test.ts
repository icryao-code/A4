import test from "node:test";
import assert from "node:assert/strict";
import { CSV_HEADERS, csvTemplate, importIdioms, importQuestions } from "../lib/csv";

test("CSV template exposes the required fields", () => {
  const template = csvTemplate();
  for (const header of CSV_HEADERS.slice(0, 9)) assert.match(template, new RegExp(header));
});

test("CSV import rejects incomplete answers and duplicate stems", () => {
  const csv = "题干,选项A,选项B,选项C,选项D,正确选项,解析,难度,来源,来源说明\n题目,A,B,C,D,X,,基础,来源,版本\n题目,A,B,C,D,A,,基础,来源,版本";
  const result = importQuestions(csv, "test.csv");
  assert.equal(result.questions.length, 0);
  assert.ok(result.errors.some((error) => error.includes("正确选项")));
});

test("idiom CSV import accepts the formal dataset shape", () => {
  const csv = "ID,成语,拼音,释义,例句,出处,来源说明,许可证,自动审核结果,人工审核状态\nsource-001,有条不紊,yǒu tiáo bù wěn,做事有条理,工作有条不紊,词典,来源说明,MIT,字段通过,自动二审通过，待人工终审";
  const result = importIdioms(csv, "formal.csv");
  assert.equal(result.errors.length, 0);
  assert.equal(result.idioms.length, 1);
  assert.equal(result.idioms[0].name, "有条不紊");
});

import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email = "demo@example.com") {
  await page.goto("/");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "进入学习空间" }).click();
  await expect(page.getByText("今日任务", { exact: true })).toBeVisible();
}

test("user can log in", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "早上好，demo" })).toBeVisible();
});

test("user can complete a question and see the explanation", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "开始今日训练" }).click();
  await expect(page.getByRole("button", { name: "提交答案" })).toBeDisabled();
  await page.locator(".option-button").first().click();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(page.getByText("回答正确", { exact: true })).toBeVisible();
});

test("wrong answers enter the mistake queue", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "开始今日训练" }).click();
  await page.locator(".option-button").nth(1).click();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(page.getByText("正确答案：A", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "知识点不会" }).click();
  await page.getByRole("button", { name: "退出训练" }).click();
  await page.getByRole("button", { name: "错题 1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "错题复习" })).toBeVisible();
  await expect(page.getByText("知识点不会", { exact: true })).toBeVisible();
});

test("admin can open the question desk and save a question", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "题库后台" }).click();
  await expect(page.getByRole("heading", { name: "题库后台" })).toBeVisible();
  await page.getByRole("button", { name: "新增题目" }).click();
  await page.getByLabel("题干").fill("自动化测试题：做事需要有条理，不能______。");
  await page.getByLabel("选项 A").fill("A. 乱七八糟");
  await page.getByLabel("选项 B").fill("B. 有条不紊");
  await page.getByLabel("选项 C").fill("C. 随波逐流");
  await page.getByLabel("选项 D").fill("D. 一知半解");
  await page.getByLabel("解析").fill("自动化测试解析。");
  await page.getByLabel("来源", { exact: true }).fill("自动化测试");
  await page.getByLabel("来源说明").fill("本地测试数据");
  await page.getByRole("button", { name: "保存题目" }).click();
  await expect(page.getByText("自动化测试题：做事需要有条理，不能______。", { exact: true })).toBeVisible();
});

test("admin can add an idiom", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "题库后台" }).click();
  await page.getByRole("tab", { name: /成语管理/ }).click();
  await page.getByRole("button", { name: "新增成语" }).click();
  await page.getByLabel("成语", { exact: true }).fill("自动化新增成语");
  await page.getByLabel("拼音").fill("zì dòng huà xīn zēng");
  await page.getByLabel("释义").fill("用于验证后台能够新增成语词条。");
  await page.getByLabel("例句").fill("这是自动化测试用例中的新增成语。");
  await page.getByLabel("分类", { exact: true }).fill("测试数据");
  await page.getByLabel("来源说明").fill("端到端测试数据");
  await page.getByRole("button", { name: "保存成语" }).click();
  await expect(page.getByText("自动化新增成语", { exact: true })).toBeVisible();
});

test("admin can batch select questions and idioms", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "题库后台" }).click();
  await page.getByLabel("全选题目").check();
  await expect(page.getByRole("button", { name: "一键发布" })).toBeVisible();
  await page.getByRole("tab", { name: /成语管理/ }).click();
  await page.getByLabel("全选成语").check();
  await expect(page.getByRole("button", { name: "一键校审" })).toBeVisible();
  await expect(page.getByRole("button", { name: "批量删除" })).toBeVisible();
});

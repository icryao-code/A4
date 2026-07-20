import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email = "demo@example.com") {
  await page.goto("/");
  await page.getByLabel("閭鍦板潃").fill(email);
  await page.getByLabel("瀵嗙爜").fill("123456");
  await page.getByRole("button", { name: "杩涘叆瀛︿範绌洪棿" }).click();
  await expect(page.getByText("浠婃棩浠诲姟", { exact: true })).toBeVisible();
}

test("user can log in", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "鏃╀笂濂斤紝demo" })).toBeVisible();
});

test("user can complete a question and see the explanation", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "寮€濮嬩粖鏃ヨ缁? }).click();
  await expect(page.getByRole("button", { name: "鎻愪氦绛旀" })).toBeDisabled();
  await page.locator(".option-button").first().click();
  await page.getByRole("button", { name: "鎻愪氦绛旀" }).click();
  await expect(page.getByText("鍥炵瓟姝ｇ‘", { exact: true })).toBeVisible();
});

test("user can start practice from the brush-question navigation", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "鍒烽", exact: true }).click();
  await expect(page.getByRole("button", { name: "鎻愪氦绛旀" })).toBeDisabled();
  await expect(page.locator(".option-button")).toHaveCount(4);
});

test("wrong answers enter the mistake queue", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "寮€濮嬩粖鏃ヨ缁? }).click();
  await page.locator(".option-button").nth(1).click();
  await page.getByRole("button", { name: "鎻愪氦绛旀" }).click();
  await expect(page.getByText("姝ｇ‘绛旀锛欰", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "鐭ヨ瘑鐐逛笉浼? }).click();
  await page.getByRole("button", { name: "閫€鍑鸿缁? }).click();
  await page.getByRole("button", { name: "閿欓 1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "閿欓澶嶄範" })).toBeVisible();
  await expect(page.getByText("鐭ヨ瘑鐐逛笉浼?, { exact: true })).toBeVisible();
});

test("admin can open the question desk and save a question", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "棰樺簱鍚庡彴" }).click();
  await expect(page.getByRole("heading", { name: "棰樺簱鍚庡彴" })).toBeVisible();
  await page.getByRole("button", { name: "鏂板棰樼洰" }).click();
  await page.getByLabel("棰樺共").fill("鑷姩鍖栨祴璇曢锛氬仛浜嬮渶瑕佹湁鏉＄悊锛屼笉鑳絖_____銆?);
  await page.getByLabel("閫夐」 A").fill("A. 涔变竷鍏碂");
  await page.getByLabel("閫夐」 B").fill("B. 鏈夋潯涓嶇磰");
  await page.getByLabel("閫夐」 C").fill("C. 闅忔尝閫愭祦");
  await page.getByLabel("閫夐」 D").fill("D. 涓€鐭ュ崐瑙?);
  await page.getByLabel("瑙ｆ瀽").fill("鑷姩鍖栨祴璇曡В鏋愩€?);
  await page.getByLabel("鏉ユ簮", { exact: true }).fill("鑷姩鍖栨祴璇?);
  await page.getByLabel("鏉ユ簮璇存槑").fill("鏈湴娴嬭瘯鏁版嵁");
  await page.getByRole("button", { name: "淇濆瓨棰樼洰" }).click();
  await expect(page.getByText("鑷姩鍖栨祴璇曢锛氬仛浜嬮渶瑕佹湁鏉＄悊锛屼笉鑳絖_____銆?, { exact: true })).toBeVisible();
});

test("admin can add an idiom", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "棰樺簱鍚庡彴" }).click();
  await page.getByRole("tab", { name: /鎴愯绠＄悊/ }).click();
  await page.getByRole("button", { name: "鏂板鎴愯" }).click();
  await page.getByLabel("鎴愯", { exact: true }).fill("鑷姩鍖栨柊澧炴垚璇?);
  await page.getByLabel("鎷奸煶").fill("z矛 d貌ng hu脿 x墨n z膿ng");
  await page.getByLabel("閲婁箟").fill("鐢ㄤ簬楠岃瘉鍚庡彴鑳藉鏂板鎴愯璇嶆潯銆?);
  await page.getByLabel("渚嬪彞").fill("杩欐槸鑷姩鍖栨祴璇曠敤渚嬩腑鐨勬柊澧炴垚璇€?);
  await page.getByLabel("鍒嗙被", { exact: true }).fill("娴嬭瘯鏁版嵁");
  await page.getByLabel("鏉ユ簮璇存槑").fill("绔埌绔祴璇曟暟鎹?);
  await page.getByRole("button", { name: "淇濆瓨鎴愯" }).click();
  await expect(page.getByText("鑷姩鍖栨柊澧炴垚璇?, { exact: true })).toBeVisible();
});

test("admin can batch select questions and idioms", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "棰樺簱鍚庡彴" }).click();
  await page.getByLabel("鍏ㄩ€夐鐩?).check();
  await expect(page.getByRole("button", { name: "涓€閿彂甯? })).toBeVisible();
  await page.getByRole("tab", { name: /鎴愯绠＄悊/ }).click();
  await page.getByLabel("鍏ㄩ€夋垚璇?).check();
  await expect(page.getByRole("button", { name: "涓€閿牎瀹? })).toBeVisible();
  await expect(page.getByRole("button", { name: "鎵归噺鍒犻櫎" })).toBeVisible();
});

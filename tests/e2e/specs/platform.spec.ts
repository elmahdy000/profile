import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", title: /د\. محمود المهدي/, heading: /افهم منهجك/ },
  { path: "/baccalaureate", title: /البكالوريا/, heading: /ابنك هيتعلم برمجة/ },
  { path: "/kids", title: /للأطفال/, heading: /تعلم البرمجة/ },
  { path: "/university", title: /حاسبات|البرمجة/, heading: /مواد الجامعة/ },
  { path: "/curriculum", title: /المناهج/, heading: /مكتبة المناهج/ },
  { path: "/platform", title: /المنصة التعليمية/, heading: /أهلًا بيك/ },
] as const;

test.describe("public platform", () => {
  for (const route of publicRoutes) {
    test(`${route.path} renders with the correct metadata`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        route.heading,
      );
      await expect(page.locator('img[src]:not([src=""])')).not.toHaveCount(0);
    });
  }

  test("footer phone links are valid Egyptian international numbers", async ({
    page,
  }) => {
    await page.goto("/");

    const phoneLinks = page.locator('footer a[href^="tel:"]');
    await expect(phoneLinks).toHaveCount(3);
    const hrefs = await phoneLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );

    expect(hrefs).toEqual([
      "tel:+201044348610",
      "tel:+201066711545",
      "tel:+201272047933",
    ]);
    await expect(page.locator('footer a[href="#"]')).toHaveCount(0);
  });

  test("student registration and recovery forms are reachable", async ({
    page,
  }) => {
    await page.goto("/platform");

    await page.getByRole("button", { name: "تسجيل جديد" }).click();
    await expect(page.getByLabel("اسم الطالب")).toBeVisible();
    await expect(page.getByLabel("رقم الهاتف")).toBeVisible();
    await expect(page.getByLabel("المحافظة")).toBeVisible();
    await expect(page.getByLabel("المدينة / المركز")).toBeVisible();
    await expect(page.getByLabel("المرحلة الدراسية")).toBeVisible();

    await page.getByRole("button", { name: "دخول الطالب" }).click();
    await page.getByRole("button", { name: "نسيت كود الدخول؟" }).click();
    await expect(
      page.getByRole("heading", { name: "استرجاع كود الدخول" }),
    ).toBeVisible();
    await expect(page.getByLabel("رقم الموبايل المسجل")).toBeVisible();
  });

  test("unknown routes use 404 metadata and are not indexable", async ({
    page,
  }) => {
    await page.goto("/route-that-does-not-exist");

    await expect(page).toHaveTitle("الصفحة غير موجودة | د. محمود المهدي");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("٤٠٤");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });
});

test.describe("admin entry", () => {
  test("login screen is private and fits the viewport", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveTitle("لوحة إدارة المنصة | د. محمود المهدي");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
});

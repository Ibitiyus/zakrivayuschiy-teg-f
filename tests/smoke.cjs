const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, firefox } = require("playwright");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:8000/";
const output = process.env.ARTIFACTS_DIR;
const engine = process.env.BROWSER || "chromium";
let browser;
const near = (actual, expected, message, tolerance = 1) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: ${actual}, expected ${expected}`,
  );
(async () => {
  browser = await (engine === "firefox" ? firefox : chromium).launch(
    engine === "firefox"
      ? { headless: true }
      : {
          executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
          headless: true,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        },
  );
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  for (const width of [320, 360, 375, 376, 480, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("article.card").count(), 8);
    assert.equal(await page.locator(".card__label").count(), 8);
    assert.equal(await page.locator("dialog").evaluate((el) => el.open), false);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Horizontal overflow at ${width}`,
    );
    for (const image of await page.locator(".card__image").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((el) => el.decode());
      const box = await image.boundingBox();
      near(box.width, box.height, "Square image");
      assert.ok(await image.getAttribute("alt"));
    }
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const { x, y, width, height } = document
          .querySelector(selector)
          .getBoundingClientRect();
        return { x, y: y + scrollY, width, height };
      };
      return {
        header: rect(".header"),
        first: rect(".card"),
        logo: getComputedStyle(document.querySelector(".header__logo"))
          .fontSize,
        title: getComputedStyle(document.querySelector(".header__title"))
          .fontSize,
      };
    });
    near(layout.header.y, 100, "Header top");
    near(
      layout.first.y - layout.header.y - layout.header.height,
      100,
      "Header to cards gap",
    );
    if ([375, 1440].includes(width)) {
      near(
        layout.header.width,
        width === 375 ? 375 : 700,
        "Reference content width",
      );
      near(
        layout.header.height,
        width === 375 ? 327 : 368,
        "Reference header height",
      );
      near(
        parseFloat(layout.logo),
        width === 375 ? 49 : 65,
        "Reference logo font",
      );
      near(
        parseFloat(layout.title),
        width === 375 ? 14 : 23,
        "Reference title font",
      );
      if (output) {
        fs.mkdirSync(output, { recursive: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: path.join(output, `${engine}-${width}.png`),
          fullPage: true,
        });
      }
    }
    console.log(`PASS ${engine}: layout, fonts, images at ${width}px`);
  }
  const visual = await page.evaluate(() => {
    const style = (selector) =>
      getComputedStyle(document.querySelector(selector));
    return {
      filters: [...document.querySelectorAll(".card__image")].map(
        (el) => getComputedStyle(el).filter,
      ),
      blend: style(".card__label").mixBlendMode,
      stroke: style(".card__label").webkitTextStrokeWidth,
      fixed: style(".page").backgroundAttachment,
      backgrounds: style(".page").backgroundImage,
      fonts: [
        document.fonts.check("18px Inter"),
        document.fonts.check("14px PressStart2P"),
      ],
      buttonBlend: style(".button__text").mixBlendMode,
      iconBlend: style(".button__icon").mixBlendMode,
      weight: style(".page").fontVariationSettings,
    };
  });
  assert.ok(visual.fonts.every(Boolean));
  assert.ok(visual.fixed.split(", ").every((value) => value === "fixed"));
  assert.equal((visual.backgrounds.match(/gradient\(/g) || []).length, 3);
  assert.equal(visual.blend, "hard-light");
  assert.equal(visual.stroke, "1px");
  assert.equal(visual.buttonBlend, "difference");
  assert.equal(visual.iconBlend, "difference");
  assert.equal(
    new Set(visual.filters.filter((value) => value !== "none")).size,
    7,
  );
  assert.ok(
    visual.filters.some((value) => (value.match(/\(/g) || []).length > 1),
  );
  assert.match(visual.weight, /400/);
  console.log(
    "PASS fonts, background, label, seven distinct filters, blend modes",
  );
  for (let round = 0; round < 2; round++) {
    for (let index = 0; index < 8; index++) {
      const button = page.locator(".card__like-button").nth(index);
      const icon = page.locator(".card__icon-button").nth(index);
      await button.click();
      await page.waitForTimeout(550);
      assert.equal(await button.innerText(), "Unlike");
      assert.equal(await icon.getAttribute("aria-pressed"), "true");
      assert.ok(
        await icon
          .locator("svg")
          .evaluate((el) => el.classList.contains("is-liked")),
      );
      await icon.click();
      await page.waitForTimeout(550);
      assert.equal(await button.innerText(), "Like");
      assert.equal(await button.getAttribute("aria-pressed"), "false");
    }
    console.log(`PASS all eight like/unlike buttons, round ${round + 1}`);
  }
  const firstIcon = page.locator(".card__icon-button").first();
  await firstIcon.locator("svg").hover();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".like-icon .core")).fill ===
      "rgb(0, 0, 0)",
  );
  assert.equal(
    await firstIcon
      .locator(".core")
      .evaluate((el) => getComputedStyle(el).fill),
    "rgb(0, 0, 0)",
  );
  await page.mouse.down();
  await page.waitForTimeout(400);
  assert.equal(
    await firstIcon
      .locator(".main-body")
      .evaluate((el) => getComputedStyle(el).fill),
    "rgb(255, 0, 0)",
  );
  await page.mouse.up();
  await page.waitForTimeout(700);
  assert.ok(
    await firstIcon
      .locator("svg")
      .evaluate((el) => el.classList.contains("is-liked")),
  );
  await firstIcon.click();
  await page.waitForTimeout(600);
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "card__icon-button",
  );
  await page.waitForFunction(
    () =>
      getComputedStyle(document.activeElement).borderTopColor ===
      "rgb(0, 0, 0)",
  );

  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() =>
      document.activeElement.matches(".card__like-button:focus-visible"),
    ),
  );
  assert.notEqual(
    await page.evaluate(
      () => getComputedStyle(document.activeElement).boxShadow,
    ),
    "none",
  );
  const firstButton = page.locator(".card__like-button").first();
  await firstButton.hover();
  await page.waitForTimeout(600);
  assert.equal(
    await firstButton.evaluate(
      (el) => getComputedStyle(el, "::before").transform,
    ),
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  console.log("PASS heart hover/active, button hover, keyboard focus");
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.locator("#save-button").click();
    assert.equal(await page.locator("dialog").evaluate((el) => el.open), true);
    assert.equal(
      await page
        .locator("dialog")
        .evaluate((el) => getComputedStyle(el).display),
      "grid",
    );
    assert.match(
      await page
        .locator("dialog")
        .evaluate((el) => getComputedStyle(el, "::backdrop").backgroundColor),
      /0\.75/,
    );
    const modal = await page.locator("dialog").boundingBox();
    assert.ok(modal.x >= 0 && modal.x + modal.width <= width);
    assert.ok(
      await page
        .locator(".dialog__button")
        .evaluate((el) => el === document.activeElement),
    );
    if (output)
      await page.screenshot({
        path: path.join(output, `${engine}-dialog-${width}.png`),
      });
    await page.locator(".dialog__button").click();
    assert.equal(await page.locator("dialog").evaluate((el) => el.open), false);
    assert.ok(
      await page
        .locator("#save-button")
        .evaluate((el) => el === document.activeElement),
    );
    await page.locator("#save-button").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog").evaluate((el) => el.open), false);
  }
  console.log("PASS dialog on mobile/desktop, OK/Escape, focus restoration");
  await page.setViewportSize({ width: 375, height: 960 });
  const before = await page.locator(".card").first().boundingBox();
  await page
    .locator(".card")
    .first()
    .evaluate((el) => {
      for (const text of el.querySelectorAll("p,h2"))
        text.textContent = `${text.textContent} `.repeat(3);
    });
  const after = await page.locator(".card").first().boundingBox();
  const second = await page.locator(".card").nth(1).boundingBox();
  assert.ok(after.height > before.height);
  assert.ok(second.y >= after.y + after.height);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const motion = await firstIcon
    .locator(".core")
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  assert.ok(parseFloat(motion) < 0.001);
  console.log("PASS triple content and reduced-motion preference");
  assert.deepEqual(errors, [], "Browser/resource errors");
  console.log("PASS no JavaScript or resource errors");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
  });

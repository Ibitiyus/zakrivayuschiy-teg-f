const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 375, height: 900 },
    });
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:8000/");
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const result = await page.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      }),
    );
    console.log(
      JSON.stringify(
        result.violations.map((x) => ({
          id: x.id,
          impact: x.impact,
          help: x.help,
          nodes: x.nodes.map((n) => n.target),
        })),
      ),
    );
    await page.locator("#save-button").click();
    const modal = await page.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      }),
    );
    console.log(
      "Modal:",
      JSON.stringify(
        modal.violations.map((x) => ({
          id: x.id,
          nodes: x.nodes.map((n) => n.target),
        })),
      ),
    );
    if (result.violations.length || modal.violations.length)
      process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

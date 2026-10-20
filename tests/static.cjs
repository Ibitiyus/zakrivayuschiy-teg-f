const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");
const root = path.resolve(__dirname, "..");
const files = (directory) =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.name.startsWith(".")
        ? []
        : entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : [path.join(directory, entry.name)],
    );
for (const file of files(root))
  assert.ok(fs.statSync(file).size > 0, `Empty file: ${file}`);
const cssFiles = files(path.join(root, "styles")).concat(
  path.join(root, "fonts/fonts.css"),
);
for (const file of cssFiles) {
  const css = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  css.walkRules((rule) => {
    assert.ok(
      rule.nodes.some((node) => node.type !== "comment"),
      `Empty CSS rule: ${rule.selector}`,
    );
    const properties = new Set();
    for (const node of rule.nodes.filter((node) => node.type === "decl")) {
      assert.ok(
        !properties.has(node.prop),
        `Duplicate property: ${rule.selector} ${node.prop}`,
      );
      properties.add(node.prop);
      if (node.prop.startsWith("--"))
        assert.equal(path.basename(file), "variables.css");
      if (node.prop.startsWith("transition"))
        assert.ok(!/(^|[\s,])all([\s,]|$)/.test(node.value), "transition: all");
    }
  });
  const containers = new Map();
  css.walkRules((rule) => {
    let selectors = containers.get(rule.parent);
    if (!selectors) {
      selectors = new Set();
      containers.set(rule.parent, selectors);
    }
    assert.ok(
      !selectors.has(rule.selector),
      `Duplicate selector: ${rule.selector}`,
    );
    selectors.add(rule.selector);
  });
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(!/\sstyle\s*=/.test(html), "Inline styles");
assert.ok(html.indexOf("fonts/fonts.css") < html.indexOf("styles/globals.css"));
assert.ok(
  html.indexOf("styles/globals.css") < html.indexOf("styles/style.css"),
);
assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
assert.equal((html.match(/class="card"/g) || []).length, 8);
for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)(?:#[^"]*)?"/g))
  assert.ok(
    fs.existsSync(path.join(root, match[1])),
    `Missing resource ${match[1]}`,
  );
assert.ok(
  /format\("?woff2"?\) tech\("?variations"?\)/.test(
    fs.readFileSync(path.join(root, "fonts/fonts.css"), "utf8"),
  ),
);
assert.ok(
  fs
    .readFileSync(path.join(root, "fonts/fonts.css"), "utf8")
    .includes("woff2-variations"),
);
const css = fs.readFileSync(path.join(root, "styles/style.css"), "utf8");
assert.ok(css.includes("@supports"));
assert.ok(css.includes("-webkit-text-stroke"));
assert.ok(css.includes("text-stroke"));
assert.ok(css.includes("text-shadow"));
assert.equal((html.match(/<g class="heart">/g) || []).length, 8);
assert.equal((html.match(/<use\s/g) || []).length, 2);
console.log(
  "PASS files, CSS syntax/duplicates/variables, transitions, stylesheet order, local assets, fonts, SVG structure, label fallback",
);

const fontCode = fs.readFileSync(path.join(root, "fonts/fonts.css"), "utf8");
assert.ok(fontCode.includes("woff2 supports variations"));
assert.match(fontCode, /font-weight:\s*400 785/);
assert.match(
  fs.readFileSync(path.join(root, "styles/variables.css"), "utf8"),
  /--weight-heading:\s*785/,
);
console.log("PASS course-required variation formats and 400–785 weight range");

const fs = require("fs");
const path = require("path");

const FOOTER_LINKS_HTML = `
<a href="/privacy-policy.html">Privacy Policy</a> |
<a href="/terms-disclaimer.html">Terms &amp; Disclaimer</a> |
<a href="/data-retention.html">Data Retention</a>
`.trim();

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function listHtmlFiles(rootDir) {
  const results = [];
  const ignoreDirs = new Set([".git", "node_modules", ".github", "assets"]);
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ignoreDirs.has(ent.name)) continue;
        walk(full);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".html")) {
        results.push(full);
      }
    }
  }
  walk(rootDir);
  return results;
}

function ensureFooterLinks(html, linksHtml) {
  // If there's a <footer>, replace its content with the links (no duplication)
  if (/<footer[\s>]/i.test(html)) {
    return html.replace(/<footer[\s\S]*?<\/footer>/i, `<footer>${linksHtml}</footer>`);
  }
  // If no <footer>, inject a new one immediately above </body>
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `<footer>${linksHtml}</footer>\n</body>`);
  }
  // If no </body>, append at the end
  return html + `\n<footer>${linksHtml}</footer>\n`;
}

function main() {
  // (A) Confirm running in repo root
  if (!fileExists("contact.html") && !fileExists("index.html")) {
    console.error("Not in repo root: contact.html or index.html not found.");
    process.exit(1);
  }

  // (B) Create/overwrite legal pages
  const legalPages = [
    { file: "privacy-policy.html", title: "Privacy Policy", content: "<h1>Privacy Policy</h1><main><p>Your privacy matters. This page explains our privacy practices.</p></main>" },
    { file: "terms-disclaimer.html", title: "Terms & Disclaimer", content: "<h1>Terms & Disclaimer</h1><main><p>Read our terms and disclaimer carefully before using this site.</p></main>" },
    { file: "data-retention.html", title: "Data Retention", content: "<h1>Data Retention</h1><main><p>Learn how we retain and manage your data.</p></main>" }
  ];
  let template = "";
  if (fileExists("contact.html")) {
    template = readFile("contact.html");
  } else if (fileExists("index.html")) {
    template = readFile("index.html");
  }
  for (const page of legalPages) {
    let html = template;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${page.title}</title>`);
    html = html.replace(/<main[\s\S]*?<\/main>/i, page.content);
    html = ensureFooterLinks(html, FOOTER_LINKS_HTML);
    writeFile(page.file, html);
  }

  // (C) Update all root-level *.html except legal pages
  const allHtml = listHtmlFiles(".");
  const legalSet = new Set(legalPages.map(p => path.resolve(p.file)));
  for (const file of allHtml) {
    const abs = path.resolve(file);
    if (legalSet.has(abs)) continue;
    let html = readFile(file);
    const updated = ensureFooterLinks(html, FOOTER_LINKS_HTML);
    if (updated !== html) {
      writeFile(file, updated);
      console.log(`Updated footer in ${file}`);
    }
  }
}

if (require.main === module) {
  main();
}

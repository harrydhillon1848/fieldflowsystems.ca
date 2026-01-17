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

function ensureFooterLinks(html) {
  // If footer doesn't exist, don't change file.
  if (!/<footer\b[^>]*>/i.test(html)) return html;

  // If links already exist, don't change file.
  if (
    html.includes("/privacy-policy.html") &&
    html.includes("/terms-disclaimer.html") &&
    html.includes("/data-retention.html")
  ) {
    return html;
  }

  // Replace entire footer inner HTML with footer links
  // (safe + simple)
  return html.replace(
    /<footer\b[^>]*>[\s\S]*?<\/footer>/i,
    `<footer>${FOOTER_LINKS_HTML}</footer>`
  );
}

function writeLegalPage(filename, title, bodyHtml) {
  const templatePath = path.join(process.cwd(), "contact.html");
  if (!fileExists(templatePath)) {
    throw new Error("contact.html not found at repo root. Cannot use as template.");
  }

  const template = readFile(templatePath);

  // Replace <title>
  let out = template.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${title}</title>`
  );

  // Replace main content
  const mainMatch = out.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  if (!mainMatch) {
    throw new Error("No <main>...</main> found in contact.html template.");
  }

  out = out.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, `<main>${bodyHtml}</main>`);

  // Ensure footer links if footer exists
  out = ensureFooterLinks(out);

  const targetPath = path.join(process.cwd(), filename);
  writeFile(targetPath, out);
  console.log(`Created/updated: ${filename}`);
}

function main() {
  // Create legal pages
  writeLegalPage(
    "privacy-policy.html",
    "Privacy Policy | FieldFlow Systems",
    `<h1>Privacy Policy</h1>
<p>FieldFlow Systems respects your privacy and is committed to protecting personal information.</p>
<h2>Information We Collect</h2>
<p>Information you submit through our website forms (such as name, email, company, and project details).</p>
<h2>How We Use Information</h2>
<p>To respond to inquiries, deliver requested services, and improve our offerings.</p>
<h2>Data Retention</h2>
<p>See our <a href="/data-retention.html">Data Retention Policy</a>.</p>
<h2>Contact</h2>
<p>Email: <a href="mailto:hello@fieldflowsystems.ca">hello@fieldflowsystems.ca</a></p>`
  );

  writeLegalPage(
    "terms-disclaimer.html",
    "Terms & Disclaimer | FieldFlow Systems",
    `<h1>Terms &amp; Disclaimer</h1>
<p>By using this site, you agree to these terms.</p>
<h2>No Professional Advice</h2>
<p>Information on this website is provided for general informational purposes only.</p>
<h2>Limitation of Liability</h2>
<p>FieldFlow Systems is not liable for damages arising from the use of this site.</p>`
  );

  writeLegalPage(
    "data-retention.html",
    "Data Retention | FieldFlow Systems",
    `<h1>Data Retention Policy</h1>
<p>We retain only the minimum data needed to provide services and operate effectively.</p>
<h2>Retention Period</h2>
<p>Client/project operational data may be retained as required by engagement scope.</p>
<h2>Deletion</h2>
<p>Data may be deleted or anonymized when no longer required for operational or legal purposes.</p>`
  );

  // Add footer links to all HTML files (only if footer exists)
  const htmlFiles = listHtmlFiles(process.cwd());

  for (const f of htmlFiles) {
    const original = readFile(f);
    const updated = ensureFooterLinks(original);
    if (updated !== original) {
      writeFile(f, updated);
      console.log(`Updated footer links: ${path.basename(f)}`);
    }
  }

  console.log("Done.");
}

main();

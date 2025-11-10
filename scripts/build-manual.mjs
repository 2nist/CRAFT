#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const configPath = path.join(root, 'docs', 'manual', 'manual.config.json');
const pkgPath = path.join(root, 'package.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const version = config.versionFromPackage ? pkg.version : (config.version || '0.0.0');
const date = new Date().toISOString().split('T')[0];

const srcDir = path.join(root, config.sourceDir);
const outDir = path.join(root, 'docs', 'manual');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const heading = `# ${config.title}\n\nVersion: ${version}  |  Date: ${date}\n\n---\n\n`;

const files = config.include.map(f => path.join(srcDir, f)).filter(f => fs.existsSync(f));
if (!files.length) {
  console.error('No source files found for manual.');
  process.exit(1);
}

let combined = heading;
combined += '## Table of Contents\n\n';
config.include.forEach(file => {
  const base = path.basename(file, path.extname(file));
  const safe = base.replace(/_/g, ' ');
  combined += `- [${safe}](#${safe.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/ /g,'-')})\n`;
});
combined += '\n---\n\n';

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const adjusted = content.replace(/^# /gm, '## ');
  combined += adjusted.trim() + '\n\n';
}

const mdOut = path.join(root, config.outputMd || 'docs/manual/Manual.md');
fs.writeFileSync(mdOut, combined, 'utf8');
console.log('Wrote combined markdown manual to', mdOut);

function hasPandoc() {
  try { execSync('pandoc -v', { stdio: 'ignore' }); return true; } catch { return false; }
}

if (hasPandoc()) {
  const pdfOut = path.join(root, config.outputPdf || 'docs/manual/Manual.pdf');
  try {
    execSync(`pandoc \"${mdOut}\" -o \"${pdfOut}\" --from markdown --pdf-engine=xelatex`, { stdio: 'inherit' });
    console.log('Generated PDF manual at', pdfOut);
  } catch (e) {
    console.warn('Pandoc PDF generation failed:', e.message);
  }
} else {
  console.warn('Pandoc not found: skipping PDF generation. Install pandoc + LaTeX for PDF.');
}

let htmlOutPath = path.join(root, config.outputHtml || 'docs/manual/Manual.html');
let htmlGenerated = false;
try {
  const { marked } = await import('marked');
  const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${config.title}</title><style>@page{margin:20mm;} body{font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:40px auto;line-height:1.5;} pre{background:#f5f5f5;padding:12px;overflow:auto;} code{background:#f0f0f0;padding:2px 4px;border-radius:3px;} h1,h2,h3{border-bottom:1px solid #ddd;padding-bottom:4px;} h1{page-break-before:always;} h1:first-of-type{page-break-before:auto;} table{border-collapse:collapse;} table,th,td{border:1px solid #ccc;padding:6px;}</style></head><body>${marked.parse(combined)}</body></html>`;
  fs.writeFileSync(htmlOutPath, html, 'utf8');
  htmlGenerated = true;
  console.log('Generated HTML manual at', htmlOutPath);
} catch (e) {
  fs.writeFileSync(htmlOutPath, combined, 'utf8');
  console.log('Fallback: wrote raw markdown to HTML path (install marked for HTML rendering).');
}

if (htmlGenerated) {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('file://' + htmlOutPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    const pdfOut = path.join(root, config.outputPdf || 'docs/manual/Manual.pdf');
    await page.pdf({
      path: pdfOut,
      format: 'Letter',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    await browser.close();
    console.log('Generated PDF manual at', pdfOut);
  } catch (e) {
    console.warn('Puppeteer PDF generation skipped or failed:', e.message);
  }
}

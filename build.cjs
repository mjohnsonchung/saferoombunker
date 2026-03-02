/**
 * build.cjs — Full build script for saferoombunker.com
 * 1. Runs Tailwind CSS purge/minify → styles.css
 * 2. Reads styles.css and inlines it into every HTML page
 * 3. Removes the dead tailwind.config script block if present
 *
 * Usage: node build.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const base = __dirname;

const pages = [
  'index.html','404.html','privacy.html','about.html','why-nz.html',
  'contact.html','services.html','terms.html',
  'new-zealand-best-bunker-location.html',
  'plans/the-citadel.html','plans/the-sentinel.html',
  'plans/the-redoubt.html','plans/the-sovereign.html'
];

// Step 1: Run Tailwind build
console.log('Building styles.css...');
execSync(
  '"' + path.join(base, 'node_modules/.bin/tailwindcss.cmd') + '"' +
  ' -i tailwind.input.css -o styles.css --minify',
  { cwd: base, stdio: 'inherit', shell: true }
);

// Step 2: Read output
const css = fs.readFileSync(path.join(base, 'styles.css'), 'utf8');
const inlineStyle = `<style>${css}</style>`;

// Patterns to replace
const linkTagRe = /<link rel="stylesheet" href="[^"]*styles\.css">/g;
// Remove the tailwind.config script block (dead code since CDN removal)
const tailwindConfigRe = /<script>\s*tailwind\.config\s*=[\s\S]*?<\/script>\s*/g;

let updatedCount = 0;

pages.forEach(f => {
  const fp = path.join(base, f);
  if (!fs.existsSync(fp)) { console.warn('  SKIP (not found):', f); return; }

  let content = fs.readFileSync(fp, 'utf8');
  const original = content;

  // Remove dead tailwind.config script if present
  content = content.replace(tailwindConfigRe, '');

  // Replace external stylesheet link with inline style
  content = content.replace(linkTagRe, inlineStyle);

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('  Updated:', f);
    updatedCount++;
  } else {
    console.log('  No change:', f);
  }
});

console.log(`\nDone. ${updatedCount} page(s) updated.`);
console.log('Remember to commit styles.css + all modified HTML pages.');

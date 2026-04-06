#!/usr/bin/env node
/**
 * upgrade-promptfoo.mjs
 *
 * Merges your AI Security custom changes onto a fresh / upgraded promptfoo codebase.
 *
 * Usage:
 *   node scripts/upgrade-promptfoo.mjs            # apply all custom changes
 *   node scripts/upgrade-promptfoo.mjs --check    # dry-run: show what would change
 *   node scripts/upgrade-promptfoo.mjs --export   # export current state as patches (run BEFORE upgrading)
 *
 * What this script does:
 *   GROUP A  – Copies new files that only exist in your version (Executive Report)
 *   GROUP B  – Applies small additions to existing files (route, nav, App)
 *   GROUP C  – Applies report changes (framework compliance toggle, category filter)
 *   GROUP D  – Re-applies infrastructure fixes (dist structure, shebang)
 *   GROUP E  – Re-applies branding (AI Security rename)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PATCHES_DIR = path.join(__dirname, 'custom-changes');

const DRY_RUN = process.argv.includes('--check');
const EXPORT_MODE = process.argv.includes('--export');

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`  ${msg}`);
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`);
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function writeFile(rel, content) {
  if (DRY_RUN) {
    log(`[DRY RUN] would write: ${rel}`);
    return;
  }
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  log(`✓ wrote: ${rel}`);
}

function copyDir(srcRel, destRel) {
  if (DRY_RUN) {
    log(`[DRY RUN] would copy dir: ${srcRel} → ${destRel}`);
    return;
  }
  const src = path.join(ROOT, srcRel);
  const dest = path.join(ROOT, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  log(`✓ copied dir: ${srcRel} → ${destRel}`);
}

function copyFile(srcRel, destRel) {
  if (DRY_RUN) {
    log(`[DRY RUN] would copy: ${srcRel} → ${destRel}`);
    return;
  }
  const dest = path.join(ROOT, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, srcRel), dest);
  log(`✓ copied: ${destRel}`);
}

/**
 * Insert `insertion` after the first line matching `afterPattern` in `content`.
 * Returns null if pattern not found (signals manual intervention needed).
 */
function insertAfter(content, afterPattern, insertion) {
  const lines = content.split('\n');
  const idx = lines.findIndex((l) => afterPattern.test(l));
  if (idx === -1) { return null; }
  lines.splice(idx + 1, 0, insertion);
  return lines.join('\n');
}

function warn(msg) {
  console.warn(`  ⚠  ${msg}`);
}

function applyGitPatch(patchFile) {
  if (DRY_RUN) {
    log(`[DRY RUN] would apply patch: ${patchFile}`);
    return true;
  }
  try {
    execSync(`git apply --3way "${patchFile}"`, { cwd: ROOT, stdio: 'pipe' });
    log(`✓ patch applied: ${path.basename(patchFile)}`);
    return true;
  } catch (e) {
    warn(`Patch had conflicts: ${path.basename(patchFile)} — fix manually then continue`);
    warn(e.stderr?.toString().trim() || e.message);
    return false;
  }
}

// ─── EXPORT MODE ────────────────────────────────────────────────────────────

function exportMode() {
  section('EXPORT: Saving current custom state as patches');

  fs.mkdirSync(PATCHES_DIR, { recursive: true });

  // Save patch for all modified source files
  const filesToPatch = [
    'src/app/src/App.tsx',
    'src/app/src/constants/routes.ts',
    'src/app/src/components/Navigation.tsx',
    'src/app/src/components/Logo.tsx',
    'src/app/src/pages/redteam/report/components/Report.tsx',
    'src/app/src/pages/redteam/report/components/store.ts',
    'src/app/src/pages/redteam/report/components/ReportSettingsDialogButton.tsx',
    'src/app/src/pages/eval/components/Eval.tsx',
    'src/app/src/pages/history/History.tsx',
    'src/app/src/pages/launcher/page.tsx',
    'src/app/src/pages/login.tsx',
  ];

  try {
    const patch = execSync(
      `git diff HEAD~2 -- ${filesToPatch.map((f) => `"${f}"`).join(' ')}`,
      { cwd: ROOT },
    ).toString();
    fs.writeFileSync(path.join(PATCHES_DIR, 'source-changes.patch'), patch);
    log(`✓ saved: scripts/custom-changes/source-changes.patch`);
  } catch (e) {
    warn(`Could not generate patch: ${e.message}`);
  }

  // Save executive-report files as a snapshot
  const execReportSrc = path.join(ROOT, 'src/app/src/pages/executive-report');
  const execReportDest = path.join(PATCHES_DIR, 'executive-report-snapshot');
  if (fs.existsSync(execReportSrc)) {
    fs.rmSync(execReportDest, { recursive: true, force: true });
    fs.cpSync(execReportSrc, execReportDest, { recursive: true });
    log(`✓ saved: scripts/custom-changes/executive-report-snapshot/`);
  }

  // Save asset files
  const assets = [
    'src/app/src/assets/logo.svg',
    'src/app/public/favicon.ico',
    'src/app/public/favicon.png',
    'src/app/public/favicon-16x16.png',
    'src/app/public/favicon-32x32.png',
    'src/app/index.html',
  ];
  const assetsDest = path.join(PATCHES_DIR, 'assets-snapshot');
  fs.mkdirSync(assetsDest, { recursive: true });
  for (const asset of assets) {
    const src = path.join(ROOT, asset);
    if (fs.existsSync(src)) {
      const dest = path.join(assetsDest, path.basename(asset));
      fs.copyFileSync(src, dest);
      log(`✓ saved asset: ${path.basename(asset)}`);
    }
  }

  console.log('\n✅ Export complete. Commit scripts/custom-changes/ then upgrade promptfoo.');
}

// ─── APPLY MODE ─────────────────────────────────────────────────────────────

function applyMode() {
  const results = { ok: [], failed: [], skipped: [] };

  // ── GROUP A: New files (Executive Report) ─────────────────────────────────
  section('GROUP A: New files — Executive Report');

  const execReportSnapshot = path.join(PATCHES_DIR, 'executive-report-snapshot');
  const execReportDest = 'src/app/src/pages/executive-report';

  if (fs.existsSync(execReportSnapshot)) {
    copyDir(
      path.relative(ROOT, execReportSnapshot),
      execReportDest,
    );
    results.ok.push('executive-report pages');
  } else {
    // Fallback: check if the folder already exists in the repo
    if (fs.existsSync(path.join(ROOT, execReportDest))) {
      log('executive-report folder already present — skipping');
      results.skipped.push('executive-report (already exists)');
    } else {
      warn('No snapshot found and no existing folder. Run --export first or copy manually.');
      results.failed.push('executive-report pages — no source found');
    }
  }

  // ── GROUP B: Small additions to existing files ─────────────────────────────
  section('GROUP B: Route, Nav, App additions');

  // routes.ts — add EXECUTIVE_REPORT constant
  {
    const rel = 'src/app/src/constants/routes.ts';
    const content = readFile(rel);
    if (content.includes('EXECUTIVE_REPORT')) {
      log(`skip routes.ts (already has EXECUTIVE_REPORT)`);
      results.skipped.push('routes.ts');
    } else {
      // Insert after the last route constant (before closing brace/export)
      const updated = insertAfter(
        content,
        /REDTEAM.*:.*'/,
        `  EXECUTIVE_REPORT: '/executive-report',`,
      );
      if (updated) {
        writeFile(rel, updated);
        results.ok.push('routes.ts');
      } else {
        warn(`routes.ts: could not find insertion point — add manually:\n    EXECUTIVE_REPORT: '/executive-report',`);
        results.failed.push('routes.ts');
      }
    }
  }

  // Navigation.tsx — add Executive Risk Dashboard nav item
  {
    const rel = 'src/app/src/components/Navigation.tsx';
    const content = readFile(rel);
    if (content.includes('executive-report')) {
      log(`skip Navigation.tsx (already has executive-report)`);
      results.skipped.push('Navigation.tsx');
    } else {
      const navItem = `  {
    href: '/executive-report',
    label: 'Executive Risk Dashboard',
    description: 'A focused, interactive, and concise view of your red team posture',
  },`;
      // Insert after the Report nav item
      const updated = insertAfter(content, /href.*report.*\bReport\b|href.*\/report/, navItem);
      if (updated) {
        writeFile(rel, updated);
        results.ok.push('Navigation.tsx');
      } else {
        warn(`Navigation.tsx: could not auto-insert nav item — add manually`);
        results.failed.push('Navigation.tsx');
      }
    }
  }

  // App.tsx — add import + route
  {
    const rel = 'src/app/src/App.tsx';
    const content = readFile(rel);
    if (content.includes('executive-report')) {
      log(`skip App.tsx (already has executive-report)`);
      results.skipped.push('App.tsx');
    } else {
      // Add import after last page import
      let updated = insertAfter(
        content,
        /^import.*pages\/redteam.*page/,
        `import ExecutiveReportPage from './pages/executive-report/page';`,
      );
      if (!updated) {
        updated = insertAfter(
          content,
          /^import.*Page.*from.*pages/,
          `import ExecutiveReportPage from './pages/executive-report/page';`,
        );
      }

      if (updated) {
        // Add route before closing Routes tag or after last Route
        const withRoute = insertAfter(
          updated,
          /<Route.*path.*\/report|<Route.*redteam/,
          `          <Route path="/executive-report" element={<ExecutiveReportPage />} />`,
        );
        if (withRoute) {
          writeFile(rel, withRoute);
          results.ok.push('App.tsx');
        } else {
          warn(`App.tsx: added import but could not add route — add manually:\n    <Route path="/executive-report" element={<ExecutiveReportPage />} />`);
          results.failed.push('App.tsx route');
        }
      } else {
        warn(`App.tsx: could not add import — add manually`);
        results.failed.push('App.tsx import');
      }
    }
  }

  // ── GROUP C: Report changes ────────────────────────────────────────────────
  section('GROUP C: Report changes (patch)');

  const patchFile = path.join(PATCHES_DIR, 'source-changes.patch');
  if (fs.existsSync(patchFile)) {
    const ok = applyGitPatch(patchFile);
    if (ok) {
      results.ok.push('source-changes.patch (Report.tsx, store.ts, etc.)');
    } else {
      results.failed.push('source-changes.patch — resolve conflicts manually');
    }
  } else {
    warn('No source-changes.patch found. Run --export first, or apply manually:');
    warn('  Report.tsx: add showFrameworkCompliance toggle + URL category filter');
    warn('  store.ts: add showFrameworkCompliance state');
    warn('  ReportSettingsDialogButton.tsx: add Switch import + toggle UI');
    results.failed.push('source-changes.patch (missing)');
  }

  // ── GROUP D: Infrastructure (dist structure + shebang) ────────────────────
  section('GROUP D: Infrastructure — dist restructure + shebang fix');

  // tsdown.config.ts
  {
    const rel = 'tsdown.config.ts';
    let content = readFile(rel);
    let changed = false;

    if (content.includes("outDir: 'dist/src'")) {
      content = content.replaceAll("outDir: 'dist/src'", "outDir: 'dist'");
      changed = true;
    }
    if (content.includes("outputOptions: {") && content.includes("banner: '#!/usr/bin/env node'")) {
      content = content.replace(
        /outputOptions:\s*\{\s*banner:\s*'#!\/usr\/bin\/env node',?\s*\},/,
        `banner: '#!/usr/bin/env node',`,
      );
      changed = true;
    }
    if (changed) {
      writeFile(rel, content);
      results.ok.push('tsdown.config.ts');
    } else {
      log('tsdown.config.ts already up to date');
      results.skipped.push('tsdown.config.ts');
    }
  }

  // package.json
  {
    const rel = 'package.json';
    let content = readFile(rel);
    if (content.includes('dist/src/')) {
      content = content.replaceAll('dist/src/', 'dist/');
      writeFile(rel, content);
      results.ok.push('package.json');
    } else {
      log('package.json already up to date');
      results.skipped.push('package.json');
    }
  }

  // vite.config.ts
  {
    const rel = 'src/app/vite.config.ts';
    let content = readFile(rel);
    if (content.includes('dist/src/app')) {
      content = content.replaceAll('dist/src/app', 'dist/app');
      writeFile(rel, content);
      results.ok.push('vite.config.ts');
    } else {
      log('vite.config.ts already up to date');
      results.skipped.push('vite.config.ts');
    }
  }

  // tsconfig.app.json
  {
    const rel = 'src/app/tsconfig.app.json';
    let content = readFile(rel);
    if (content.includes('dist/src/app')) {
      content = content.replaceAll('dist/src/app', 'dist/app');
      writeFile(rel, content);
      results.ok.push('tsconfig.app.json');
    } else {
      log('tsconfig.app.json already up to date');
      results.skipped.push('tsconfig.app.json');
    }
  }

  // scripts/postbuild.ts
  {
    const rel = 'scripts/postbuild.ts';
    let content = readFile(rel);
    if (content.includes(`path.join(DIST, 'src'`) || content.includes('dist/src/')) {
      content = content
        .replaceAll(`path.join(DIST, 'src',`, 'path.join(DIST,')
        .replaceAll(`path.join(DIST, 'src')`, 'path.join(DIST)')
        .replaceAll("dist/src/", 'dist/')
        .replaceAll("'dist/src'", "'dist'")
        .replaceAll('"dist/src"', '"dist"');
      writeFile(rel, content);
      results.ok.push('scripts/postbuild.ts');
    } else {
      log('postbuild.ts already up to date');
      results.skipped.push('postbuild.ts');
    }
  }

  // GitHub workflows
  for (const wf of ['.github/workflows/main.yml', '.github/workflows/deploy-launcher.yml']) {
    const rel = wf;
    if (!fs.existsSync(path.join(ROOT, rel))) { continue; }
    let content = readFile(rel);
    if (content.includes('dist/src/')) {
      content = content.replaceAll('dist/src/', 'dist/');
      writeFile(rel, content);
      results.ok.push(rel);
    } else {
      log(`${rel} already up to date`);
      results.skipped.push(rel);
    }
  }

  // knip.json
  {
    const rel = 'knip.json';
    if (fs.existsSync(path.join(ROOT, rel))) {
      let content = readFile(rel);
      if (content.includes('dist/src/')) {
        content = content.replaceAll('dist/src/', 'dist/');
        writeFile(rel, content);
        results.ok.push('knip.json');
      } else {
        log('knip.json already up to date');
        results.skipped.push('knip.json');
      }
    }
  }

  // ── GROUP E: Branding ─────────────────────────────────────────────────────
  section('GROUP E: Assets (logo, favicon)');

  const assetsSnapshot = path.join(PATCHES_DIR, 'assets-snapshot');
  const assetMap = {
    'logo.svg': 'src/app/src/assets/logo.svg',
    'favicon.ico': 'src/app/public/favicon.ico',
    'favicon.png': 'src/app/public/favicon.png',
    'favicon-16x16.png': 'src/app/public/favicon-16x16.png',
    'favicon-32x32.png': 'src/app/public/favicon-32x32.png',
    'index.html': 'src/app/index.html',
  };

  if (fs.existsSync(assetsSnapshot)) {
    for (const [file, dest] of Object.entries(assetMap)) {
      const src = path.join(assetsSnapshot, file);
      if (fs.existsSync(src)) {
        copyFile(path.relative(ROOT, src), dest);
        results.ok.push(`asset: ${file}`);
      }
    }
  } else {
    warn('No assets-snapshot found — copy logo/favicon manually after running --export');
    results.skipped.push('assets (no snapshot)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log(`  ✅ OK      : ${results.ok.length} items`);
  if (results.skipped.length) { console.log(`  ⏭  Skipped : ${results.skipped.length} (already applied)`); }
  if (results.failed.length) {
    console.log(`  ❌ Failed  : ${results.failed.length} items — fix manually:`);
    results.failed.forEach((f) => console.log(`     • ${f}`));
  }
  console.log('═'.repeat(55));

  if (results.failed.length === 0) {
    console.log('\n  Next: npm run build\n');
  } else {
    console.log('\n  Fix the items above, then: npm run build\n');
  }
}

// ─── Entry ───────────────────────────────────────────────────────────────────

if (EXPORT_MODE) {
  exportMode();
} else {
  applyMode();
}

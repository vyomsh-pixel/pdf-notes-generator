import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
const isInsideFrontend = path.basename(currentFileDir) === 'frontend';
const projectRoot = isInsideFrontend ? path.resolve(currentFileDir, '..') : currentFileDir;
const frontendDir = path.resolve(projectRoot, 'frontend');

console.log(`[build.mjs] projectRoot: ${projectRoot}`);
console.log(`[build.mjs] frontendDir: ${frontendDir}`);

// Run Vite build inside the frontend directory
cp.execSync('npx vite build', {
  cwd: frontendDir,
  stdio: 'inherit',
});

const sourceDist = path.resolve(frontendDir, 'dist');
if (!fs.existsSync(sourceDist)) {
  console.error(`[build.mjs] ERROR: Vite build output not found at ${sourceDist}`);
  process.exit(1);
}

// Copy build output to all potential directories expected by Vercel
const targetDirs = [
  path.resolve(projectRoot, 'dist'),
  path.resolve(frontendDir, 'dist'),
  path.resolve(projectRoot, '.vercel', 'output', 'static'),
  path.resolve(frontendDir, '.vercel', 'output', 'static'),
];

for (const target of targetDirs) {
  try {
    if (path.resolve(target) === path.resolve(sourceDist)) continue;
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(sourceDist, target, { recursive: true, force: true });
    console.log(`[build.mjs] Synced build output -> ${target}`);
  } catch (err) {
    console.warn(`[build.mjs] Sync warning for ${target}:`, err.message);
  }
}
console.log('[build.mjs] Build and sync complete.');

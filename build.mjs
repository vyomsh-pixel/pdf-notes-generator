import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';

const inRoot = fs.existsSync('frontend') && fs.statSync('frontend').isDirectory();
const frontendDir = inRoot ? path.resolve('frontend') : process.cwd();

console.log(`[build.mjs] Building Vite frontend in ${frontendDir} (inRoot=${inRoot})`);

cp.execSync('npx vite build', {
  cwd: frontendDir,
  stdio: 'inherit',
});

// Ensure output is available at both 'dist' and 'frontend/dist' regardless of working directory
const rootDist = inRoot ? path.resolve('dist') : path.resolve('..', 'dist');
const frontendDist = inRoot ? path.resolve('frontend', 'dist') : path.resolve('dist');

try {
  if (fs.existsSync(frontendDist) && !fs.existsSync(rootDist)) {
    fs.cpSync(frontendDist, rootDist, { recursive: true });
    console.log(`[build.mjs] Mirrored ${frontendDist} -> ${rootDist}`);
  } else if (fs.existsSync(rootDist) && !fs.existsSync(frontendDist)) {
    fs.mkdirSync(path.dirname(frontendDist), { recursive: true });
    fs.cpSync(rootDist, frontendDist, { recursive: true });
    console.log(`[build.mjs] Mirrored ${rootDist} -> ${frontendDist}`);
  }
} catch (err) {
  console.warn('[build.mjs] Warning while mirroring dist:', err.message);
}

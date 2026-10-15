const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const inRoot = fs.existsSync('frontend') && fs.statSync('frontend').isDirectory();
const targetDir = inRoot ? path.resolve('frontend') : process.cwd();

console.log(`[build.js] Building frontend in ${targetDir} (inRoot=${inRoot})`);

cp.execSync('npm run build', {
  cwd: targetDir,
  stdio: 'inherit',
});

// Ensure build output exists in both locations so any Vercel rootDirectory/outputDirectory setting succeeds
const rootDist = inRoot ? path.resolve('dist') : path.resolve('..', 'dist');
const frontendDist = inRoot ? path.resolve('frontend', 'dist') : path.resolve('dist');

try {
  if (fs.existsSync(frontendDist)) {
    fs.cpSync(frontendDist, rootDist, { recursive: true });
    console.log(`[build.js] Mirrored ${frontendDist} -> ${rootDist}`);
  }
} catch (err) {
  console.warn('[build.js] Warning while mirroring dist:', err.message);
}

/**
 * JARVIS Web Build Script for Vercel
 * Copies static web frontend assets to `public/` directory for Vercel deployment.
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const filesToCopy = ['index.html', 'style.css', 'renderer.js', 'web-bridge.js'];
filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[Build] Copied ${file} -> public/${file}`);
  }
});

const audioDir = path.join(__dirname, 'audio');
if (fs.existsSync(audioDir)) {
  const destAudio = path.join(publicDir, 'audio');
  if (!fs.existsSync(destAudio)) fs.mkdirSync(destAudio, { recursive: true });
  fs.readdirSync(audioDir).forEach(f => {
    fs.copyFileSync(path.join(audioDir, f), path.join(destAudio, f));
  });
}

console.log('[Build] JARVIS Web outputDirectory successfully prepared at public/');

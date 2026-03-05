/**
 * Copie le worker PDF.js depuis node_modules vers public/ pour que Vite le serve.
 * Exécuté après npm install (postinstall).
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
let pdfjsRoot;
try {
  pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
} catch (e) {
  console.warn('copy-pdf-worker: pdfjs-dist non trouvé, exécutez npm install.');
  process.exit(0);
}

const src = path.join(pdfjsRoot, 'build', 'pdf.worker.min.mjs');
const publicDir = path.join(projectRoot, 'public');
const dest = path.join(publicDir, 'pdf.worker.min.mjs');

if (!fs.existsSync(src)) {
  console.warn('copy-pdf-worker: fichier worker non trouvé:', src);
  process.exit(0);
}

try {
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('PDF.js worker copié dans public/pdf.worker.min.mjs');
} catch (e) {
  console.warn('copy-pdf-worker:', e.message);
}

const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node scripts/extract-pdf-text.cjs <chemin-pdf>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);
pdf(dataBuffer).then((data) => {
  console.log('--- Pages:', data.numpages);
  console.log('--- Texte extrait:\n');
  console.log(data.text);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node scripts/extract-pdf-text.js <chemin-pdf>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);
const data = await pdfParse(dataBuffer);
console.log('--- Pages:', data.numpages);
console.log('--- Texte extrait:\n');
console.log(data.text);

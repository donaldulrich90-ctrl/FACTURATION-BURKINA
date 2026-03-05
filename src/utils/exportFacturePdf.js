import { jsPDF } from 'jspdf';
import { montantArreteLibelle } from './factureCalcul';

const TITLES = { proforma: 'FACTURE PROFORMA N°', definitive: 'FACTURE DÉFINITIVE N°', bl: 'BON DE LIVRAISON N°' };
const ARRETE_LIBELLES = {
  proforma: 'Arrêté la présente facture proforma à la somme de :',
  definitive: 'Arrêté la présente facture définitive à la somme de :',
  bl: 'Arrêté le présent bon de livraison à la somme de :',
};
const PALETTES = {
  bleu: { primary: [29, 78, 216], light: [219, 234, 254] },
  vert: { primary: [5, 150, 105], light: [209, 250, 229] },
  bordeaux: { primary: [185, 28, 28], light: [254, 226, 226] },
};

function formatNum(n) {
  const num = Math.round(Number(n) || 0);
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Découpe le texte pour affichage multiligne (retour à la ligne automatique). */
function wrapText(doc, text, maxWidth) {
  if (!text) return [];
  const lines = doc.splitTextToSize(String(text), maxWidth);
  return Array.isArray(lines) ? lines : [String(text)];
}

/**
 * Exporte une facture en PDF en VECTEUR (texte et lignes nets à tout zoom).
 * Alternative à html2canvas : rendu 100 % vectoriel pour qualité maximale.
 */
export async function exportFacturePdfVector(data) {
  const {
    numero = 'FAC-2025-0001',
    docType = 'proforma',
    dateFacture,
    emetteur = {},
    client = {},
    marche = {},
    items = [],
    totaux = {},
    modeFacture = 'simple',
    tvaAppliquee = true,
    theme = {},
    showCachet = false,
    showSignature = false,
  } = data;

  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: false });
  doc.setLineWidth(0.1);
  const margin = 18;
  const pageW = 210;
  const contentW = pageW - 2 * margin;
  let y = 18;

  const palette = PALETTES[theme?.palette] || PALETTES.bleu;
  const toDataUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:image/')) return url;
    if (url.startsWith('http') && typeof fetch === 'function') {
      try {
        const r = await fetch(url, { mode: 'cors' });
        const blob = await r.blob();
        return await new Promise((res, rej) => {
          const rd = new FileReader();
          rd.onload = () => res(rd.result);
          rd.onerror = rej;
          rd.readAsDataURL(blob);
        });
      } catch (_) { return null; }
    }
    return null;
  };
  let logoDataUrl = await toDataUrl(emetteur.logoUrl);
  const signatureDataUrl = showSignature ? await toDataUrl(emetteur.signatureUrl) : null;
  const cachetDataUrl = showCachet ? await toDataUrl(emetteur.cachetUrl) : null;
  const addText = (text, x, yy, opts = {}) => {
    doc.setFontSize(opts.size || 10);
    doc.setFont('helvetica', opts.style || 'normal');
    if (opts.color) doc.setTextColor(...opts.color);
    doc.text(String(text), x, yy, opts.align ? { align: opts.align } : undefined);
    doc.setTextColor(0, 0, 0);
  };

  // En-tête : Logo + Émetteur
  const logoW = 45;
  const logoH = 28;
  if (logoDataUrl && (logoDataUrl.startsWith('data:image/png') || logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg'))) {
    try {
      const fmt = logoDataUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(logoDataUrl, fmt, margin, y, logoW, logoH);
    } catch (_) {}
  }
  const emetteurX = margin + (logoDataUrl ? logoW + 8 : 0);
  const emetteurW = pageW - margin - emetteurX;
  const nameLines = wrapText(doc, emetteur.name || 'Société Émettrice', emetteurW - 4);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(palette.primary || [29, 78, 216]));
  nameLines.forEach((line, i) => { doc.text(line, emetteurX + emetteurW - 4, y + 5 + i * 5, { align: 'right' }); });
  doc.setTextColor(0, 0, 0);
  y += 2 + Math.max(1, nameLines.length) * 5;
  if (emetteur.ifu) addText(`IFU : ${emetteur.ifu}`, emetteurX, y), (y += 4);
  if (emetteur.rccm) addText(`RCCM : ${emetteur.rccm}`, emetteurX, y), (y += 4);
  if (emetteur.regimeFiscal) addText(`Régime : ${emetteur.regimeFiscal}`, emetteurX, y), (y += 4);
  if (emetteur.address) addText(emetteur.address, emetteurX, y), (y += 4);
  if (emetteur.contact) addText(emetteur.contact, emetteurX, y), (y += 4);
  y += 4;

  // Bandeau titre
  doc.setFillColor(...palette.light);
  doc.rect(0, y - 2, pageW, 10, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(0, y - 2, pageW, 10, 'S');
  addText(`${TITLES[docType] || 'FACTURE N°'} ${numero}`, margin, y + 4, { size: 12, style: 'bold', color: [30, 41, 59] });
  y += 14;

  // Client + Références Marché / Date
  const clientStartY = y;
  addText('Client', margin, y, { size: 8, style: 'bold' }); y += 4;
  addText(client.name || '—', margin, y, { style: 'bold' }); y += 5;
  if (client.direction) addText(`Direction : ${client.direction}`, margin, y), (y += 4);
  if (client.ifu) addText(`IFU : ${client.ifu}`, margin, y), (y += 4);
  if (client.rccm) addText(`RCCM : ${client.rccm}`, margin, y), (y += 4);
  if (client.address) addText(client.address, margin, y), (y += 4);

  const refX = margin + 95;
  let refY = clientStartY;
  if (marche?.numero) addText(`N° Marché : ${marche.numero}`, refX, refY), (refY += 4);
  if (marche?.objet) {
    doc.setFontSize(10);
    const objLines = wrapText(doc, `Objet : ${marche.objet}`, 90);
    objLines.forEach((line) => { doc.text(line, refX, refY); refY += 4; });
  }
  if (marche?.bonCommande) addText(`N° BC : ${marche.bonCommande}`, refX, refY), (refY += 4);
  const dateStr = dateFacture instanceof Date ? dateFacture.toLocaleDateString('fr-FR') : (dateFacture || '');
  addText(`Date : ${dateStr}`, refX, refY), (refY += 4);
  y = Math.max(y, refY) + 6;

  // Tableau
  const tableY = y;
  if (modeFacture === 'commande') {
    const colW = [22, 58, 12, 12, 18, 20, 20];
    const headers = ['Réf', 'Désignation technique', 'Qté min', 'Qté max', 'P.U.', 'Total min', 'Total max'];
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(margin, y, contentW, 7, 'S');
    let x = margin;
    headers.forEach((h, i) => {
      const align = i >= 4 ? 'right' : (i === 1 ? 'left' : 'center');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const px = align === 'right' ? x + colW[i] - 2 : (align === 'center' ? x + colW[i] / 2 : x + 2);
      doc.text(h, px, y + 5, { align: align === 'left' ? 'left' : align });
      x += colW[i];
    });
    y += 8;
    doc.setDrawColor(226, 232, 240);
    items.forEach((item, idx) => {
      const pu = item.price ?? item.priceUnit ?? 0;
      const qMin = item.qMin ?? item.quantity ?? 1;
      const qMax = item.qMax ?? item.quantity ?? 1;
      const totalMin = qMin * pu;
      const totalMax = qMax * pu;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const designation = String(item.designation || '—');
      const desLines = wrapText(doc, designation, colW[1] - 4);
      const rowH = Math.max(6, desLines.length * 4);
      const cellCenterY = y + rowH / 2;
      x = margin;
      doc.text(String(item.code || idx + 1), x + colW[0] / 2, cellCenterY, { align: 'center' });
      x += colW[0];
      desLines.forEach((line, li) => doc.text(line, x + 2, y + 4 + li * 4));
      x += colW[1];
      doc.text(String(qMin), x + colW[2] / 2, cellCenterY, { align: 'center' });
      x += colW[2];
      doc.text(String(qMax), x + colW[3] / 2, cellCenterY, { align: 'center' });
      x += colW[3];
      doc.text(formatNum(pu), x + colW[4] - 2, cellCenterY, { align: 'right' });
      x += colW[4];
      doc.text(formatNum(totalMin), x + colW[5] - 2, cellCenterY, { align: 'right' });
      x += colW[5];
      doc.text(formatNum(totalMax), x + colW[6] - 2, cellCenterY, { align: 'right' });
      doc.line(margin, y + rowH, margin + contentW, y + rowH);
      y += rowH;
    });
  } else {
    const colW = [22, 62, 14, 12, 22, 24];
    const headers = ['Réf', 'Désignation', 'Quantité', 'Unité', 'Prix unitaire', 'Total'];
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(margin, y, contentW, 7, 'S');
    let x = margin;
    headers.forEach((h, i) => {
      const align = i >= 4 ? 'right' : (i === 1 ? 'left' : 'center');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const px = align === 'right' ? x + colW[i] - 2 : (align === 'center' ? x + colW[i] / 2 : x + 2);
      doc.text(h, px, y + 5, { align: align === 'left' ? 'left' : align });
      x += colW[i];
    });
    y += 8;
    doc.setDrawColor(226, 232, 240);
    items.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const pu = item.price ?? item.priceUnit ?? 0;
      const total = qty * pu;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const designation = String(item.designation || '—');
      const desLines = wrapText(doc, designation, colW[1] - 4);
      const rowH = Math.max(6, desLines.length * 4);
      const cellCenterY = y + rowH / 2;
      x = margin;
      doc.text(String(item.code || idx + 1), x + colW[0] / 2, cellCenterY, { align: 'center' });
      x += colW[0];
      desLines.forEach((line, li) => doc.text(line, x + 2, y + 4 + li * 4));
      x += colW[1];
      doc.text(String(qty), x + colW[2] / 2, cellCenterY, { align: 'center' });
      x += colW[2];
      doc.text(item.unite || 'U', x + colW[3] / 2, cellCenterY, { align: 'center' });
      x += colW[3];
      doc.text(formatNum(pu), x + colW[4] - 2, cellCenterY, { align: 'right' });
      x += colW[4];
      doc.text(formatNum(total), x + colW[5] - 2, cellCenterY, { align: 'right' });
      doc.line(margin, y + rowH, margin + contentW, y + rowH);
      y += rowH;
    });
  }
  y += 8;

  // Totaux
  const tx = margin + 110;
  addText('Total HT', tx, y);
  addText(formatNum(totaux.totalHT) + ' F CFA', margin + contentW - 2, y, { align: 'right' });
  y += 5;
  if (tvaAppliquee && totaux.tva > 0) {
    addText('TVA (18%)', tx, y);
    addText(formatNum(totaux.tva) + ' F CFA', margin + contentW - 2, y, { align: 'right' });
    y += 5;
    addText('Total TTC', tx, y);
    addText(formatNum(totaux.totalTTC) + ' F CFA', margin + contentW - 2, y, { align: 'right' });
    y += 5;
  }
  if (totaux.airsi > 0) {
    addText(`AIRSI (${totaux.airsiTaux ?? 0}%)`, tx, y);
    addText('- ' + formatNum(totaux.airsi) + ' F CFA', margin + contentW - 2, y, { align: 'right' });
    y += 5;
  }
  y += 2;
  doc.setFont('helvetica', 'bold');
  addText('Net à payer', tx, y);
  doc.setTextColor(...palette.primary);
  addText(formatNum(totaux.netAPayer) + ' F CFA', margin + contentW - 2, y, { align: 'right', style: 'bold' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 12;

  // Zone administrative : Arrêté la facture + Signature, cachet, gérant
  const suffixe = tvaAppliquee ? 'F CFA TTC' : 'F CFA HTVA';
  const arrete = montantArreteLibelle(totaux.netAPayer, suffixe);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  const zoneH = modeFacture === 'commande' ? 48 : 38;
  doc.rect(margin, y, contentW, zoneH);
  doc.setFontSize(9);
  let curY = y + 8;
  if (modeFacture === 'commande') {
    const totalMin = items.reduce((s, i) => s + ((i.qMin ?? i.quantity ?? 1) * (i.price ?? i.priceUnit ?? 0)), 0);
    const totalMax = items.reduce((s, i) => s + ((i.qMax ?? i.quantity ?? 1) * (i.price ?? i.priceUnit ?? 0)), 0);
    doc.text('Arrêté le présent devis à la somme de :', margin + 4, curY); curY += 5;
    wrapText(doc, `Montant minimum de : ${montantArreteLibelle(totalMin, suffixe)}`, contentW - 8).forEach((l) => { doc.text(l, margin + 4, curY); curY += 4; });
    wrapText(doc, `Montant maximum de : ${montantArreteLibelle(totalMax, suffixe)}`, contentW - 8).forEach((l) => { doc.text(l, margin + 4, curY); curY += 4; });
    curY += 4;
  } else {
    const arreteText = `${ARRETE_LIBELLES[docType] || ARRETE_LIBELLES.proforma} ${arrete}`;
    const arreteLines = wrapText(doc, arreteText, contentW - 8);
    arreteLines.forEach((line, li) => { doc.text(line, margin + 4, curY + li * 4); }); curY += arreteLines.length * 4 + 4;
  }
  if (showSignature) {
    addText('Signature', margin + 115, curY + 2, { size: 7 });
    const sigX = margin + 115;
    const sigW = 28;
    const sigH = 12;
    if (signatureDataUrl && (signatureDataUrl.startsWith('data:image/png') || signatureDataUrl.startsWith('data:image/jpeg') || signatureDataUrl.startsWith('data:image/jpg'))) {
      try {
        const fmt = signatureDataUrl.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(signatureDataUrl, fmt, sigX, curY - 1, sigW, sigH);
      } catch (_) {}
    }
  }
  if (showCachet) {
    const cachetX = margin + 145;
    const cachetW = 38;
    const cachetH = 28;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([3, 2], 0);
    doc.rect(cachetX, curY - 2, cachetW, cachetH);
    doc.setLineDashPattern([], 0);
    if (cachetDataUrl && (cachetDataUrl.startsWith('data:image/png') || cachetDataUrl.startsWith('data:image/jpeg') || cachetDataUrl.startsWith('data:image/jpg'))) {
      try {
        const fmt = cachetDataUrl.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(cachetDataUrl, fmt, cachetX + 2, curY, cachetW - 4, cachetH - 4);
      } catch (_) {}
    } else {
      addText('Cachet', cachetX + cachetW / 2, curY + cachetH / 2, { size: 9, align: 'center' });
    }
  }
  if (emetteur.gerant || emetteur.contact) {
    addText(emetteur.gerant || emetteur.contact, margin + 115, curY + 12, { size: 9, style: 'bold' });
    addText('Le Gérant', margin + 115, curY + 18, { size: 7 });
  }

  if (data.returnBlob) {
    return doc.output('blob');
  }
  doc.save(`Facture-${numero}.pdf`);
}

/**
 * Export PDF facture (délègue au vectoriel pour qualité maximale).
 * Garde la compatibilité avec l'appel depuis FacturePreview.
 */
export async function exportFacturePdfFromPreview(element, numero = 'FAC-2025-0001') {
  // L'export vectoriel est utilisé via exportFacturePdfVector avec les données complètes.
  // Ce fallback n'est plus utilisé quand on passe les données.
  console.warn('exportFacturePdfFromPreview: utilisez exportFacturePdfVector avec les données complètes');
}

/**
 * Exporte une facture en PDF (dessin programmatique - format alternatif).
 * Préférer exportFacturePdfVector pour qualité vectorielle maximale.
 */
export function exportFacturePdf(data) {
  const {
    numero = 'FAC-2025-0001',
    docType = 'proforma',
    dateFacture,
    emetteur = {},
    client = {},
    marche = {},
    items = [],
    totaux = {},
    fec = {},
    tvaAppliquee = true,
  } = data;

  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = 20;
  let y = 20;

  const addText = (text, x, yy, options = {}) => {
    doc.setFontSize(options.size || 10);
    doc.setFont(options.font || 'helvetica', options.style || 'normal');
    doc.text(String(text), x, yy);
  };

  // En-tête : Logo placeholder (gauche) + Émetteur
  addText(emetteur.name || 'Société', margin, y, { size: 14, style: 'bold' });
  y += 6;
  if (emetteur.ifu) addText(`IFU : ${emetteur.ifu}`, margin, y), (y += 5);
  if (emetteur.rccm) addText(`RCCM : ${emetteur.rccm}`, margin, y), (y += 5);
  if (emetteur.regimeFiscal) addText(`Régime : ${emetteur.regimeFiscal}`, margin, y), (y += 5);
  if (emetteur.address) addText(emetteur.address, margin, y), (y += 5);
  if (emetteur.contact) addText(emetteur.contact, margin, y), (y += 5);

  y += 5;

  // Bandeau titre
  doc.setFillColor(200, 200, 200);
  doc.rect(0, y - 5, 210, 12, 'F');
  addText(`${TITLES[docType] || 'FACTURE N°'} ${numero}`, margin, y + 3, { size: 12, style: 'bold' });
  y += 18;

  // Client (gauche)
  addText('Client', margin, y, { size: 9, style: 'bold' });
  y += 5;
  addText(client.name || '—', margin, y);
  y += 5;
  if (client.direction) addText(`Direction : ${client.direction}`, margin, y), (y += 5);
  if (client.ifu) addText(`IFU : ${client.ifu}`, margin, y), (y += 5);
  if (client.rccm) addText(`RCCM : ${client.rccm}`, margin, y), (y += 5);
  if (client.address) addText(client.address, margin, y), (y += 5);

  // Références Marché + Date (colonne droite)
  const refY = y - 20;
  addText(`Date : ${dateFacture instanceof Date ? dateFacture.toLocaleDateString('fr-FR') : dateFacture}`, 120, refY);
  if (marche?.numero) addText(`N° Marché : ${marche.numero}`, 120, refY + 6);
  if (marche?.objet) addText(`Objet : ${String(marche.objet).substring(0, 35)}`, 120, refY + 12);
  if (marche?.bonCommande) addText(`N° BC : ${marche.bonCommande}`, 120, refY + 18);

  y += 5;

  // Tableau
  const colW = [90, 15, 20, 32, 32];
  const headers = ['Désignation', 'Qté', 'Unité', 'P.U. HT', 'Total HT'];
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, 180, 8, 'F');
  headers.forEach((h, i) => {
    const x = margin + colW.slice(0, i).reduce((a, b) => a + b, 0);
    addText(h, x + 2, y + 5.5, { size: 8, style: 'bold' });
  });
  y += 10;

  items.forEach((item) => {
    const qty = item.quantity || 1;
    const pu = item.price ?? item.priceUnit ?? 0;
    const total = qty * pu;
    addText((item.designation || '—').substring(0, 45), margin + 2, y + 4);
    addText(String(qty), margin + 92, y + 4);
    addText(item.unite || 'U', margin + 108, y + 4);
    addText(formatNum(pu), margin + 130, y + 4);
    addText(formatNum(total), margin + 164, y + 4);
    y += 7;
  });

  y += 10;

  // Totaux
  const tx = margin + 100;
  addText('Total HT', tx, y);
  addText(formatNum(totaux.totalHT) + ' F CFA', tx + 60, y);
  y += 6;
  if (tvaAppliquee && totaux.tva > 0) {
    addText('TVA (18%)', tx, y);
    addText(formatNum(totaux.tva) + ' F CFA', tx + 60, y);
    y += 6;
  }
  if (totaux.airsi > 0) {
    addText(`AIRSI (${totaux.airsiTaux}%)`, tx, y);
    addText('- ' + formatNum(totaux.airsi) + ' F CFA', tx + 60, y);
    y += 6;
  }
  addText('Total TTC', tx, y);
  addText(formatNum(totaux.totalTTC) + ' F CFA', tx + 60, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  addText('Net à payer', tx, y);
  addText(formatNum(totaux.netAPayer) + ' F CFA', tx + 60, y, { style: 'bold' });
  doc.setFont('helvetica', 'normal');
  y += 15;

  // Zone administrative : Arrêté la facture + Signature, cachet, gérant (HTVA ou TTC selon TVA)
  const suffixeArrete = tvaAppliquee ? 'F CFA TTC' : 'F CFA HTVA';
  const arreteMontant = montantArreteLibelle(totaux.netAPayer, suffixeArrete);
  const arreteLibelle = ARRETE_LIBELLES[docType] || ARRETE_LIBELLES.proforma;
  const gerant = emetteur.gerant || emetteur.contact || '';
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y, 180, 45);
  addText(`${arreteLibelle} ${arreteMontant}`, margin + 5, y + 8, { size: 9 });
  addText('Signature', margin + 100, y + 22, { size: 7 });
  const cachetX2 = margin + 140;
  const cachetW2 = 38;
  const cachetH2 = 28;
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(cachetX2, y + 12, cachetW2, cachetH2);
  doc.setLineDashPattern([], 0);
  addText('Cachet', cachetX2 + cachetW2 / 2, y + 26, { size: 9, align: 'center' });
  if (gerant) {
    addText(gerant, margin + 100, y + 35, { size: 9, style: 'bold' });
    addText('Le Gérant', margin + 100, y + 41, { size: 7 });
  }

  doc.save(`Facture-${numero}.pdf`);
}

/**
 * Exporte le récapitulatif du DAO (Dossier d'Appel d'Offres) monté en direct.
 * @param {Array<{ id: string, label: string, items: string[] }>} sections
 * @param {Record<string, { fileName: string }>} attachments - clés "sectionId-idx"
 * @param {Object} [options] - emetteur, marcheRef, lignesFinancieres, totalHT, exemplaireLabel
 */
export function exportDaoPdf(sections, attachments = {}, options = {}) {
  const { emetteur = {}, marcheRef = {}, lignesFinancieres = [], totalHT = 0, exemplaireLabel = '' } = options;
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = 20;
  let y = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif DAO — Dossier d\'Appel d\'Offres', margin, y);
  y += 6;
  if (exemplaireLabel) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Modèle : ${exemplaireLabel}`, margin, y);
    y += 6;
  }
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — FasoMarchés`, margin, y);
  y += 10;

  if (emetteur.name || emetteur.ifu) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Titulaire (pré-rempli)', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (emetteur.name) doc.text(emetteur.name, margin, y), (y += 5);
    if (emetteur.ifu) doc.text(`IFU : ${emetteur.ifu}`, margin, y), (y += 5);
    if (emetteur.rccm) doc.text(`RCCM : ${emetteur.rccm}`, margin, y), (y += 5);
    if (emetteur.address) doc.text(emetteur.address, margin, y), (y += 5);
    y += 4;
  }

  if (marcheRef.numero || marcheRef.objet) {
    doc.setFont('helvetica', 'bold');
    doc.text('Référence marché', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    if (marcheRef.numero) doc.text(`N° : ${marcheRef.numero}`, margin, y), (y += 5);
    if (marcheRef.objet) doc.text(`Objet : ${String(marcheRef.objet).substring(0, 80)}`, margin, y), (y += 5);
    y += 4;
  }

  if (lignesFinancieres.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('Bordereau de prix (calculs automatiques)', margin, y);
    y += 8;
    const colW = [70, 18, 15, 32, 35];
    const headers = ['Désignation', 'Qté', 'Unité', 'P.U. HT', 'Total HT'];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, 170, 7, 'F');
    headers.forEach((h, i) => {
      const x = margin + colW.slice(0, i).reduce((a, b) => a + b, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(h, x + 2, y + 1);
    });
    doc.setFont('helvetica', 'normal');
    y += 6;
    lignesFinancieres.forEach((l) => {
      const qty = Number(l.quantity) || 0;
      const pu = Number(l.priceUnit) || 0;
      const total = qty * pu;
      doc.text(String(l.designation || '—').substring(0, 38), margin + 2, y + 3);
      doc.text(String(l.quantity ?? ''), margin + 72, y + 3);
      doc.text(String(l.unite || 'U'), margin + 90, y + 3);
      doc.text(formatNum(pu), margin + 106, y + 3);
      doc.text(formatNum(total), margin + 140, y + 3);
      y += 6;
    });
    y += 4;
    doc.setDrawColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Total HT', margin + 106, y + 3);
    doc.text(formatNum(totalHT) + ' F CFA', margin + 140, y + 3);
    doc.setFont('helvetica', 'normal');
    y += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Pièces du dossier', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  sections.forEach((section) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(section.label, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    section.items.forEach((item, idx) => {
      if (y > 280) { doc.addPage(); y = 20; }
      const key = `${section.id}-${idx}`;
      const att = attachments[key];
      const joint = att?.fileName ? `Joint : ${att.fileName}` : 'Non joint';
      doc.text(`• ${item} — ${joint}`, margin + 2, y);
      y += 5;
    });
    y += 3;
  });

  doc.save(`DAO-recap-${new Date().toISOString().slice(0, 10)}.pdf`);
}

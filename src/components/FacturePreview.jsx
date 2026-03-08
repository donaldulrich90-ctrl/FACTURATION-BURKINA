import React, { useRef } from 'react';
import { calculerTotauxFacture, montantArreteLibelle } from '../utils/factureCalcul';

/**
 * Prévisualisation facture conforme DGI Burkina Faso / UEMOA
 * Format A4 portrait (210×297 mm), marges professionnelles
 * Typographie Inter/Roboto, zone administrative, FEC
 *
 * @param {Object} props
 * @param {string} props.numero - Format FAC-YYYY-XXXX
 * @param {Date|string} props.dateFacture
 * @param {Object} props.emetteur - { name, ifu, rccm, regimeFiscal, address, contact, logoUrl }
 * @param {Object} props.client - { name, direction, address, ifu, rccm }
 * @param {Object} [props.marche] - { numero, objet, bonCommande } Références marché
 * @param {Array} props.items - Lignes facture
 * @param {number} props.airsiTaux - 0, 2 ou 5
 * @param {boolean} [props.tvaAppliquee=true] - TVA appliquée ou non
 * @param {Object} [props.fec] - { uuid } FEC
 * @param {Function} [props.onExportPdf]
 */
const TITLES = { proforma: 'FACTURE PROFORMA N°', definitive: 'FACTURE DÉFINITIVE N°', bl: 'BON DE LIVRAISON N°' };
const ARRETE_LIBELLES = {
  proforma: 'Arrêté la présente facture proforma à la somme de :',
  definitive: 'Arrêté la présente facture définitive à la somme de :',
  bl: 'Arrêté le présent bon de livraison à la somme de :',
};

export default function FacturePreview({
  numero = 'FAC-2025-0001',
  docType = 'proforma',
  dateFacture = new Date(),
  emetteur = {},
  client = {},
  marche = {},
  items = [],
  airsiTaux = 0,
  tvaAppliquee = true,
  modeFacture = 'simple',
  theme = {},
  showDate = true,
  showCaseTimbre = false,
  showCachet = false,
  showSignature = false,
  fec = {},
  onExportPdf,
}) {
  const exportRef = useRef(null);

  const handlePrint = () => {
    const el = document.getElementById('facture-print');
    if (!el) return;
    const originalParent = el.parentNode;
    const originalNext = el.nextElementSibling;
    const printWrap = document.createElement('div');
    printWrap.id = 'facture-print-wrapper';
    printWrap.style.cssText = 'width:100%;max-width:100%;overflow:hidden;scrollbar-width:none;';
    document.body.prepend(printWrap);
    printWrap.appendChild(el);
    document.documentElement.classList.add('print-facture');
    document.body.classList.add('print-facture');
    window.print();
    const cleanup = () => {
      printWrap.removeChild(el);
      originalParent.insertBefore(el, originalNext);
      printWrap.remove();
      document.documentElement.classList.remove('print-facture');
      document.body.classList.remove('print-facture');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
  };
  const totalHT = items.reduce((s, i) => s + ((i.price ?? i.priceUnit ?? 0) * (i.quantity || 1)), 0);
  const totaux = calculerTotauxFacture(totalHT, airsiTaux, tvaAppliquee);
  const suffixeArrete = tvaAppliquee ? 'F CFA TTC' : 'F CFA HTVA';
  const arreteMontant = montantArreteLibelle(totaux.netAPayer, suffixeArrete);
  const totalMinGlobal = modeFacture === 'commande'
    ? items.reduce((s, i) => s + ((i.qMin ?? i.quantity ?? 1) * (i.price ?? i.priceUnit ?? 0)), 0)
    : null;
  const totalMaxGlobal = modeFacture === 'commande'
    ? items.reduce((s, i) => s + ((i.qMax ?? i.quantity ?? 1) * (i.price ?? i.priceUnit ?? 0)), 0)
    : null;

  const formatFCFA = (n) => (n != null && !isNaN(n) ? Number(n).toLocaleString('fr-FR') + ' F CFA' : '—');
  const formatNombre = (n) => (n != null && !isNaN(n) ? Number(n).toLocaleString('fr-FR') : '—');
  const formatDate = (d) => (d instanceof Date ? d.toLocaleDateString('fr-FR') : d);

  const PALETTES = {
    bleu: { primary: '#1d4ed8', light: '#dbeafe', text: '#1e293b' },
    vert: { primary: '#059669', light: '#d1fae5', text: '#065f46' },
    bordeaux: { primary: '#b91c1c', light: '#fee2e2', text: '#7f1d1d' },
  };
  const FONTS = {
    sans: "'Inter', 'Roboto', system-ui, sans-serif",
    serif: "'Georgia', 'Times New Roman', serif",
    mono: "'Fira Code', 'Menlo', monospace",
  };
  const palette = PALETTES[theme?.palette] || PALETTES.bleu;
  const fontFamily = FONTS[theme?.font] || FONTS.sans;
  const showWatermark = theme?.watermark !== false;
  const LOGO_SIZES = {
    small: { maxWidth: '85mm', width: '35%', minHeight: '85px' },
    medium: { maxWidth: '105mm', width: '42%', minHeight: '105px' },
    large: { maxWidth: '130mm', width: '55%', minHeight: '130px' },
  };
  const logoSize = LOGO_SIZES[theme?.logoSize] || LOGO_SIZES.large;

  const hasMarcheRef = marche && (marche.numero || marche.objet || marche.bonCommande);

  return (
    <div
      className="bg-white shadow-xl w-full min-w-0"
      style={{
        fontFamily,
        maxWidth: '210mm',
        margin: '0 auto',
      }}
    >
      {/* Zone A4 - norme ISO 216 (210×297 mm), marges 20 mm - Zone exportable et imprimable */}
      <div
        ref={exportRef}
        id="facture-print"
        className="relative p-12 min-h-[297mm] flex flex-col shrink-0 overflow-x-hidden"
        style={{ width: '210mm', minWidth: '210mm', minHeight: '297mm', maxWidth: '100%', boxSizing: 'border-box' }}
      >
        {/* Logo en filigrane (watermark) - discret pour ne pas masquer le contenu */}
        {showWatermark && emetteur.logoUrl && (
          <div
            data-facture-watermark
            className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <img
              src={emetteur.logoUrl}
              alt=""
              className="object-contain select-none"
              style={{ maxWidth: '28%', maxHeight: '35%', opacity: 0.03 }}
            />
          </div>
        )}
        {/* Contenu principal */}
        <div className="relative z-10 flex flex-col flex-1">
        {/* En-tête : Logo + infos émetteur */}
        <div className="flex justify-between items-stretch gap-4 sm:gap-6 border-b border-slate-200 pb-8 mb-6 min-w-0">
          <div
            data-facture-logo-box
            className="flex items-center justify-center overflow-hidden shrink-0 rounded-2xl border border-slate-200 bg-white self-stretch"
            style={{
              maxWidth: logoSize.maxWidth,
              width: logoSize.width,
              minHeight: logoSize.minHeight,
              boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
            }}
          >
            {emetteur.logoUrl ? (
              <img
                key={String(emetteur.logoUrl).slice(0, 80)}
                src={emetteur.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain p-1"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }}
              />
            ) : null}
            <span className={emetteur.logoUrl ? 'hidden text-[10px] text-slate-400' : 'text-[10px] text-slate-400'}>Logo</span>
          </div>
          <div className="text-right text-sm flex-1 min-w-0 overflow-hidden">
            <div className="min-h-[3.25rem] flex flex-col justify-center" style={{ minHeight: '3.25rem' }}>
              <p className="font-bold text-lg leading-tight break-words" style={{ color: palette.primary, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {emetteur.name || 'Société Émettrice'}
              </p>
            </div>
            {emetteur.ifu && <p className="text-slate-700">IFU : {emetteur.ifu}</p>}
            {emetteur.rccm && <p className="text-slate-700">RCCM : {emetteur.rccm}</p>}
            {emetteur.regimeFiscal && <p className="text-slate-600">Régime : {emetteur.regimeFiscal}</p>}
            {emetteur.address && <p className="text-slate-600">{emetteur.address}</p>}
            {emetteur.contact && <p className="text-slate-600">{emetteur.contact}</p>}
          </div>
        </div>

        {/* Bandeau titre - pleine largeur (FACTURE, PROFORMA, etc.) */}
        <div data-facture-bandeau className="py-3 px-6 -mx-12 mb-6 shrink-0" style={{ backgroundColor: palette.light }}>
          <h1 className="text-xl font-bold tracking-wide overflow-visible" style={{ color: palette.text }}>
            {TITLES[docType] || 'FACTURE N°'} {numero}
          </h1>
        </div>

        {/* Client | Références Marché | Date | Timbre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client</h3>
            <p className="font-bold text-gray-900">{client.name || '—'}</p>
            {client.direction && <p className="text-sm text-slate-600">Direction : {client.direction}</p>}
            {client.ifu && <p className="text-sm text-slate-600">IFU : {client.ifu}</p>}
            {client.rccm && <p className="text-sm text-slate-600">RCCM : {client.rccm}</p>}
            {client.address && <p className="text-sm text-slate-600 mt-1">{client.address}</p>}
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="w-full">
              {hasMarcheRef ? (
                <>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Références Marché</h3>
                  {marche.numero && <p className="text-sm">N° Marché : {marche.numero}</p>}
                  {marche.objet && <p className="text-sm break-words">Objet : {marche.objet}</p>}
                  {marche.bonCommande && <p className="text-sm">N° BC : {marche.bonCommande}</p>}
                </>
              ) : null}
              {showDate && <p className="text-sm mt-2 text-slate-600">Date : {formatDate(dateFacture)}</p>}
            </div>
            {showCaseTimbre && docType === 'definitive' && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Timbre</span>
                <div
                  className="w-16 h-16 border-2 border-dashed border-slate-300 rounded bg-slate-50/80 flex items-center justify-center"
                  style={{ minWidth: '64px', minHeight: '64px' }}
                >
                  <span className="text-[9px] text-slate-400">Timbre</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tableau des lignes - largeurs ajustées pour éviter tout débordement (Total min/max visibles) */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-visible">
          {modeFacture === 'commande' ? (
            <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: '600px' }}>
              <colgroup>
                <col style={{ width: '11%' }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 p-2 text-center font-semibold text-xs">Réf</th>
                  <th className="border border-slate-200 p-2 text-left font-semibold text-xs">Désignation technique</th>
                  <th className="border border-slate-200 p-2 text-center font-semibold text-xs">Qté min</th>
                  <th className="border border-slate-200 p-2 text-center font-semibold text-xs">Qté max</th>
                  <th className="border border-slate-200 p-2 text-right font-semibold text-xs">P.U.</th>
                  <th className="border border-slate-200 p-2 text-right font-semibold text-xs whitespace-nowrap">Total min</th>
                  <th className="border border-slate-200 p-2 text-right font-semibold text-xs whitespace-nowrap">Total max</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const pu = item.price ?? item.priceUnit ?? 0;
                  const qMin = item.qMin ?? item.quantity ?? 1;
                  const qMax = item.qMax ?? item.quantity ?? 1;
                  const totalMin = qMin * pu;
                  const totalMax = qMax * pu;
                  return (
                    <tr key={item.id || idx} className="border-b border-slate-100">
                      <td className="p-2 text-center border border-slate-100 font-mono text-xs break-all" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{item.code || idx + 1}</td>
                      <td className="p-2 border border-slate-100 align-top" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                        <span className="block">{item.designation || '—'}</span>
                      </td>
                      <td className="p-2 text-center border border-slate-100 text-xs">{qMin}</td>
                      <td className="p-2 text-center border border-slate-100 text-xs">{qMax}</td>
                      <td className="p-2 text-right font-mono text-xs border border-slate-100">{formatNombre(pu)}</td>
                      <td className="p-2 text-right font-mono text-xs border border-slate-100">{formatNombre(totalMin)}</td>
                      <td className="p-2 text-right font-mono font-medium text-xs border border-slate-100">{formatNombre(totalMax)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: '550px' }}>
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 p-2 text-center font-semibold text-xs">Réf</th>
                  <th className="border border-slate-200 p-2 text-left font-semibold text-xs">Désignation</th>
                  <th className="border border-slate-200 p-2 text-center font-semibold text-xs">Quantité</th>
                  <th className="border border-slate-200 p-2 text-center font-semibold text-xs">Unité</th>
                  <th className="border border-slate-200 p-2 text-right font-semibold text-xs">Prix unitaire</th>
                  <th className="border border-slate-200 p-2 text-right font-semibold text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = item.quantity || 1;
                  const pu = item.price ?? item.priceUnit ?? 0;
                  const total = qty * pu;
                  return (
                    <tr key={item.id || idx} className="border-b border-slate-100">
                      <td className="p-2 text-center border border-slate-100 font-mono text-xs break-all" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{item.code || idx + 1}</td>
                      <td className="p-2 border border-slate-100" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                        <span className="block">{item.designation || '—'}</span>
                      </td>
                      <td className="p-2 text-center border border-slate-100 text-xs">{qty}</td>
                      <td className="p-2 text-center border border-slate-100 text-xs">{item.unite || 'U'}</td>
                      <td className="p-2 text-right font-mono text-xs border border-slate-100">{formatNombre(pu)}</td>
                      <td className="p-2 text-right font-mono font-medium text-xs border border-slate-100">{formatNombre(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Totaux */}
        <div className="mt-6 flex justify-end">
          <div className="w-80 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total HT</span>
              <span className="font-mono">{formatFCFA(totaux.totalHT)}</span>
            </div>
            {tvaAppliquee && totaux.tva > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">TVA (18%)</span>
                  <span className="font-mono">{formatFCFA(totaux.tva)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-700">Total TTC</span>
                  <span className="font-mono">{formatFCFA(totaux.totalTTC)}</span>
                </div>
              </>
            )}
            {totaux.airsi > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">AIRSI ({totaux.airsiTaux}%)</span>
                <span className="font-mono text-amber-700">- {formatFCFA(totaux.airsi)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-slate-300">
              <span>Net à payer</span>
              <span style={{ color: palette.primary }}>{formatFCFA(totaux.netAPayer)}</span>
            </div>
          </div>
        </div>

        {/* Zone administrative : Arrêté la facture/devis + Signature et cachet */}
        <div data-facture-zone-admin className="mt-8 p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
          {modeFacture === 'commande' ? (
            <div className="space-y-1 text-sm text-slate-700">
              <p>Arrêté le présent devis à la somme de :</p>
              <p>
                Montant minimum de :{' '}
                <strong className="text-slate-900">
                  {montantArreteLibelle(totalMinGlobal || 0, tvaAppliquee ? 'F CFA TTC' : 'F CFA HTVA')}
                </strong>
              </p>
              <p>
                Montant maximum de :{' '}
                <strong className="text-slate-900">
                  {montantArreteLibelle(totalMaxGlobal || 0, tvaAppliquee ? 'F CFA TTC' : 'F CFA HTVA')}
                </strong>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-700">
              {ARRETE_LIBELLES[docType] || ARRETE_LIBELLES.proforma}{' '}
              <strong className="text-slate-900">{arreteMontant}</strong>
            </p>
          )}
          <div className="mt-8 flex justify-end">
            <div className="text-right">
              <div className="flex items-end justify-end gap-8 mb-2">
                {showSignature && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">Signature</span>
                    <div className="relative w-32 h-12">
                      <div className="absolute inset-0 border-b-2 border-slate-400" />
                      {emetteur.signatureUrl && <img src={emetteur.signatureUrl} alt="Signature" className="absolute inset-0 h-full w-auto max-w-full object-contain object-left" onError={(e) => { e.target.style.visibility = 'hidden'; }} />}
                    </div>
                  </div>
                )}
                {showCachet && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">Cachet</span>
                    <div className="relative" style={{ minWidth: '160px', minHeight: '128px' }}>
                      <div className="absolute inset-0 w-40 h-32 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-xs text-slate-500">Cachet</div>
                      {emetteur.cachetUrl && <img src={emetteur.cachetUrl} alt="Cachet" className="absolute inset-0 w-full h-full object-contain rounded" onError={(e) => { e.target.style.visibility = 'hidden'; }} />}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {emetteur.gerant || emetteur.contact || '—'}
              </p>
              <p className="text-xs text-slate-500">Le Gérant</p>
            </div>
          </div>
        </div>

        </div>
      </div>
      {/* Boutons Imprimer et Exporter PDF (hors zone imprimée) */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path></svg>
          Imprimer
        </button>
        {onExportPdf && (
          <button
            type="button"
            onClick={() => onExportPdf({ numero, dateFacture, emetteur, client, marche, items, airsiTaux, totaux, fec, modeFacture, tvaAppliquee, theme, showDate, showCaseTimbre, showCachet, showSignature }, exportRef.current)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md"
          >
            Exporter PDF
          </button>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { Image, X, Loader2, Check, Upload, FileText, FileType } from 'lucide-react';
import { parseFactureFromOcr } from '../utils/parseFactureFromOcr';
import { extractTextFromPdf } from '../utils/pdfExtract';

const MODE_PHOTO = 'photo';
const MODE_PDF = 'pdf';
const MODE_PASTE = 'paste';

export default function ImportFactureFromPhoto({ onImport, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState(MODE_PHOTO);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const resetState = () => {
    setError('');
    setResult(null);
    setRawText('');
    setFile(null);
    setPreview(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    resetState();
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPG, PNG, etc.)');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handlePdfChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    resetState();
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Veuillez sélectionner un fichier PDF.');
      return;
    }
    setFile(f);
  };

  const analyzeText = (text) => {
    const parsed = parseFactureFromOcr(text || '');
    setResult(parsed);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setProgress('Chargement OCR (1ère fois: ~30 s)…');
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(`Lecture… ${Math.round((m.progress || 0) * 100)} %`);
          else if (m.status) setProgress(String(m.status));
        },
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      setProgress('Extraction du texte…');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const txt = data.text || '';
      setRawText(txt);
      setProgress('Analyse…');
      analyzeText(txt);
      if (txt.trim().length < 20) {
        setError('Peu de texte détecté. Utilisez l\'onglet « Coller le texte » pour saisir manuellement.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la lecture. Essayez "Coller le texte" si la photo est illisible.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handlePasteAnalyze = () => {
    setError('');
    analyzeText(pastedText);
  };

  const handlePdfAnalyze = async () => {
    if (!file || mode !== MODE_PDF) return;
    setLoading(true);
    setError('');
    setProgress('Extraction du texte du PDF…');
    try {
      const txt = await extractTextFromPdf(file);
      setRawText(txt || '');
      setProgress('Analyse…');
      analyzeText(txt);
      if (txt.trim().length < 20) {
        setError('Peu de texte extrait (PDF scanné ?). Utilisez une photo avec OCR ou collez le texte.');
      }
    } catch (err) {
      setError(err?.message || 'Erreur lors de la lecture du PDF.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleApply = () => {
    if (!result) return;
    onImport(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Image size={24} className="text-blue-500" />
            Importer une facture
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => { setMode(MODE_PHOTO); resetState(); setPastedText(''); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${mode === MODE_PHOTO ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
            >
              <Image size={14} className="inline mr-1" />
              Photo
            </button>
            <button
              type="button"
              onClick={() => { setMode(MODE_PDF); resetState(); setPastedText(''); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${mode === MODE_PDF ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
            >
              <FileType size={14} className="inline mr-1" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => { setMode(MODE_PASTE); resetState(); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${mode === MODE_PASTE ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}
            >
              <FileText size={14} className="inline mr-1" />
              Coller le texte
            </button>
          </div>
          {mode === MODE_PASTE ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Collez le texte de la facture (copié depuis un PDF, Word, ou saisi à la main)
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Exemple :&#10;MAIRIE DE KOUBRI&#10;Fourniture ordinateur    2    150 000    300 000&#10;..."
                rows={12}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-sm font-mono bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={handlePasteAnalyze}
                disabled={!pastedText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Check size={18} />
                Extraire les données
              </button>
            </div>
          ) : mode === MODE_PDF ? (
            !file ? (
              <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors">
                <FileType size={48} className="text-gray-400 dark:text-slate-500 mb-3" />
                <span className="text-gray-600 dark:text-gray-300 font-medium">Cliquez ou glissez un fichier PDF</span>
                <span className="text-sm text-gray-500 mt-1">Facture au format PDF (texte sélectionnable)</span>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <FileType size={32} className="text-red-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500">{((file.size || 0) / 1024).toFixed(1)} ko</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Changer le PDF
                  </button>
                  <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" onChange={handlePdfChange} className="hidden" />
                  {!loading && !result && (
                    <button
                      type="button"
                      onClick={handlePdfAnalyze}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Extraire les données
                    </button>
                  )}
                </div>
                {loading && (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-300">{progress}</span>
                  </div>
                )}
                {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
                {result && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <Check size={18} /> Données extraites — vérifiez et ajustez si nécessaire
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
                      <p className="text-gray-900 dark:text-white font-medium">{result.client}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Articles détectés</label>
                      <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                              <th className="text-left p-2">Désignation</th>
                              <th className="text-right p-2 w-16">Qté</th>
                              <th className="text-right p-2 w-24">P.U.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.items.map((it, i) => (
                              <tr key={i} className="border-t border-gray-100 dark:border-slate-600">
                                <td className="p-2">{it.designation}</td>
                                <td className="p-2 text-right">{it.quantity}</td>
                                <td className="p-2 text-right font-mono">{it.priceUnit?.toLocaleString('fr-FR')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : !file ? (
            <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors">
              <Upload size={48} className="text-gray-400 dark:text-slate-500 mb-3" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">Cliquez ou glissez une photo de facture</span>
              <span className="text-sm text-gray-500 mt-1">JPG, PNG — Photo nette, bonne lumière</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <img
                    src={preview}
                    alt="Aperçu"
                    className="max-h-48 rounded-lg border border-gray-200 dark:border-slate-600 object-contain bg-gray-50 dark:bg-slate-900"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Changer l'image
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    {!loading && !result && (
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Lire la facture
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {loading && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-gray-600 dark:text-gray-300">{progress}</span>
                </div>
              )}
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              {result && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Check size={18} /> Données extraites — vérifiez et ajustez si nécessaire
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Client</label>
                    <p className="text-gray-900 dark:text-white font-medium">{result.client}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Articles détectés</label>
                    <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                          <tr>
                            <th className="text-left p-2">Désignation</th>
                            <th className="text-right p-2 w-16">Qté</th>
                            <th className="text-right p-2 w-24">P.U.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.items.map((it, i) => (
                            <tr key={i} className="border-t border-gray-100 dark:border-slate-600">
                              <td className="p-2">{it.designation}</td>
                              <td className="p-2 text-right">{it.quantity}</td>
                              <td className="p-2 text-right font-mono">{it.priceUnit?.toLocaleString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {result && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-600 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
              Annuler
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              <Check size={18} />
              Créer la facture avec ces données
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

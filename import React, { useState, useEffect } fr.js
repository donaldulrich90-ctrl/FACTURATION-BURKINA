import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  BookOpen, 
  Bell, 
  Search, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Menu, 
  X,
  Printer,
  Building2,
  FileBarChart,
  Trash2
} from 'lucide-react';

// --- DONNÉES SIMULÉES (MOCK DATA) ---

// Mercuriale 2026 Ouagadougou — échantillon (Prix Moyen = prix_ref, Prix Maximum = plafond)
const MOCK_MERCURIALE = [
  { id: 'M001', code: '03.1.1.1.1.0.021', designation: 'Agenda grand format avec couverture estampillée 200 pages papier 80g', unite: 'Unité', prix_ref: 9500, prix_max: 10500, categorie: 'Fournitures de bureau' },
  { id: 'M002', code: '03.1.1.1.1.0.022', designation: 'Agenda grand format de 100 pages à spirale', unite: 'Unité', prix_ref: 6000, prix_max: 7000, categorie: 'Fournitures de bureau' },
  { id: 'M003', code: '03.1.1.1.1.0.023', designation: 'Agenda grand format de 100 pages à spirale', unite: 'Paquet de 10', prix_ref: 29375, prix_max: 34500, categorie: 'Fournitures de bureau' },
  { id: 'M004', code: '03.1.1.1.2.0.001', designation: 'Rame de papier A4 80g (500 feuilles)', unite: 'Paquet', prix_ref: 3500, prix_max: 3800, categorie: 'Fournitures de bureau' },
  { id: 'M005', code: '03.1.1.1.2.0.002', designation: 'Boîte de 50 stylos à bille bleu', unite: 'Boîte', prix_ref: 2500, prix_max: 2800, categorie: 'Fournitures de bureau' },
  { id: 'M006', code: '03.1.1.1.2.0.003', designation: 'Classeur à levier 4 cm', unite: 'Unité', prix_ref: 2100, prix_max: 2400, categorie: 'Fournitures de bureau' },
  { id: 'M007', code: '04.2.1.1.0.001', designation: 'Ordinateur portable Core i5, 8 Go RAM, 512 Go SSD', unite: 'Unité', prix_ref: 450000, prix_max: 485000, categorie: 'Informatique' },
  { id: 'M008', code: '04.2.1.1.0.002', designation: 'Imprimante laser multifonction noir et blanc', unite: 'Unité', prix_ref: 180000, prix_max: 198000, categorie: 'Informatique' },
  { id: 'M009', code: '04.2.1.1.0.003', designation: 'Clé USB 32 Go', unite: 'Unité', prix_ref: 5500, prix_max: 6500, categorie: 'Informatique' },
  { id: 'M010', code: '04.2.1.1.0.004', designation: 'Écran LCD 24 pouces Full HD', unite: 'Unité', prix_ref: 85000, prix_max: 95000, categorie: 'Informatique' },
  { id: 'M011', code: '04.2.1.1.0.005', designation: 'Onduleur 1000 VA', unite: 'Unité', prix_ref: 47000, prix_max: 52000, categorie: 'Informatique' },
  { id: 'M012', code: '05.1.1.1.0.001', designation: 'Ciment Portland 50 kg', unite: 'Sac', prix_ref: 7200, prix_max: 8000, categorie: 'BTP' },
  { id: 'M013', code: '05.1.1.1.0.002', designation: 'Fer à béton T12 (barre 12 m)', unite: 'Unité', prix_ref: 9200, prix_max: 10000, categorie: 'BTP' },
  { id: 'M014', code: '05.1.1.1.0.003', designation: 'Peinture acrylique mate 20 L', unite: 'Bidons', prix_ref: 21000, prix_max: 23500, categorie: 'BTP' },
  { id: 'M015', code: '05.1.1.1.0.004', designation: 'Tôle galvanisée 3 m', unite: 'Unité', prix_ref: 25000, prix_max: 28000, categorie: 'BTP' },
  { id: 'M016', code: '05.1.1.1.0.005', designation: 'Gravier 0/15 (camion 10 t)', unite: 'Camion', prix_ref: 105000, prix_max: 115000, categorie: 'BTP' },
];

// Exemple d'appels d'offres
const MOCK_OFFRES = [
  { id: 1, ref: 'DAO-2024-054', titre: 'Fourniture de matériel informatique', entite: 'Ministère de l\'Éducation Nationale', date_limite: '2024-06-15', statut: 'Ouvert', budget_estime: '15 000 000 FCFA' },
  { id: 2, ref: 'DAO-2024-012', titre: 'Acquisition de mobilier de bureau', entite: 'SONABEL', date_limite: '2024-05-30', statut: 'Fermé', budget_estime: '5 000 000 FCFA' },
  { id: 3, ref: 'DRP-2024-089', titre: 'Entretien des locaux siège Ouaga', entite: 'ONEA', date_limite: '2024-06-20', statut: 'Ouvert', budget_estime: '2 500 000 FCFA' },
  { id: 4, ref: 'DAO-2024-101', titre: 'Fourniture de produits pharmaceutiques', entite: 'CAMEG', date_limite: '2024-07-01', statut: 'Ouvert', budget_estime: '45 000 000 FCFA' },
];

// Exemple de factures existantes
const MOCK_FACTURES = [
  { id: 'F-2024-001', client: 'Direction Générale des Impôts', date: '2024-04-10', montant: 450000, statut: 'Payée' },
  { id: 'F-2024-002', client: 'Mairie de Bobo-Dioulasso', date: '2024-05-02', montant: 1250000, statut: 'En attente' },
  { id: 'F-2024-003', client: 'Projet Santé (PADS)', date: '2024-05-15', montant: 8900000, statut: 'Brouillon' },
];

// --- COMPOSANTS ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'Ouvert': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Fermé': 'bg-rose-100 text-rose-700 border border-rose-200',
    'Payée': 'bg-blue-100 text-blue-700 border border-blue-200',
    'En attente': 'bg-amber-100 text-amber-700 border border-amber-200',
    'Brouillon': 'bg-slate-100 text-slate-700 border border-slate-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

// --- VUES PRINCIPALES ---

const Dashboard = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-l-4 border-l-blue-500">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <FileBarChart size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Chiffre d'Affaires (2024)</p>
            <p className="text-2xl font-bold text-gray-800">14 500 000 F</p>
          </div>
        </div>
      </Card>
      <Card className="border-l-4 border-l-amber-500">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Factures en attente</p>
            <p className="text-2xl font-bold text-gray-800">1 250 000 F</p>
          </div>
        </div>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Marchés Ouverts</p>
            <p className="text-2xl font-bold text-gray-800">12</p>
          </div>
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800">Derniers Appels d'Offres</h3>
          <button className="text-sm text-blue-600 hover:underline">Voir tout</button>
        </div>
        <div className="space-y-4">
          {MOCK_OFFRES.slice(0, 3).map(offre => (
            <div key={offre.id} className="group flex justify-between items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div>
                <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{offre.titre}</p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{offre.entite}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{offre.budget_estime}</span>
                </div>
              </div>
              <Badge status={offre.statut} />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800">Statut des Factures</h3>
          <button className="text-sm text-blue-600 hover:underline">Gérer</button>
        </div>
        <div className="space-y-4">
          {MOCK_FACTURES.map(facture => (
            <div key={facture.id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <div>
                <p className="font-medium text-gray-800 text-sm">{facture.client}</p>
                <p className="text-xs text-gray-500 mt-0.5">{facture.date} • <span className="font-mono">{facture.id}</span></p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-gray-900">{facture.montant.toLocaleString()} F</p>
                <div className="mt-1 transform scale-90 origin-right">
                  <Badge status={facture.statut} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

const MercurialeView = ({ onAddToInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tout');

  const categories = ['Tout', ...new Set(MOCK_MERCURIALE.map(item => item.categorie))];

  const filteredItems = MOCK_MERCURIALE.filter(item => {
    const matchesSearch = item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Tout' || item.categorie === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Mercuriale des Prix</h2>
          <p className="text-gray-500 text-sm">Référentiel officiel des prix (Mise à jour 2024)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 border-b">Code</th>
                <th className="p-4 border-b">Désignation</th>
                <th className="p-4 border-b">Catégorie</th>
                <th className="p-4 border-b">Unité</th>
                <th className="p-4 border-b text-right">Prix Réf. (FCFA)</th>
                <th className="p-4 border-b text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-4 font-mono text-gray-500 text-xs">{item.code}</td>
                  <td className="p-4 font-medium text-gray-800">{item.designation}</td>
                  <td className="p-4 text-gray-500">
                    <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded-md text-xs">
                      {item.categorie}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{item.unite}</td>
                  <td className="p-4 text-right font-bold text-slate-700">{item.prix_ref.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => onAddToInvoice(item)}
                      className="inline-flex items-center justify-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm hover:shadow"
                      title="Ajouter à la facture"
                    >
                      <Plus size={16} className="mr-1" />
                      <span className="text-xs font-bold">Ajouter</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="font-medium">Aucun article trouvé.</p>
            <p className="text-sm">Essayez de modifier vos critères de recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InvoiceBuilder = ({ selectedMercurialeItem, clearSelection }) => {
  const [items, setItems] = useState([]);
  const [clientInfo, setClientInfo] = useState({ name: '', ifu: '', rccm: '', address: '' });
  const [showAlert, setShowAlert] = useState(false);

  // Add item if passed from Mercuriale view
  useEffect(() => {
    if (selectedMercurialeItem) {
      addItem(selectedMercurialeItem);
      clearSelection();
      // Show simple feedback notification
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  }, [selectedMercurialeItem]);

  const addItem = (mercurialeItem) => {
    const newItem = {
      id: Date.now(),
      designation: mercurialeItem.designation,
      quantity: 1,
      price: mercurialeItem.prix_ref, // Default to max price
      refPrice: mercurialeItem.prix_ref, // Store ref price for validation
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const tva = Math.round(calculateTotal() * 0.18);
  const totalTTC = calculateTotal() + tva;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      {showAlert && (
        <div className="fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-bounce">
          <CheckCircle size={20} className="mr-2" />
          Article ajouté depuis la mercuriale !
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Éditeur de Facture</h2>
          <p className="text-gray-500 text-sm">Création de facture proforma ou définitive</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setItems([])}
            className="flex items-center space-x-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <Trash2 size={18} />
            <span>Vider</span>
          </button>
          <button className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors shadow-md text-sm font-medium">
            <Printer size={18} />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire Client */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-t-4 border-t-indigo-500">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center space-x-2 pb-2 border-b border-gray-100">
              <Building2 size={18} className="text-indigo-500" />
              <span>Informations Client</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Client / Ministère</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none transition-all" 
                  placeholder="Ex: SONABEL, ONEA..."
                  value={clientInfo.name}
                  onChange={e => setClientInfo({...clientInfo, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">N° IFU</label>
                  <input type="text" className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="00012345X" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">RCCM</label>
                  <input type="text" className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="BF-OUA..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Adresse</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" rows="2" placeholder="Adresse postale..."></textarea>
              </div>
            </div>
          </Card>
          
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-start">
              <AlertCircle size={20} className="text-amber-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">Contrôle Mercuriale</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Le système vérifie automatiquement si vos prix unitaires dépassent les seuils autorisés. Les prix en rouge indiquent un dépassement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lignes de facture */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">Détails de la facture</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Devise: FCFA (XOF)</span>
            </div>
            
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <ShoppingCart size={48} className="text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Votre panier est vide</p>
                <p className="text-sm text-slate-400 text-center max-w-xs mt-1">
                  Accédez à l'onglet "Mercuriale" pour sélectionner des produits officiels.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                      <tr>
                        <th className="p-3 rounded-l-lg w-1/2">Désignation</th>
                        <th className="p-3 w-20 text-center">Qté</th>
                        <th className="p-3 w-32 text-right">P.U.</th>
                        <th className="p-3 w-32 text-right">Total</th>
                        <th className="p-3 w-10 rounded-r-lg"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map(item => {
                        const isOverPriced = item.price > item.refPrice;
                        return (
                          <tr key={item.id} className="group hover:bg-slate-50">
                            <td className="p-3">
                              <input 
                                type="text" 
                                value={item.designation} 
                                onChange={(e) => updateItem(item.id, 'designation', e.target.value)}
                                className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors font-medium text-gray-700"
                              />
                              {isOverPriced && (
                                <span className="text-xs text-red-500 flex items-center mt-1">
                                  <AlertCircle size={10} className="mr-1"/> Prix max: {item.refPrice}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="1"
                                value={item.quantity} 
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-gray-200 rounded p-1.5 text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input 
                                type="number" 
                                value={item.price} 
                                onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                                className={`w-full text-right bg-transparent outline-none font-mono ${isOverPriced ? 'text-red-600 font-bold' : 'text-gray-700'}`}
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-gray-800 font-mono">
                              {(item.price * item.quantity).toLocaleString()}
                            </td>
                            <td className="p-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-100">
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex justify-between w-full md:w-1/2 text-gray-600">
                      <span>Total HT</span>
                      <span className="font-mono">{calculateTotal().toLocaleString()} F</span>
                    </div>
                    <div className="flex justify-between w-full md:w-1/2 text-gray-600">
                      <span>TVA (18%)</span>
                      <span className="font-mono">{tva.toLocaleString()} F</span>
                    </div>
                    <div className="flex justify-between w-full md:w-1/2 text-xl font-bold text-indigo-900 pt-3 border-t border-gray-200 mt-2">
                      <span>Net à Payer</span>
                      <span>{totalTTC.toLocaleString()} F CFA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const TendersView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Appels d'Offres & Marchés</h2>
        <p className="text-gray-500 text-sm">Centralisation des avis de la presse et des sites ministériels</p>
      </div>
      <div className="flex space-x-2 w-full md:w-auto">
         <select className="flex-1 md:flex-none border border-gray-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
           <option>Tous les ministères</option>
           <option>Santé</option>
           <option>Éducation</option>
           <option>Infrastructures</option>
           <option>Énergie (SONABEL)</option>
         </select>
         <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
           <Search size={20} />
         </button>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4">
      {MOCK_OFFRES.map(offre => (
        <Card key={offre.id} className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 group">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{offre.ref}</span>
                <Badge status={offre.statut} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{offre.titre}</h3>
              <p className="text-sm text-gray-500 flex items-center mt-2">
                <Building2 size={16} className="mr-1.5 text-gray-400" />
                {offre.entite}
              </p>
            </div>
            
            <div className="flex flex-row md:flex-col justify-between md:text-right text-sm text-gray-500 space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
              <div className="flex items-center md:justify-end text-rose-600 font-medium">
                <Clock size={16} className="mr-1.5" />
                Date limite: {offre.date_limite}
              </div>
              <div className="font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg md:bg-transparent md:p-0">
                Budget: {offre.budget_estime}
              </div>
            </div>
            
            <div className="flex items-center mt-2 md:mt-0 md:ml-4">
               <button className="w-full md:w-auto bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
                Détails
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// --- APPLICATION PRINCIPALE ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMercurialeItem, setSelectedMercurialeItem] = useState(null);

  const handleAddToInvoice = (item) => {
    setSelectedMercurialeItem(item);
    setActiveTab('facturation');
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {activeTab === id && <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-gray-900">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white p-4 shadow-xl z-20">
        <div className="flex items-center space-x-3 px-2 mb-10 mt-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg">F</div>
          <div className="leading-tight">
            <span className="text-xl font-bold tracking-tight block">FasoMarchés</span>
            <span className="text-xs text-blue-400 font-medium tracking-wider uppercase">Gestion Pro</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" />
          <NavItem id="marches" icon={BookOpen} label="Appels d'Offres" />
          <NavItem id="mercuriale" icon={Search} label="Mercuriale Prix" />
          <NavItem id="facturation" icon={FileText} label="Facturation" />
          <NavItem id="suivi" icon={CheckCircle} label="Suivi Paiements" />
        </nav>

        <div className="bg-slate-800/50 rounded-xl p-4 mt-4 border border-slate-700/50">
          <div className="flex items-center space-x-3 mb-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 flex items-center justify-center text-xs font-bold text-white shadow-md border-2 border-slate-800">
              ET
            </div>
            <div>
              <p className="text-sm font-bold text-white">Mon Entreprise</p>
              <p className="text-[10px] text-slate-400 uppercase">IFU: 00012345X</p>
            </div>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full w-3/4 rounded-full"></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-right">Abonnement Actif</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Mobile & Desktop */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center md:hidden">
            <button 
              className="text-gray-600 p-2 -ml-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
            <span className="ml-2 font-bold text-gray-800">FasoMarchés</span>
          </div>
          
          <h2 className="hidden md:block text-lg font-medium text-gray-500">
            {activeTab === 'dashboard' && 'Vue d\'ensemble'}
            {activeTab === 'marches' && 'Opportunités'}
            {activeTab === 'mercuriale' && 'Base de Prix'}
            {activeTab === 'facturation' && 'Gestion Financière'}
          </h2>

          <div className="flex items-center space-x-4 ml-auto">
            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all">
              U
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 bg-slate-900/95 z-50 p-6 flex flex-col md:hidden animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-bold text-white">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X size={28} />
              </button>
            </div>
            <nav className="space-y-3">
              <NavItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" />
              <NavItem id="marches" icon={BookOpen} label="Appels d'Offres" />
              <NavItem id="mercuriale" icon={Search} label="Mercuriale Prix" />
              <NavItem id="facturation" icon={FileText} label="Facturation" />
            </nav>
          </div>
        )}

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'marches' && <TendersView />}
            {activeTab === 'mercuriale' && <MercurialeView onAddToInvoice={handleAddToInvoice} />}
            {activeTab === 'facturation' && (
              <InvoiceBuilder 
                selectedMercurialeItem={selectedMercurialeItem} 
                clearSelection={() => setSelectedMercurialeItem(null)} 
              />
            )}
            {activeTab === 'suivi' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="bg-slate-100 p-6 rounded-full mb-4">
                  <CheckCircle size={48} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Suivi des Paiements</h3>
                <p className="text-gray-500 max-w-md">
                  Ce module permettra de suivre l'état d'avancement de vos dossiers au niveau du Trésor Public et des DAF ministérielles.
                </p>
                <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Configurer les alertes
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
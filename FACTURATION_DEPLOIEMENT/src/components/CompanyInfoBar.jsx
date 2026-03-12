import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, Mail, Edit2 } from 'lucide-react';

export default function CompanyInfoBar({ company, compact }) {
  const navigate = useNavigate();
  if (!company) return null;

  const infos = [];
  if (company.name) infos.push({ icon: Building2, label: company.name, logoUrl: company.logoUrl });
  if (company.ifu) infos.push({ icon: null, label: `IFU: ${company.ifu}` });
  if (company.contact) infos.push({ icon: Phone, label: company.contact });
  if (company.email && !company.contact) infos.push({ icon: Mail, label: company.email });

  if (infos.length === 0) return null;

  return (
    <div className="bg-faso-hover-bg dark:bg-faso-bg/30 border-b border-faso-border px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm min-w-0">
        {infos.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 sm:gap-2 text-faso-text-primary dark:text-white/90 min-w-0">
            {item.logoUrl ? (
              <img src={item.logoUrl} alt={item.label} className="h-6 w-6 sm:h-8 sm:w-8 object-contain rounded-faso shrink-0 border border-faso-border" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }} />
            ) : null}
            {item.icon && <item.icon size={14} className={`text-faso-primary shrink-0 ${item.logoUrl ? 'hidden' : ''}`} />}
            <span className="font-medium truncate max-w-[140px] sm:max-w-none">{item.label}</span>
          </span>
        ))}
      </div>
      <button
        onClick={() => navigate('/company')}
        className="flex items-center gap-1 px-2 py-1.5 text-faso-primary hover:bg-faso-statut-valide-bg rounded-faso text-xs font-medium transition-colors shrink-0"
        title="Modifier les informations de l'entreprise"
      >
        <Edit2 size={14} />
        <span className="hidden sm:inline">Modifier</span>
      </button>
    </div>
  );
}

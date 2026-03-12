/**
 * BrandingBlock - Section branding Burkina Marchés Pro
 * Variantes : full (Login, pages centrées) | compact (sidebar)
 */
import React from 'react';

const BRANDING_FOOTER = {
  designedBy: 'Designed and Developed by FASO EQUIPEMENTS STORE SARL',
  contact: '+226 64 79 24 70 | +226 70 76 81 28',
  email: 'contact@fasoequipements.com',
  rights: 'Tous droits réservés © 2026',
};

export default function BrandingBlock({ variant = 'full', showFooter = true }) {
  const isCompact = variant === 'compact';

  return (
    <div className={`flex flex-col items-center ${isCompact ? 'text-center' : ''}`}>
      {/* 1. Titre principal avec drapeau AES (au-dessus du logo) */}
      <div className={`flex items-center justify-center gap-2 ${isCompact ? 'mb-2' : 'mb-5'}`}>
        <img
          src="/flag-aes.png"
          alt="Drapeau AES"
          className={isCompact ? 'w-8 h-5 object-contain rounded-sm' : 'w-12 h-8 object-contain rounded-sm'}
        />
        <h1
          className={`font-extrabold text-white text-center leading-tight ${
            isCompact
              ? 'text-lg md:text-xl tracking-wide'
              : 'text-[28px] md:text-[42px] tracking-[1px]'
          }`}
        >
          A.E.S
        </h1>
      </div>

      {/* 2. Logo */}
      <div className="flex justify-center">
        <img
          src="/logo-burkina-marches.png"
          alt="A.E.S Marché Pro"
          className={`object-contain object-center ${
            isCompact
              ? 'w-[140px] md:w-[180px] h-auto'
              : 'w-[180px] sm:w-[220px] md:w-[370px] h-auto max-w-[90vw]'
          }`}
          style={{
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* 3. Sous-titre (en dessous du logo) */}
      <p
        className={`font-semibold uppercase tracking-[2px] text-faso-accent ${
          isCompact
            ? 'text-[10px] md:text-xs mt-2'
            : 'text-sm md:text-lg mt-[15px]'
        }`}
      >
        PLATEFORME DE MARCHÉS PUBLICS
      </p>

      {/* 4. Section droits & contacts (Footer) */}
      {showFooter && (
        <div
          className={`text-center border-t border-white/10 ${
            isCompact
              ? 'mt-4 pt-3 text-[10px] md:text-xs'
              : 'mt-10 pt-5 text-sm'
          }`}
          style={{ color: '#B0C4D4' }}
        >
          <p>{BRANDING_FOOTER.designedBy}</p>
          <p className="mt-1">
            Contact : {BRANDING_FOOTER.contact}
          </p>
          {!isCompact && (
            <p className="mt-0.5">Email : {BRANDING_FOOTER.email}</p>
          )}
          <p className="mt-1">{BRANDING_FOOTER.rights}</p>
        </div>
      )}
    </div>
  );
}

export function BrandingFooter({ compact = false }) {
  return (
    <div
      className={`text-center border-t border-white/10 ${compact ? 'mt-3 pt-3 text-[10px]' : 'mt-10 pt-5 text-sm md:text-sm'}`}
      style={{ color: '#B0C4D4' }}
    >
      <p>{BRANDING_FOOTER.designedBy}</p>
      <p className="mt-1">
        Contact : <span className="block md:inline">{BRANDING_FOOTER.contact.split(' | ')[0]}</span>
        <span className="hidden md:inline"> | </span>
        <span className="block md:inline">{BRANDING_FOOTER.contact.split(' | ')[1]}</span>
      </p>
      {!compact && <p className="mt-0.5">Email : {BRANDING_FOOTER.email}</p>}
      <p className="mt-1">{BRANDING_FOOTER.rights}</p>
    </div>
  );
}

export { BRANDING_FOOTER };

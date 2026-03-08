const styles = {
  'Ouvert': 'bg-faso-statut-valide-bg text-faso-statut-valide border border-faso-statut-valide/30',
  'Fermé': 'bg-faso-statut-rejete-bg text-faso-statut-rejete border border-faso-statut-rejete/30',
  'Payée': 'bg-faso-statut-valide-bg text-faso-statut-valide border border-faso-statut-valide/30',
  'En attente': 'bg-faso-statut-attente-bg text-faso-statut-attente border border-faso-statut-attente/30',
  'Brouillon': 'bg-faso-statut-brouillon-bg text-faso-statut-brouillon border border-faso-statut-brouillon/30',
};

export default function Badge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-faso-hover-bg'}`}>
      {status}
    </span>
  );
}

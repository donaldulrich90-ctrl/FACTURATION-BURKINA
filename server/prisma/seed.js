import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const REGIONS = [
  { id: 'centre', nom: 'Kadiogo', chefLieu: 'Ouagadougou' },
  { id: 'boucle-mouhoun', nom: 'Bankui', chefLieu: 'Dédougou' },
  { id: 'cascades', nom: 'Tannounyan', chefLieu: 'Banfora' },
  { id: 'centre-est', nom: 'Nakambé', chefLieu: 'Tenkodogo' },
  { id: 'centre-nord', nom: 'Kuilsé', chefLieu: 'Kaya' },
  { id: 'centre-ouest', nom: 'Nando', chefLieu: 'Koudougou' },
  { id: 'centre-sud', nom: 'Nazinon', chefLieu: 'Manga' },
  { id: 'est', nom: 'Goulmou', chefLieu: 'Fada N\'Gourma' },
  { id: 'hauts-bassins', nom: 'Guiriko', chefLieu: 'Bobo-Dioulasso' },
  { id: 'nord', nom: 'Yaadga', chefLieu: 'Ouahigouya' },
  { id: 'plateau-central', nom: 'Oubri', chefLieu: 'Ziniaré' },
  { id: 'sahel', nom: 'Liptako', chefLieu: 'Dori' },
  { id: 'sud-ouest', nom: 'Djôrô', chefLieu: 'Gaoua' },
  { id: 'ouagadougou', nom: 'Ouagadougou (Ville)', chefLieu: 'Ouagadougou' },
  { id: 'sirba', nom: 'Sirba', chefLieu: 'Bogandé' },
  { id: 'soum', nom: 'Soum', chefLieu: 'Djibo' },
  { id: 'tapoa', nom: 'Tapoa', chefLieu: 'Diapaga' },
  { id: 'sourou', nom: 'Sourou', chefLieu: 'Tougan' },
];

async function main() {
  console.log('🌱 Seed en cours...');

  await prisma.company.upsert({
    where: { id: 'template' },
    create: { id: 'template', name: 'Mercuriale de référence', email: 'template@system.bf' },
    update: {},
  });
  console.log('✓ Entreprise système "template" créée');

  for (const r of REGIONS) {
    await prisma.region.upsert({
      where: { id: r.id },
      create: r,
      update: r,
    });
  }
  console.log(`✓ ${REGIONS.length} régions créées`);

  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@plateforme.com' },
    create: {
      email: 'admin@plateforme.com',
      password: hashed,
      name: 'Super Admin',
      role: 'super_admin',
    },
    update: { password: hashed },
  });
  console.log('✓ Super Admin créé (admin@plateforme.com / admin123)');

  // Mercuriale de référence (template) — disponible en ligne pour Ouagadougou et Centre
  const MERCURIALE_ARTICLES = [
    { code: '03.1.1.1.1.0.001', designation: "Agenda grand format couverture estampillée 100 pages papier 80g", conditionnement: 'Unité', categorie: 'Fournitures', type: 'article', prix_min: 8000, prix_moyen: 9165, prix_max: 10000 },
    { code: '03.1.1.1.1.0.002', designation: "Agenda grand format couverture estampillée 100 pages papier 80g", conditionnement: 'Paquet de 10', categorie: 'Fournitures', type: 'article', prix_min: 79000, prix_moyen: 91000, prix_max: 99000 },
    { code: '03.1.1.1.1.0.003', designation: "Agenda grand format couverture estampillée 100 pages papier glacé 135g", conditionnement: 'Unité', categorie: 'Fournitures', type: 'article', prix_min: 8500, prix_moyen: 9665, prix_max: 10500 },
    { code: 'FUR-BUR-001', designation: 'Rame de papier A4 80g (Double A)', conditionnement: 'Paquet', categorie: 'Fournitures de bureau', type: 'article', prix_min: 3200, prix_moyen: 3500, prix_max: 3800 },
    { code: 'ALI-RIZ-50', designation: 'Sac de Riz 50kg (Riz local)', conditionnement: 'Sac', categorie: 'Alimentation', type: 'article', prix_min: 21000, prix_moyen: 22500, prix_max: 24000 },
    { code: 'MOB-BUR-010', designation: 'Chaise visiteur avec accoudoirs', conditionnement: 'Unité', categorie: 'Mobilier', type: 'article', prix_min: 32000, prix_moyen: 35000, prix_max: 38000 },
  ];
  const regionsMercuriale = ['ouagadougou', 'centre'];
  for (const regionId of regionsMercuriale) {
    for (const a of MERCURIALE_ARTICLES) {
      await prisma.mercurialeArticle.upsert({
        where: { code_conditionnement_regionId_companyId: { code: a.code, conditionnement: a.conditionnement, regionId, companyId: 'template' } },
        create: { ...a, regionId, companyId: 'template' },
        update: { designation: a.designation, prix_min: a.prix_min, prix_moyen: a.prix_moyen, prix_max: a.prix_max },
      });
    }
  }
  console.log(`✓ ${MERCURIALE_ARTICLES.length * regionsMercuriale.length} articles mercuriale (Ouagadougou, Centre) créés`);

  console.log('✅ Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

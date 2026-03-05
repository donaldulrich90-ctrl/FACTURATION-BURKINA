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

  console.log('✅ Seed terminé (aucune donnée mercuriale ni entreprise de démo).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

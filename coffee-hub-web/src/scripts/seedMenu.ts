import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { menuItems } from '../data/menuItems.ts';

const loadEnvFile = (fileName: string) => {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadEnvFile('.env.local');
loadEnvFile('.env');

const { db } = await import('../firebase.ts');

async function seedMenuToFirestore() {
  let addedCount = 0;
  let skippedCount = 0;

  for (const item of menuItems) {
    const existingQuery = query(
      collection(db, 'menu_items'),
      where('name', '==', item.name),
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      skippedCount += 1;
      console.log(`Skipped (exists): ${item.name}`);
      continue;
    }

    await addDoc(collection(db, 'menu_items'), {
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      image: item.image,
      rating: item.rating,
      spiceLevel: item.spiceLevel,
      veg: item.veg,
      isAvailable: true,
      createdAt: serverTimestamp(),
    });

    addedCount += 1;
    console.log(`Added: ${item.name}`);
  }

  console.log(`Seed complete. Added: ${addedCount}, Skipped: ${skippedCount}`);
}

// Temporary seed script: run manually once.
seedMenuToFirestore().catch(error => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});

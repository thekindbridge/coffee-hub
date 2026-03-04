import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { menuItems } from '../data/menuItems';

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

const { db } = await import('../firebase');

async function uploadMenu() {
  let addedCount = 0;
  let skippedCount = 0;

  for (const item of menuItems) {
    const duplicateQuery = query(
      collection(db, 'menu_items'),
      where('name', '==', item.name),
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);

    if (!duplicateSnapshot.empty) {
      skippedCount += 1;
      console.log(`Skipped (already exists): ${item.name}`);
      continue;
    }

    await addDoc(collection(db, 'menu_items'), item);
    addedCount += 1;
    console.log(`Added: ${item.name}`);
  }

  console.log(`Menu upload complete. Added: ${addedCount}, Skipped: ${skippedCount}`);
}

uploadMenu().catch(error => {
  console.error('Menu upload failed:', error);
  process.exitCode = 1;
});

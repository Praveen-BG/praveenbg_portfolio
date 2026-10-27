import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const pages = ['index.html', 'explore-work.html'];
const errors = [];

for (const page of pages) {
  const pagePath = path.join(root, page);
  const html = await fs.readFile(pagePath, 'utf8');
  if (!html.includes('assets/ask-praveen.js?v=9')) errors.push(`${page}: chatbot script is missing`);
  if (!html.includes('assets/experience-preferences.js?v=2')) errors.push(`${page}: shared preference script is missing`);
  if (!html.includes('assets/ask-praveen.css?v=10')) errors.push(`${page}: chatbot stylesheet is missing`);

  const localReferences = [...html.matchAll(/(?:src|href)="((?:assets|data)\/[^"?#]+)(?:[?#][^"]*)?"/g)]
    .map(match => match[1]);
  for (const reference of new Set(localReferences)) {
    const target = path.join(root, reference);
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile() || stat.size === 0) errors.push(`${page}: empty asset ${reference}`);
    } catch {
      errors.push(`${page}: missing asset ${reference}`);
    }
  }
}

const faq = JSON.parse(await fs.readFile(path.join(root, 'data/portfolio-faq.json'), 'utf8'));
if (faq.total_questions !== faq.questions.length) errors.push('FAQ declared count does not match its entries');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Static production output validated: ${pages.length} pages, ${faq.questions.length} FAQ entries, all referenced local assets present.`);
}

import fs from 'node:fs/promises';
import path from 'node:path';

const requiredTopLevel = ['schema_version', 'dataset_name', 'language', 'updated_on', 'total_questions', 'questions'];
const requiredQuestion = ['id', 'category', 'question', 'answer'];

export function validateFaqDataset(dataset) {
  const errors = [];
  for (const key of requiredTopLevel) if (!(key in dataset)) errors.push(`Missing top-level field: ${key}`);
  if (!Array.isArray(dataset.questions)) return [...errors, 'questions must be an array'];
  if (dataset.total_questions !== dataset.questions.length) errors.push('total_questions does not match questions.length');
  const ids = new Set();
  dataset.questions.forEach((item, index) => {
    for (const key of requiredQuestion) if (typeof item[key] !== 'string' || !item[key].trim()) errors.push(`Question ${index} has invalid ${key}`);
    if (ids.has(item.id)) errors.push(`Duplicate id: ${item.id}`);
    ids.add(item.id);
    if (item.answer?.includes('[') || item.answer?.includes(']')) errors.push(`Question ${item.id} contains a bracketed placeholder`);
    if (item.url && !/^(https:\/\/|mailto:[^\s@]+@[^\s@]+\.[^\s@]+$|(?:\.\/)?(?:index|explore-work)\.html(?:#[-\w]+)?$)/.test(item.url)) errors.push(`Question ${item.id} has an unsupported URL`);
    if (item.link_text && !item.url) errors.push(`Question ${item.id} has link_text without url`);
  });
  return errors;
}

export async function loadFaqDataset(filePath = path.resolve('dist/data/portfolio-faq.json')) {
  const dataset = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const errors = validateFaqDataset(dataset);
  if (errors.length) throw new Error(`FAQ validation failed:\n${errors.join('\n')}`);
  return dataset;
}

import { loadFaqDataset } from '../server/faq.mjs';

const dataset = await loadFaqDataset();
console.log(`Validated ${dataset.total_questions} FAQ questions across ${new Set(dataset.questions.map(item => item.category)).size} categories.`);

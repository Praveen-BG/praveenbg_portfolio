import { loadDotEnv, getConfig } from './server/config.mjs';
import { loadFaqDataset } from './server/faq.mjs';
import { createPortfolioServer } from './server/app.mjs';

loadDotEnv();
const config = getConfig();
if (config.aiEnabled) console.warn('ASK_PRAVEEN_AI_ENABLED is ignored: this build intentionally runs deterministic FAQ mode only.');
const faqDataset = await loadFaqDataset();
const { server } = createPortfolioServer({ config, faqDataset });
server.listen(config.port, '127.0.0.1', () => {
  console.log(`Ask Praveen portfolio: http://127.0.0.1:${config.port}/`);
  console.log('FAQ: deterministic · Recording: disabled · Live AI: disabled');
});

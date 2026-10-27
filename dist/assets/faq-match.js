export function normalise(value) {
  return String(value || '').toLocaleLowerCase('en-IN').normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const stopWords = new Set(['the','a','an','is','are','was','were','what','which','who','can','could','do','does','did','to','of','in','on','for','and','or','his','he','me','i','you','about','tell','show','know','explain','please','give']);

function tokens(value) {
  return [...new Set(normalise(value).split(' ').filter(token => (token.length > 2 || token === 'ai') && !stopWords.has(token)).map(token => token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token))];
}

export function scoreQuestion(query, item) {
  const q = normalise(query);
  const variants = [item.question, ...(item.aliases || [])].map(normalise);
  if (variants.includes(q)) return 1;
  let best = 0;
  const queryTokens = tokens(q);
  for (const variant of variants) {
    const itemTokens = tokens(variant);
    const common = queryTokens.filter(token => itemTokens.includes(token)).length;
    if (!queryTokens.length || !itemTokens.length) continue;
    if (queryTokens.length > 1 && common < 2) continue;
    let score = (common / queryTokens.length) * .65 + (common / itemTokens.length) * .35;
    if (q.length >= 5 && (variant.includes(q) || q.includes(variant))) score += .2;
    best = Math.max(best, Math.min(score, .99));
  }
  return best;
}

export function matchTypedQuestion(query, faq) {
  return faq.map(item => ({ item, score: scoreQuestion(query, item) })).sort((a, b) => b.score - a.score);
}

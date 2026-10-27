import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { loadFaqDataset, validateFaqDataset } from '../server/faq.mjs';
import { matchTypedQuestion } from '../dist/assets/faq-match.js';

const expectedCategories = [
  'About Praveen',
  'Experience & Skills',
  'Selected Work',
  'AI & Experiments',
  'Education & Learning',
  'Hiring & Collaboration',
  'Contact'
];

test('portfolio FAQ dataset validates and covers every requested category', async () => {
  const dataset = await loadFaqDataset();
  assert.deepEqual(validateFaqDataset(dataset), []);
  assert.deepEqual([...new Set(dataset.questions.map(item => item.category))], expectedCategories);
  assert.equal(dataset.total_questions, 21);
  assert.equal(new Set(dataset.questions.map(item => item.id)).size, dataset.total_questions);
});

test('selected FAQ IDs return the approved answer unchanged', async () => {
  const dataset = await loadFaqDataset();
  const media = dataset.questions.find(item => item.id === 'experience_002');
  assert.equal(media.answer, 'As Senior UX Designer, I worked on Atom Suite browser extensions, improving installation and onboarding journeys through A/B testing, funnel analysis, and UX optimisation across Chrome and Firefox.');
  assert.equal(dataset.questions.some(item => /design approach/i.test(item.question)), false);
  const removedIds = ['contact_003', 'hiring_001', 'ai_003', 'ai_004', 'work_005', 'experience_001', 'hiring_002'];
  for (const id of removedIds) assert.equal(dataset.questions.some(item => item.id === id), false, `${id} is removed`);
  const removedQuestions = [
    'Where else can I see your work?',
    'How can I assess your fit for a product design role?',
    'What is Monster Kids?',
    'What is Windows AI Companion?',
    'Can I see detailed case studies?',
    'Tell me about your experience.',
    'What outcomes are documented in Praveen’s experience?'
  ];
  for (const question of removedQuestions) assert.equal(dataset.questions.some(item => item.question === question), false, `${question} is removed`);
  assert.equal(dataset.questions.find(item => item.id === 'hiring_003').answer, 'I’m available to join immediately.');
  assert.equal(dataset.questions.find(item => item.id === 'hiring_004').answer, 'My preferred work locations are Chennai, Bengaluru, and Hyderabad.');
  assert.equal(dataset.questions.find(item => item.id === 'contact_001').link_text, 'Email me');
  const resume = dataset.questions.find(item => item.id === 'contact_002');
  assert.equal(resume.question, 'Can I see your resume?');
  assert.equal(resume.link_text, 'View my resume');
  assert.equal(resume.url, 'assets/Praveen_CV.pdf');
  assert.equal(resume.answer, 'Yes. You can view my current resume here.');
  assert.doesNotMatch(JSON.stringify(resume), /résumé|resumé/i);
});

test('typed matching is deterministic and conservative', async () => {
  const { questions } = await loadFaqDataset();
  assert.equal(matchTypedQuestion('Tell me about BitBox', questions)[0].item.id, 'work_004');
  assert.equal(matchTypedQuestion('What happened at Gain Credit?', questions)[0].item.id, 'experience_003');
  assert.equal(matchTypedQuestion('Preferred location', questions)[0].item.id, 'hiring_004');
  assert.equal(matchTypedQuestion('Are you an immediate joiner?', questions)[0].item.id, 'hiring_003');
  assert.equal(matchTypedQuestion('How do I contact you?', questions)[0].item.id, 'contact_001');
  assert.ok(matchTypedQuestion('salary expectations', questions)[0].score < .34);
  const ambiguous = matchTypedQuestion('AI concept', questions).slice(0, 3);
  assert.ok(ambiguous[0].score >= .34);
  assert.equal(ambiguous[0].item.id, 'ai_002');
});

test('browser code renders visitor content with textContent rather than innerHTML', async () => {
  const source = await fs.readFile('dist/assets/ask-praveen.js', 'utf8');
  assert.match(source, /bubble\.textContent = text/);
  assert.match(source, /`chat-message chat-\$\{role\}`/);
  assert.doesNotMatch(source, /`chat-message \$\{role\}`/);
  assert.doesNotMatch(source, /innerHTML\s*=/);
  assert.doesNotMatch(source, /\/api\/chat\//);
  assert.doesNotMatch(source, /consent|saveRequested|visitor_company|recordInteraction|recordEvent/);
  assert.match(source, /Hi, welcome! Explore my experience/);
  assert.match(source, /backButton\.addEventListener\('click', \(\) =>/);
  assert.match(source, /goBack\(\)/);
  assert.doesNotMatch(source, /addMessage\(category, 'user'\)/);
  assert.match(source, /renderCategoryChoices/);
  assert.match(source, /chat-question-list/);
  assert.match(source, /state\.history\.push/);
  assert.match(source, /playSound\('pop', \{ delay: 110 \}\)/);
  assert.match(source, /\\\.pdf\(\?:\$\|\[\?#\]\)/);
});

test('homepage exposes the non-modal chat and cleaned contact surfaces', async () => {
  const html = await fs.readFile('dist/index.html', 'utf8');
  assert.match(html, /role="dialog" aria-modal="false"/);
  assert.match(html, /Interactive portfolio FAQ/);
  assert.doesNotMatch(html, /Answers from approved portfolio information/);
  assert.match(html, /id="assistantBack" type="button" hidden>← Back/);
  assert.match(html, /mailto:bgpraveen26@gmail\.com/);
  assert.doesNotMatch(html, /showModal\s*\(/);
  assert.match(html, /<section class="contact" id="contact"/);
  assert.match(html, /<canvas class="star-canvas" id="contactStarCanvas"/);
  assert.match(html, /href="mailto:bgpraveen26@gmail\.com">Email ↗<\/a>/);
  assert.match(html, /href="assets\/Praveen_CV\.pdf" target="_blank" rel="noopener noreferrer">Resume/);
  const contactSection = html.match(/<section class="contact"[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(contactSection, />Let's Talk ↗</);
  assert.doesNotMatch(html, /Instagram/);
  assert.doesNotMatch(html, /Ask Praveen ✦/);
  assert.doesNotMatch(html, /Demo responses|No live AI/i);

  const menu = html.match(/<div class="talk-menu"[^>]*>(.*?)<\/div><\/div><\/nav>/)?.[1] || '';
  assert.ok(menu.indexOf('Resume') < menu.indexOf('Email'));
  assert.ok(menu.indexOf('Email') < menu.indexOf('LinkedIn'));

  const desktop = html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.ok(desktop.indexOf('HOME') < desktop.indexOf('PORTFOLIO'));
  assert.ok(desktop.indexOf('PORTFOLIO') < desktop.indexOf('AI LAB'));
  assert.ok(desktop.indexOf('AI LAB') < desktop.indexOf('EXPERIENCE'));
  assert.ok(desktop.indexOf('EXPERIENCE') < desktop.indexOf('ABOUT'));
  assert.ok(desktop.indexOf('ABOUT') < desktop.indexOf("LET'S TALK"));
  const mobile = html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.ok(mobile.indexOf('PORTFOLIO') < mobile.indexOf('AI LAB'));
  assert.ok(mobile.indexOf('AI LAB') < mobile.indexOf('EXPERIENCE'));
  assert.ok(mobile.indexOf('EXPERIENCE') < mobile.indexOf('ABOUT'));
  assert.ok(mobile.indexOf('ABOUT') < mobile.indexOf("LET'S TALK"));
});

test('chatbot integration is present exactly once on both portfolio pages', async () => {
  for (const file of ['dist/index.html', 'dist/explore-work.html']) {
    const html = await fs.readFile(file, 'utf8');
    assert.equal((html.match(/id="assistantOpen"/g) || []).length, 1, `${file} has one launcher`);
    assert.equal((html.match(/id="assistant"/g) || []).length, 1, `${file} has one panel`);
    assert.match(html, /assets\/experience-preferences\.js\?v=2/);
    assert.match(html, /assets\/ask-praveen\.css\?v=10/);
    assert.match(html, /assets\/ask-praveen\.js\?v=10/);
    assert.match(html, /type="button" aria-label="Ask Praveen"/);
    assert.match(html, /role="dialog" aria-modal="false"/);
    assert.ok(html.indexOf('id="chatLog"') < html.indexOf('id="chatActions"'), `${file} can render welcome before categories`);
    assert.ok(html.indexOf('id="chatContent"') < html.indexOf('id="chatForm"'), `${file} keeps the composer as the final panel row`);
    assert.doesNotMatch(html, /id="chatNote"/);
  }
});

test('every live header exposes the tracked resume PDF without disabled markup', async () => {
  const home = await fs.readFile('dist/index.html', 'utf8');
  const explore = await fs.readFile('dist/explore-work.html', 'utf8');
  const resumeHref = 'href="assets/Praveen_CV.pdf" target="_blank" rel="noopener noreferrer"';
  assert.equal((home.match(/href="assets\/Praveen_CV\.pdf"/g) || []).length, 2);
  assert.match(explore, new RegExp(resumeHref.replaceAll('.', '\\.')));
  assert.doesNotMatch(home, /data-missing="Resume URL"|aria-disabled="true"[^>]*>Resume|Résumé|RÉSUMÉ/);
  assert.doesNotMatch(home, /Resume\s*<span[^>]*>—<\/span>/);
  assert.match(home, />Resume <span aria-hidden="true">↗<\/span><\/a>/);
  assert.match(explore, />Resume ↗<\/a>/);
  const css = await fs.readFile('dist/assets/ask-praveen.css', 'utf8');
  assert.doesNotMatch(css, /talk-menu \[aria-disabled=true\]/);
  const pdf = await fs.readFile('dist/assets/Praveen_CV.pdf');
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

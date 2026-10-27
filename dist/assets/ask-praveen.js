import { matchTypedQuestion } from './faq-match.js?v=3';

const assistant = document.querySelector('#assistant');
const launcher = document.querySelector('#assistantOpen');
const closeButton = document.querySelector('#assistantClose');
const backButton = document.querySelector('#assistantBack');
const content = document.querySelector('#chatContent');
const log = document.querySelector('#chatLog');
const actions = document.querySelector('#chatActions');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#chatQuestion');
const experience = window.PraveenExperience;

document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-input'), true);
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'), true);

const welcomeCopy = 'Hi, welcome! Explore my experience, projects, skills, preferred locations, and availability. Choose a topic below or ask a question.';
const fallback = 'I don’t have that information in this portfolio. You can email me directly.';
const categories = [
  'About Praveen',
  'Experience & Skills',
  'Selected Work',
  'AI & Experiments',
  'Education & Learning',
  'Hiring & Collaboration',
  'Contact'
];

const state = {
  faq: [],
  byId: new Map(),
  category: null,
  view: 'categories',
  history: [],
  visibleMessages: [],
  opener: null
};

function playSound(name, options) {
  experience?.unlock().then(() => experience.play(name, options)).catch(() => {});
}

function createButton(label, onClick, className, sound = 'tap') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.dataset.sound = 'none';
  button.addEventListener('click', () => {
    playSound(sound);
    onClick();
  });
  return button;
}

function setView(view) {
  state.view = view;
  content.dataset.view = view;
}

function setBackVisible(visible) {
  backButton.hidden = !visible;
  backButton.parentElement.hidden = !visible;
}

function createMessageRow({ text, role = 'assistant', link = null }) {
  const row = document.createElement('div');
  row.className = `chat-message chat-${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  if (link?.url && link?.text) {
    const anchor = document.createElement('a');
    anchor.className = 'chat-link';
    anchor.href = link.url;
    anchor.textContent = `${link.text} ↗`;
    if (/^https:\/\//.test(link.url) || /\.pdf(?:$|[?#])/i.test(link.url)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    bubble.append(document.createElement('br'), anchor);
  }
  row.append(bubble);
  return row;
}

function renderMessages(messages) {
  state.visibleMessages = messages;
  log.replaceChildren(...messages.map(createMessageRow));
  content.scrollTop = 0;
}

function rememberMessages(messages) {
  state.history.push(...messages);
}

function renderCategoryChoices() {
  actions.replaceChildren();
  const heading = document.createElement('p');
  heading.className = 'chat-actions-title';
  heading.textContent = 'Choose a topic';
  const list = document.createElement('div');
  list.className = 'chat-category-list';
  list.setAttribute('aria-label', 'Portfolio FAQ categories');
  categories.forEach(category => {
    list.append(createButton(category, () => showQuestions(category), 'chat-category'));
  });
  actions.append(heading, list);
}

function renderCategoryHeading(category) {
  actions.replaceChildren();
  const heading = document.createElement('p');
  heading.className = 'chat-screen-title';
  heading.textContent = category || 'Answer';
  actions.append(heading);
}

function renderQuestionChoices(category) {
  renderCategoryHeading(category);
  const list = document.createElement('div');
  list.className = 'chat-question-list';
  state.faq.filter(item => item.category === category).forEach(item => {
    list.append(createButton(item.question, () => answerFaq(item.id), 'chat-question'));
  });
  actions.append(list);
}

function renderPossibleMatches(matches) {
  actions.replaceChildren();
  const heading = document.createElement('p');
  heading.className = 'chat-screen-title';
  heading.textContent = 'Possible matches';
  const list = document.createElement('div');
  list.className = 'chat-question-list';
  matches.forEach(match => {
    list.append(createButton(match.item.question, () => answerFaq(match.item.id), 'chat-question'));
  });
  actions.append(heading, list);
}

function showCategories() {
  state.category = null;
  setView('categories');
  setBackVisible(false);
  renderMessages([{ text: welcomeCopy, role: 'system' }]);
  renderCategoryChoices();
  form.hidden = false;
}

function showQuestions(category) {
  state.category = category;
  setView('questions');
  setBackVisible(true);
  renderQuestionChoices(category);
  renderMessages([]);
  form.hidden = false;
}

function showAnswer(category, messages) {
  state.category = category;
  setView('answer');
  setBackVisible(true);
  renderCategoryHeading(category);
  renderMessages(messages);
  form.hidden = false;
  playSound('pop', { delay: 110 });
}

function answerFaq(id, typedQuestion = null) {
  const item = state.byId.get(id);
  if (!item) return showFallback(typedQuestion || id);
  const messages = [
    { text: typedQuestion || item.question, role: 'user' },
    {
      text: item.answer,
      role: 'assistant',
      link: item.url ? { text: item.link_text, url: item.url } : null
    }
  ];
  rememberMessages(messages);
  showAnswer(item.category, messages);
}

function handleTypedQuestion(query) {
  const clean = query.trim().slice(0, 300);
  if (!clean) return;
  input.value = '';
  const matches = matchTypedQuestion(clean, state.faq);
  const [top, second] = matches;
  if (top && top.score >= .67 && (!second || top.score - second.score >= .12)) {
    answerFaq(top.item.id, clean);
    return;
  }
  const userMessage = { text: clean, role: 'user' };
  if (top && top.score >= .34) {
    const likely = matches.filter(match => match.score >= Math.max(.3, top.score - .18)).slice(0, 3);
    const prompt = { text: 'I found a few portfolio questions that may be relevant. Which one did you mean?', role: 'assistant' };
    rememberMessages([userMessage, prompt]);
    state.category = null;
    setView('typed');
    setBackVisible(true);
    renderPossibleMatches(likely);
    renderMessages([userMessage, prompt]);
    return;
  }
  showFallback(clean, true);
}

function showFallback(question, includeUser = true) {
  const contact = state.byId.get('contact_001');
  const messages = [];
  if (includeUser) messages.push({ text: question, role: 'user' });
  messages.push({
    text: fallback,
    role: 'assistant',
    link: contact?.url ? { text: contact.link_text, url: contact.url } : null
  });
  rememberMessages(messages);
  showAnswer(null, messages);
}

function goBack() {
  if (state.view === 'questions') {
    showCategories();
    return;
  }
  if (state.view === 'answer' && state.category) {
    showQuestions(state.category);
    return;
  }
  showCategories();
}

form.querySelector('button').dataset.sound = 'none';
form.addEventListener('submit', event => {
  event.preventDefault();
  handleTypedQuestion(input.value);
});

backButton.dataset.sound = 'none';
backButton.addEventListener('click', () => {
  playSound('click');
  goBack();
});

function openAssistant() {
  state.opener = document.activeElement;
  if (!content.dataset.view) showCategories();
  assistant.hidden = false;
  assistant.classList.add('is-open');
  launcher.setAttribute('aria-expanded', 'true');
  closeButton.focus();
}

function closeAssistant({ restoreFocus = true, sound = true } = {}) {
  if (assistant.hidden) return;
  if (sound) playSound('click');
  assistant.hidden = true;
  assistant.classList.remove('is-open');
  launcher.setAttribute('aria-expanded', 'false');
  if (restoreFocus) state.opener?.focus();
}

launcher.dataset.sound = 'none';
launcher.addEventListener('click', () => {
  if (assistant.hidden) {
    playSound('chime');
    openAssistant();
  } else {
    closeAssistant();
  }
});
closeButton.dataset.sound = 'none';
closeButton.addEventListener('click', () => closeAssistant());
assistant.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeAssistant();
  }
});

async function initialise() {
  try {
    const response = await fetch('data/portfolio-faq.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('FAQ unavailable');
    const dataset = await response.json();
    state.faq = dataset.questions;
    state.byId = new Map(state.faq.map(item => [item.id, item]));
  } catch {
    launcher.disabled = true;
    launcher.setAttribute('aria-label', 'Ask Praveen is temporarily unavailable');
  }
}

initialise();

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const read = file => fs.readFile(`dist/${file}`, 'utf8');

test('homepage exposes company case studies in new tabs', async () => {
  const home = await read('index.html');
  assert.match(home, /href="gain-credit\.html" target="_blank" rel="noopener noreferrer">View Drafty case study ↗<\/a>/);
  assert.match(home, /href="idp\.html" target="_blank" rel="noopener noreferrer">View IDP case study ↗<\/a>/);
  assert.match(home, /href="matrimony\.html" target="_blank" rel="noopener noreferrer">View Matrimony\.com case study ↗<\/a>/);
  assert.match(home, /id="idpPanel"[\s\S]*Course Discovery · Student Essentials/);
  assert.doesNotMatch(home, /~15%<\/strong><span>ONBOARDING DROP-OFF/);
});

test('Gain Credit case study stays within the confirmed evidence boundary', async () => {
  const page = await read('gain-credit.html');
  assert.match(page, /<h1>Improving Drafty across web and mobile<\/h1>/);
  assert.match(page, /Feb 2021 – Apr 2022/);
  assert.match(page, /website, web application, and mobile experience/);
  assert.match(page, /Historical asset needed/);
  assert.match(page, /Current website ↗/);
  assert.match(page, /Current Android app ↗/);
  assert.match(page, /assets\/company-supplied\/drafty\.jpg/);
  assert.doesNotMatch(page, /Improve the system progressively|Back to Experience/);
  assert.doesNotMatch(page, /15%|reduced drop-off/i);
});

test('Matrimony case study separates shipped, unlaunched, and concept work', async () => {
  const page = await read('matrimony.html');
  assert.match(page, /<h1>Product interfaces and wedding discovery at Matrimony\.com<\/h1>/);
  assert.match(page, /Designed concept · Did not launch/);
  assert.match(page, /Home → Listings → Detail/);
  assert.match(page, /assets\/matrimony\/wedding-directory-home-2026\.jpg/);
  assert.match(page, /assets\/matrimony\/wedding-directory-listings-2026\.jpg/);
  assert.match(page, /assets\/matrimony\/wedding-directory-detail-2026\.jpg/);
  assert.doesNotMatch(page, /assets\/matrimony\/wedding-directory-(?:home|listings|detail)\.webp/);
  assert.match(page, /assets\/company-supplied\/mandap\.jpg/);
  assert.match(page, /assets\/company-supplied\/wedding-bazaar\.jpg/);
  assert.match(page, /assets\/company-supplied\/bharat-matrimony-home\.png/);
  assert.match(page, /assets\/company-supplied\/bharat-matrimony-preferences\.png/);
  assert.doesNotMatch(page, /Historical asset needed[\s\S]*Bharat Matrimony/);
  assert.equal((page.match(/Current website reference/g) || []).length, 2);
  assert.match(page, /Brainstorming contribution/);
  assert.match(page, /does not claim that a trial verifies marital status or prevents fraud/);
  assert.doesNotMatch(page, /Matrimony Dictionary/);
});

test('IDP case study distinguishes demonstrated screens from future opportunities', async () => {
  const page = await read('idp.html');
  assert.match(page, /<h1>Helping students discover courses and essential services<\/h1>/);
  assert.match(page, /October 2018–February 2021/);
  assert.equal((page.match(/Current website reference/g) || []).length, 2);
  assert.match(page, /assets\/company-supplied\/idp-listing\.jpg/);
  assert.match(page, /assets\/company-supplied\/idp-detail\.jpg/);
  assert.match(page, /illustrative profiles used to frame different preparation needs/i);
  assert.match(page, /not presented as verified interview participants/i);
  assert.match(page, /Future opportunity · checklist/);
  assert.match(page, /No verified outcome data is established/);
  assert.match(page, /assets\/idp\/student-essentials-overview\.png/);
  assert.match(page, /assets\/idp\/student-essentials-services\.png/);
  assert.match(page, /assets\/idp\/student-essentials-accommodation\.png/);
  assert.doesNotMatch(page, /increased adoption|reduced support requests|improved satisfaction|faster completion/i);
});

test('all company pages use the shared responsive company navigation', async () => {
  for (const file of ['atom-desktop.html', 'gain-credit.html', 'idp.html', 'matrimony.html']) {
    const page = await read(file);
    assert.match(page, /class="company-nav"/);
    assert.match(page, /Media\.net/);
    assert.match(page, /Gain Credit/);
    assert.match(page, /<span>IDP<\/span>/);
    assert.match(page, /Matrimony\.com/);
    const stylesheetVersion = file === 'matrimony.html' ? '6' : '5';
    assert.match(page, new RegExp(`assets/company-case-study\\.css\\?v=${stylesheetVersion}`));
    assert.match(page, /class="nav-roll"/);
    assert.match(page, /class="footer contact-footer"/);
    assert.doesNotMatch(page, /Back to Experience/);
  }
});

test('company-page closing summaries and removed comparison content stay removed', async () => {
  const atom = await read('atom-desktop.html');
  const gain = await read('gain-credit.html');
  const idp = await read('idp.html');
  const matrimony = await read('matrimony.html');
  assert.doesNotMatch(atom, /Shared framework|Evidence boundary|Design lessons|Utility starts before installation/);
  assert.match(atom, /assets\/atom\/manuals-landing-page-clean\.png/);
  assert.doesNotMatch(gain, /Contribution and lessons|Improve the system progressively/);
  assert.doesNotMatch(idp, /From finding a course to preparing for the move/);
  assert.doesNotMatch(matrimony, /Creatives for moments that matter|Contribution and lessons/);
  assert.ok(matrimony.indexOf('02 · Mandap') < matrimony.indexOf('03 · WeddingBazaar'));
  assert.ok(matrimony.indexOf('03 · WeddingBazaar') < matrimony.indexOf('04 · Wedding Directory'));
});

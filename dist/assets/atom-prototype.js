const modeToggle=document.querySelector('#privateMode');
const providerSelect=document.querySelector('#provider');
const stateText=document.querySelector('#currentState');
const question=document.querySelector('#atomQuestion');
const explainButton=document.querySelector('#explainSettings');
const previewButton=document.querySelector('#previewChange');
const applyButton=document.querySelector('#applyDemo');
const resetButton=document.querySelector('#resetDemo');
const explanation=document.querySelector('#explanation');
const answerLabel=document.querySelector('#answerLabel');
const answerText=document.querySelector('#answerText');
const preview=document.querySelector('#changePreview');
const previewText=document.querySelector('#previewText');

const defaults={privateMode:false,provider:'Yahoo'};
let applied={...defaults};

function draft(){return{privateMode:modeToggle.getAttribute('aria-checked')==='true',provider:providerSelect.value}}
function describe(state){return`Private Mode: ${state.privateMode?'On':'Off'} · Current provider: ${state.provider}`}
function sync(){stateText.textContent=describe(applied);modeToggle.querySelector('span').textContent=modeToggle.getAttribute('aria-checked')==='true'?'On':'Off';preview.hidden=true;applyButton.disabled=true}
function quickExplanation(state){
  if(state.privateMode){return`Turning Private Mode on routes searches in this demo to ${state.provider}. It does not open an Incognito window. Incognito is a separate browser feature with its own history and cookie behavior.`}
  return`Private Mode is off, so Yahoo remains the provider in this demo. Changing the simulated setting does not open Incognito or alter your real browser.`
}
modeToggle.addEventListener('click',()=>{modeToggle.setAttribute('aria-checked',String(modeToggle.getAttribute('aria-checked')!=='true'));sync()});
providerSelect.addEventListener('change',sync);
previewButton.addEventListener('click',()=>{const next=draft();previewText.textContent=`Preview: ${describe(applied)} → ${describe(next)}. Nothing has been applied yet.`;preview.hidden=false;applyButton.disabled=false});
applyButton.addEventListener('click',()=>{applied=draft();stateText.textContent=describe(applied);previewText.textContent=`Applied in this demo only: ${describe(applied)}. Your browser settings were not changed.`;applyButton.disabled=true});
resetButton.addEventListener('click',()=>{applied={...defaults};modeToggle.setAttribute('aria-checked','false');providerSelect.value='Yahoo';explanation.hidden=true;sync()});
explainButton.addEventListener('click',async()=>{
  const text=question.value.trim();
  if(!text){question.focus();return}
  explainButton.disabled=true;explainButton.textContent='Explaining…';
  explanation.hidden=false;answerLabel.textContent='Checking settings';answerText.textContent='Preparing a concise explanation from the simulated state.';
  try{
    const response=await fetch('/api/atom-ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:text,state:draft()})});
    const data=await response.json();
    answerLabel.textContent=data.mode==='ai'?'AI explanation':'Quick explanation';
    answerText.textContent=data.answer||quickExplanation(draft());
  }catch{
    answerLabel.textContent='Quick explanation';answerText.textContent=quickExplanation(draft());
  }finally{explainButton.disabled=false;explainButton.textContent='Explain my search settings'}
});
sync();

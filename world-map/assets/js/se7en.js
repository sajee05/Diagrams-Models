/* SE7EN subject library, authentic imagery and source-linked study notes. */
window.SE7EN = (function () {
 'use strict';
 const $=id=>document.getElementById(id), data=window.SE7EN_CONTENT;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let theme=null;
 const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const noteInline=s=>escape(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
 function init(){
  if(!data)return;const subject=$('se7enSubject'),select=$('se7enTheme');
  subject.innerHTML='<option value="all">All Subjects</option>'+data.subjects.map(s=>`<option value="${s.id}">${escape(s.name)}</option>`).join('');
  const fill=()=>{select.innerHTML='<option value="all">World Overview</option>'+data.themes.filter(t=>subject.value==='all'||t.subject===subject.value).map(t=>`<option value="${t.id}">${escape(t.title)}</option>`).join('');if(theme&&data.themes.some(t=>t.id===theme.id&&(subject.value==='all'||t.subject===subject.value)))select.value=theme.id;else chooseTheme('all')};subject.addEventListener('change',fill);fill();select.addEventListener('change',()=>chooseTheme(select.value));

  const syncPlay=()=>{const p=window.WORLD_VECTOR_MAP?.getAnimation().playing;const b=$('se7enPlay');b.textContent=p?'Ⅱ Pause':'▶ Play';b.setAttribute('aria-pressed',String(!!p))};
  $('se7enPlay').addEventListener('click',()=>{const map=window.WORLD_VECTOR_MAP;map?.setAnimation(!map.getAnimation().playing);syncPlay()});$('se7enReplay').addEventListener('click',()=>window.WORLD_VECTOR_MAP?.replayAnimation());$('se7enSpeed').addEventListener('change',e=>window.WORLD_VECTOR_MAP?.setAnimationSpeed(e.target.value));syncPlay();
  // A search applies inside the current theme. Changing advanced category filters retains a deliberate theme.
  const original=window.ENTITY_PANEL.renderDetail;window.ENTITY_PANEL.renderDetail=function(e,i,container='entityDetail'){original(e,i,container);if(e)enhanceDetail(e,container)};
  document.querySelectorAll('.chk-count').forEach(el=>{const label=el.closest('label'),input=label?.querySelector('[data-category],[data-type]');if(input){const cat=input.dataset.category||input.dataset.type;el.textContent=window.DATA_INTEGRITY.getByCategory(cat).length}});
  window.WORLD_SEARCH.applyFilters();
 }
 function chooseTheme(id){theme=id==='all'?null:data.resolveTheme(id);const map=window.WORLD_VECTOR_MAP;const access=$('ramsarNotesAccess');if(access)access.hidden=theme?.id!==1;
  if(!theme){map?.setEntityScope(null);map?.resetView();$('se7enMapSubject').textContent='Interactive Atlas';$('se7enMapTitle').textContent='The World, In Perspective.';$('se7enMapSubtitle').textContent='Explore Places And Their Connections.';$('themeDescription').textContent='82 map themes across 11 subjects. Choose a map to explore its places and relationships.'}
  else{const subj=data.subjects.find(s=>s.id===theme.subject);const entities=theme.entities.map(id=>window.DATA_INTEGRITY.getEntity(id)).filter(Boolean);const ids=entities.flatMap(e=>[e.id,normal(e.name),normal(e.pureName)]);map?.setEntityScope(ids);$('se7enMapSubject').textContent=subj.name;$('se7enMapTitle').textContent=theme.title;$('se7enMapSubtitle').textContent=entities.length+' Mapped Profiles · '+(theme.view==='india'?'India':'World / Regional');$('themeDescription').textContent=theme.fields.join(' · ');if(theme.view==='india')map?.focusIndia();else map?.resetView()}
  if(window.WORLD_NAV?.getMode()!=='browse')window.WORLD_NAV.setMode('browse');window.WORLD_SEARCH?.applyFilters();
 }
 function filterEntities(entities){return !theme?entities:entities.filter(e=>theme.entities.includes(e.id))}
 function applyThemeList(){if(!theme)return;const input=$('searchInput');const query=input?.value||'';const all=window.DATA_INTEGRITY.search(query,'','all',$('searchModeSelect')?.value||'all');window.ENTITY_PANEL.renderList(filterEntities(all))}
 function sourceHtml(links){return (links||[]).map(s=>`<a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.title)} ↗</a>`).join('')}
 function enhanceDetail(e,container){const el=$(container);if(!el)return;const view=el.querySelector('.apple-detail-view');if(!view)return;
  view.querySelectorAll('.box-header span').forEach(h=>{if(/High.Yield|UPSC|Prelims/i.test(h.textContent))h.textContent='Distinctions And Connections';if(h.textContent==='Key Geographical Facts')h.textContent='Essential Facts'});
  const aliases={'Hampi':'Group of Monuments at Hampi','Mahabalipuram':'Group of Monuments at Mahabalipuram','Dholavira':'Dholavira: a Harappan City','Harappan City Of Dholavira':'Dholavira: a Harappan City','Great Himalayan National Park':'Great Himalayan National Park Conservation Area','Kaziranga':'Kaziranga National Park','Manas':'Manas Wildlife Sanctuary','Sundarbans':'Sundarbans National Park','Keoladeo Ghana':'Keoladeo National Park'};
  const photo=(window.ATLAS_PLACE_PHOTOS||[]).find(p=>normal(p.name)===normal(aliases[e.name]||e.name));
  if(photo&&!e.images?.length)e={...e,images:[photo]};
  let picture='';if(e.images?.length){const im=e.images[0];picture=`<figure class="species-photo"><img src="${escape(im.src)}" alt="${escape(im.alt||e.name)}" loading="lazy"><figcaption>${escape(im.credit)} · <a href="${escape(im.source)}" target="_blank" rel="noopener">Original reference ↗</a></figcaption></figure>`}
  const title=view.querySelector('.detail-title');if(picture&&title)title.insertAdjacentHTML('beforebegin',picture);
  if(e.scientificName&&title)title.insertAdjacentHTML('afterend',`<p class="se7en-media-note"><i>${escape(e.scientificName)}</i></p>`);
  if(e.conservation&&title)title.insertAdjacentHTML('afterend',`<div class="conservation-label"><b>IUCN: ${escape(e.conservation.category)}</b> · ${escape(e.conservation.scope)}<br><a href="${escape(e.conservation.source)}" target="_blank" rel="noopener">Assessment reference ↗</a></div>`);
  if(e.studySections?.length){view.querySelectorAll('.detail-box').forEach(n=>n.remove());const actions=view.querySelector('.detail-action-bar');const notes=e.studySections.map(s=>`<section class="study-section"><h2>${escape(s.heading)}</h2><ul>${s.facts.map(f=>`<li>${noteInline(typeof f==='string'?f:f.text)}</li>`).join('')}</ul></section>`).join('');actions?.insertAdjacentHTML('beforebegin',notes)}
  if(e.speciesNotes?.length){
    const categories={CR:'Critically Endangered',EN:'Endangered',VU:'Vulnerable',NT:'Near Threatened',LC:'Least Concern',DD:'Data Deficient'};
    const profiles=e.speciesNotes.map(sp=>`<details class="species-study"><summary>${escape(sp.name)} <span>${escape(sp.category)}</span></summary><p><i>${escape(sp.scientificName)}</i></p><p><b>IUCN: ${escape(categories[sp.category]||sp.category)}</b> · ${escape(sp.scope)} · Checked ${escape(e.notesUpdated)}</p><p>${escape(sp.notes)}</p><a href="${escape(sp.source)}" target="_blank" rel="noopener">IUCN Assessment ↗</a></details>`).join('');
    view.querySelector('.detail-action-bar')?.insertAdjacentHTML('beforebegin',`<section class="site-species-profiles"><h2>Species Profiles</h2>${profiles}</section>`);
  }
  if(e.mapGeometry){const actions=view.querySelector('.detail-action-bar');actions?.insertAdjacentHTML('beforebegin',`<p class="se7en-media-note">Mapped as: ${escape(e.mapGeometry)}.</p>`)}
  if(e.referenceLinks?.length)view.insertAdjacentHTML('beforeend',`<footer class="study-sources"><div class="se7en-source-links">${sourceHtml(e.referenceLinks)}</div>${e.sourceChecked?'<p>Reference checked '+escape(e.sourceChecked)+'. Changing statuses retain their stated scope and date.</p>':''}</footer>`);
  const actions=view.querySelector('.detail-action-bar');if(actions){const b=document.createElement('button');b.className='action-btn';b.dataset.noteDownload='true';b.textContent='Download Notes';b.onclick=()=>downloadNotes(e);actions.append(b)}
  el.querySelectorAll('img').forEach(im=>im.addEventListener('error',()=>{im.hidden=true;im.parentElement.insertAdjacentHTML('afterbegin','<p class="se7en-media-note">The identification image could not load. Open its original reference below.</p>')},{once:true}));
  if(container==='entityDetail'&&$('bottomSheetContent')){const mobile=$('bottomSheetContent');mobile.innerHTML=el.innerHTML;mobile.querySelector('[data-note-download]')?.addEventListener('click',()=>downloadNotes(e))}
 }
 function downloadNotes(e){
  let text;
  if(e.notesMarkdown){
    text=e.notesMarkdown+'\nStatus Key: CR—Critically Endangered; EN—Endangered; VU—Vulnerable; NT—Near Threatened; LC—Least Concern; DD—Data Deficient. Categories are global species assessments.\n';
    if(e.speciesNotes?.length)text+='\n## Species Profiles\n\n'+e.speciesNotes.map(sp=>'### '+sp.name+' — *'+sp.scientificName+'*\n\n**IUCN: ['+sp.category+']('+sp.source+')** · '+sp.scope+'\n\n'+sp.notes).join('\n\n');
  }else{
    const sections=e.studySections||[{heading:'Essential Facts',facts:e.keyFacts||[]}];
    text='# '+e.name+'\n\n'+(e.scientificName?'*'+e.scientificName+'*\n\n':'')+(e.conservation?'IUCN: '+e.conservation.category+' ('+e.conservation.scope+')\n\n':'');
    text+=sections.map(s=>'## '+s.heading+'\n\n'+s.facts.map(f=>'- '+(typeof f==='string'?f:f.text)).join('\n')).join('\n\n');if(!e.studySections)text+='\n\n'+(e.upscNotes||'');
  }
  const blob=new Blob([text],{type:'text/markdown'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='Atlas_'+e.name.replace(/[^a-z0-9]/gi,'_')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }
 function verifiedQuestions(e){
  const facts=new Map((e.studyFacts||[]).map(f=>[f.id,f]));
  const visible=new Set((e.studySections||[]).flatMap(s=>s.facts||[]).map(f=>typeof f==='string'?f:f.text));
  return (e.quizItems||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length===4&&new Set(q.options).size===4&&Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<4&&q.explanation&&Array.isArray(q.evidence)&&q.evidence.length>0&&q.evidence.every(id=>{const f=facts.get(id);return f&&/^https?:\/\//.test(f.source||'')&&visible.has(f.text)}));
 }
 function getVerifiedQuestion(e){const qs=verifiedQuestions(e);if(!qs.length)return null;const q=qs[Math.floor(Math.random()*qs.length)];const fs=e.studyFacts.filter(f=>q.evidence.includes(f.id));return {...q,target:e,options:[...q.options],format:q.format||'Statement Analysis',sources:[...new Set(fs.map(f=>f.source))]}}

 return {init,chooseTheme,filterEntities,getVerifiedQuestion,hasVerifiedQuestions:e=>verifiedQuestions(e).length>0,getTheme:()=>theme,enhanceDetail};
})();

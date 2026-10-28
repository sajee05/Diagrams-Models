const fs=require('fs'),vm=require('vm'),assert=require('assert');
const c={console};c.window=c;vm.createContext(c);
for(const f of ['world-map-content','geographic-features','boundaries-data','ocean-currents','local-winds','se7en-content','ramsar-notes'])vm.runInContext(fs.readFileSync('world-map/data/'+f+'.js','utf8'),c);
vm.runInContext(fs.readFileSync('world-map/assets/js/data-integrity.js','utf8'),c);c.DATA_INTEGRITY.init();
const d=c.ATLAS_RAMSAR_NOTES,theme=c.SE7EN_CONTENT.resolveTheme(1),seen=new Set();
assert.equal(Object.keys(d.sites).length,103);assert.equal(Object.keys(d.species).length,97);
for(const id of theme.entities){const e=c.DATA_INTEGRITY.getEntity(id);assert(e.ramsarSiteNumber,id+' missing notes');assert(!seen.has(e.ramsarSiteNumber));seen.add(e.ramsarSiteNumber);const record=d.sites[e.ramsarSiteNumber];assert.equal(e.state,record.state);assert(e.studySections.length>=6);assert.equal(e.notesMarkdown,record.markdown);for(const section of e.studySections)assert(section.facts.length>0);for(const sp of e.speciesNotes){assert(sp.scientificName&&sp.category&&sp.notes);assert(/^https:\/\/www.iucnredlist.org\/species\//.test(sp.source))}}
assert.equal(seen.size,103);assert(c.DATA_INTEGRITY.search('phumdis','','all').some(e=>e.ramsarSiteNumber==='463'));
assert(c.DATA_INTEGRITY.search('Marmaronetta','','all').some(e=>e.ramsarSiteNumber==='2078'));
assert.equal(c.DATA_INTEGRITY.getEntity('ramsar-tsomoriri').state,'Ladakh');
assert(fs.existsSync(d.document));assert.equal(fs.readFileSync(d.document,'utf8').match(/^#### \[.+\]\(https:\/\/rsis.ramsar.org\/ris\/\d+\)/gm).length,103);
console.log('Passed: all 103 map profiles, 97 source-linked species, modern states, expanded search and complete Markdown download.');

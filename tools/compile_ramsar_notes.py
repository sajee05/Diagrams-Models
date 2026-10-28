from pathlib import Path
import json,re
r=Path(__file__).resolve().parents[1];md=(r/'world-map/notes/India_103_Ramsar_Sites_Notes.md').read_text()
# Preserve the finished document as the single content source for both web notes and downloads.
sites={}
blocks=list(re.finditer(r'^#### \[([^\n]+)\]\(https://rsis.ramsar.org/ris/(\d+)\)\n\n([\s\S]*?)(?=^### |^#### |^## |\Z)',md,re.M))
state=''
for m in blocks:
 heading,id,body=m.groups();prefix=md[:m.start()];state=re.findall(r'^### (.+)$',prefix,re.M)[-1]
 metadata=body.splitlines()[0];facts=re.findall(r'^- (.+)$',body,re.M)
 assert len(facts)>=5
 sections=[{'heading':'Location And Designation','facts':[metadata]}]
 for fact in facts:
  match=re.match(r'\*\*([^*]+):\*\*\s*(.*)',fact)
  sections.append({'heading':match[1] if match else 'Essential Facts','facts':[match[2] if match else fact]})
 sites[id]={'name':heading,'state':state,'sections':sections,'markdown':'# '+heading+'\n\n'+body.strip()+'\n','species':[]}
species={}
for name,sci,code,url,trait in re.findall(r'^#### (.+) — \*([^\n]+)\*\n\n\*\*IUCN: \[([A-Z]{2})\]\(([^)]+)\)\*\* · Global species assessment\n\n([^\n]+)',md,re.M):
 key=name.casefold();species[key]={'name':name,'scientificName':sci,'category':code,'source':url,'scope':'Global Species','notes':trait}
aliases={'spotted pond turtle/black pond turtle':'spotted pond turtle','sangai':'eld’s deer/sangai'}
for site in sites.values():
 names=re.findall(r'\*\*([^*]+?) \[[A-Z]{2}\]\*\*',site['markdown'])
 if 'Sangai' in site['markdown']:names.append('Sangai')
 for name in names:
  key=aliases.get(name.casefold(),name.casefold());assert key in species,(site['name'],key)
  if key not in site['species']:site['species'].append(key)
assert len(sites)==103 and len(species)==97
payload={'checked':'2026-10-29','document':'world-map/notes/India_103_Ramsar_Sites_Notes.md','sites':sites,'species':species}
js='/* Ramsar notes compiled from the completed 103-site Markdown document. */\nwindow.ATLAS_RAMSAR_NOTES = '+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n'
js+='''(function(){
 const d=window.ATLAS_RAMSAR_NOTES,groups=[window.WORLD_MAP_DATA.entities,...['rivers','mountains','peaks','passes','glaciers','protectedAreas'].map(k=>window.GEOGRAPHIC_FEATURES[k]||[])];
 const plain=s=>s.replace(/\\*\\*/g,'');
 for(const e of groups.flat()){
  const id=e.officialFields?.['Ramsar Site Number'];const site=d.sites[id];if(!site)continue;
  e.ramsarSiteNumber=id;e.state=site.state;e.locationContext=site.state;e.subtitle=site.state;
  e.studySections=site.sections;e.speciesNotes=site.species.map(key=>d.species[key]);e.notesMarkdown=site.markdown;
  e.studyFacts=site.sections.flatMap((section,i)=>section.facts.map((text,j)=>({id:`rsis-${id}-fact-${i}-${j}`,text,source:`https://rsis.ramsar.org/ris/${id}`})));
  e.description=plain(site.sections[1].facts.join(' '));e.keyFacts=site.sections.slice(1).flatMap(s=>s.facts.map(plain));e.upscNotes='';
  e.officialFields['Administrative Region']=site.state;e.notesUpdated=d.checked;
  e.referenceLinks=[{title:'Official Ramsar Site Record',url:`https://rsis.ramsar.org/ris/${id}`}];
 }
})();\n'''
(r/'world-map/data/ramsar-notes.js').write_text(js)
print('Compiled',len(sites),'site profiles and',len(species),'species profiles')

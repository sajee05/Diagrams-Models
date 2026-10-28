/** Validate the datasets actually loaded by the HTML entrypoint. Run with Node.js. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../..');
const sandbox={console,document:{addEventListener(){},getElementById(){return null}},localStorage:{getItem(){return null},setItem(){}}};sandbox.window=sandbox;vm.createContext(sandbox);
const html=fs.readFileSync(path.join(root,'world-map.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
for(const file of scripts){const code=fs.readFileSync(path.join(root,file),'utf8');new vm.Script(code,{filename:file});if(file.startsWith('world-map/data/')||file.endsWith('/data-integrity.js'))vm.runInContext(code,sandbox,{filename:file})}
sandbox.DATA_INTEGRITY.init();const entities=sandbox.DATA_INTEGRITY.getAll();assert(entities.length>0);
const ids=new Set();for(const e of entities){assert(typeof e.id==='string'&&e.id);assert(!ids.has(e.id),'Duplicate ID: '+e.id);ids.add(e.id);assert(e.name&&e.category,'Missing identity: '+e.id);if(e.coords){assert(e.coords.length===2);const[lon,lat]=e.coords;assert(Number.isFinite(lon)&&Math.abs(lon)<=180,e.id+' longitude');assert(Number.isFinite(lat)&&Math.abs(lat)<=90,e.id+' latitude')}}
assert.equal(sandbox.SE7EN_CONTENT.themes.length,82);for(const t of sandbox.SE7EN_CONTENT.themes){const resolved=sandbox.SE7EN_CONTENT.resolveTheme(t.id);for(const id of resolved.entities)assert(ids.has(id),'Dangling theme entity: '+id)}
assert.equal(sandbox.DATA_INTEGRITY.getEntity('sa-brazil').name,'Brazil');assert(sandbox.DATA_INTEGRITY.search('equator','','all').length>0);
for(const c of sandbox.OCEAN_CURRENTS){for(const segment of c.segments){assert(segment.length>=2);for(const[lat,lon]of segment)assert(Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lon)&&Math.abs(lon)<=180)}}
console.log(`Passed: ${scripts.length} script syntax checks, ${entities.length} indexed entities, 82 theme references and ${sandbox.OCEAN_CURRENTS.length} current paths.`);

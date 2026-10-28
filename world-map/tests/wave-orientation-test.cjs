const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('world-map/assets/js/vector-map.js','utf8');
const fn=source.match(/function waveOrientation\(angle\) \{[\s\S]*?\n  \}/)[0];
const context={Math};vm.createContext(context);vm.runInContext(fn,context);
for(let degree=-180;degree<=180;degree++){
 const a=degree*Math.PI/180,{rotation,mirror}=context.waveOrientation(a);
 // Local forward must agree with downstream movement in all 361 headings.
 assert(Math.abs(mirror*Math.cos(rotation)-Math.cos(a))<1e-10);
 assert(Math.abs(mirror*Math.sin(rotation)-Math.sin(a))<1e-10);
 // The surface normal must not turn upside down on westward routes.
 assert(Math.cos(rotation)>=-1e-10);
}
console.log('Passed: forward direction and upright wave orientation at all 361 headings.');

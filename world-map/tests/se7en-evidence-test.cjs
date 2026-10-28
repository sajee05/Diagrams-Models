const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{},Image:class{},document:{getElementById:()=>null},Blob,URL,setTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync('world-map/assets/js/se7en.js','utf8'),context);
const valid={studyFacts:[{id:'f1',text:'Verified fact.',source:'https://example.org/primary'}],studySections:[{heading:'Facts',facts:['Verified fact.']}],quizItems:[{prompt:'Which statement is correct?',options:['A','B','C','D'],correctIndex:0,explanation:'A follows from the verified fact.',evidence:['f1']}]};
const api=context.window.SE7EN;
assert(api.hasVerifiedQuestions(valid));assert.equal(api.getVerifiedQuestion(valid).sources[0],'https://example.org/primary');
for(const change of [e=>e.studyFacts=[],e=>e.studySections=[],e=>e.studyFacts[0].source='',e=>e.quizItems[0].evidence=[],e=>e.quizItems[0].evidence=['missing'],e=>e.quizItems[0].correctIndex=4,e=>e.quizItems[0].options=['A','A','C','D'],e=>e.quizItems[0].explanation='']){const e=JSON.parse(JSON.stringify(valid));change(e);assert(!api.hasVerifiedQuestions(e));assert.equal(api.getVerifiedQuestion(e),null)}
console.log('Passed: note visibility, evidence, source, unique options, answer bounds and explanation checks.');

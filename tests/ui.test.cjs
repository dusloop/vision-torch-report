const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
function create({width=1280,height=850,reduced=false,hash=''}={}){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://dusloop.github.io/vision-torch-report/'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;Object.defineProperty(w,'innerWidth',{value:width,configurable:true});Object.defineProperty(w,'innerHeight',{value:height,configurable:true});
 const frames=new Map();let next=1;w.requestAnimationFrame=f=>{frames.set(next,f);return next++};w.cancelAnimationFrame=i=>frames.delete(i);
 w.matchMedia=()=>({matches:reduced,addEventListener(){}});const d=w.document,map=d.querySelector('#map');map.setPointerCapture=()=>{};map.hasPointerCapture=()=>false;
 for(const file of ['content.js','physics.js','report.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 const $=s=>d.querySelector(s);const click=s=>$(s).click();const input=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
 let time=0;const step=(count=1)=>{for(let i=0;i<count;i++){time+=16.67;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(time));}};
 const point=(type,x,y,target=map)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});target.dispatchEvent(e);};
 return {dom,w,d,$,click,input,errors,step,point};
}
const app=create(),{$,click,input,w,step,point}=app;
assert.equal($('#reader').hidden,true);assert.equal($('#mapScreen').hidden,false);
for(const id of ['overview','vision','control','demo','activity','validation']){
 click(`.topic[data-topic="${id}"]`);assert.equal($('#reader').hidden,false,`${id} opens`);assert.equal($('#mapScreen').hidden,true);assert.equal(w.location.hash,'#'+id);assert($('#detailBody figure'),'each topic has a visual');
 click('#closeReader');assert.equal($('#reader').hidden,true);assert.equal($('#mapScreen').hidden,false);assert.equal(w.location.hash,'#map');assert.equal(app.d.activeElement.dataset.topic,id,'focus restored');
}
click('.topic[data-topic="overview"]');click('#next');assert.equal(w.location.hash,'#vision');click('#previous');assert.equal(w.location.hash,'#overview');
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert($('#reader').hidden,'Escape closes');
click('.topic[data-topic="vision"]');const before=$('#emaLine').getAttribute('d');input('#alpha','1');assert.notEqual($('#emaLine').getAttribute('d'),before);assert.equal($('#emaLine').getAttribute('d'),$('#rawLine').getAttribute('d'),'alpha 1 equals raw signal');click('#closeReader');
click('.topic[data-topic="control"]');input('#trajectory','100');assert.equal($('#progressA').textContent,'100%');assert.equal($('#progressB').textContent,'100%');input('#trajectory','0');assert.equal($('#progressA').textContent,'0%');click('#closeReader');
click('.topic[data-topic="demo"]');input('#property0','.75');click('#grasp');const snapshot=$('#snapshotPolygon').getAttribute('points'),status=$('#demoState').textContent;input('#property0','-.5');assert.equal($('#snapshotPolygon').getAttribute('points'),snapshot);assert.equal($('#demoState').textContent,status);assert.notEqual($('#livePolygon').getAttribute('points'),snapshot);assert($('#demoScene').classList.contains('closed'));click('#release');assert(!$('#grasp').disabled);assert(!$('#snapshotPolygon').hasAttribute('points'));click('#closeReader');
click('.topic[data-topic="activity"]');click('[data-date="4"]');assert($('#journalEntries').textContent.includes('고정 각도'));assert.equal($('#journalEntries').querySelectorAll('.journal-entry').length,3);click('#closeReader');
click('#openContents');assert(!$('#contents').hidden);click('#readAll');assert.equal($('#readerTitle').textContent,'전체 보고서');assert.equal($('#detailBody').querySelectorAll('.full-section').length,6);click('#closeReader');
// Real DOM event routing: a tap opens; dragging does not accidentally open.
const node=$('.topic[data-topic="overview"]');point('pointerdown',200,200,node);point('pointerup',200,200,node);node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert(!$('#reader').hidden);click('#closeReader');
point('pointerdown',200,200,node);point('pointermove',230,240,node);step(2);point('pointerup',230,240,node);node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert($('#reader').hidden,'drag must not navigate');
// Wheel impulse changes the transform; reset restores the original layout.
click('#resetMap');const initial=node.style.transform;$('#map').dispatchEvent(new w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));step(5);assert.notEqual(node.style.transform,initial);click('#resetMap');assert.equal(node.style.transform,initial);
click('#toggleMotion');$('#map').dispatchEvent(new w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));step(5);assert.equal(node.style.transform,initial,'motion off stays still');
assert.equal(app.errors.length,0,app.errors.map(String).join('\n'));app.dom.window.close();
for(const size of [[390,844],[320,568],[768,1024],[844,390]]){
 const a=create({width:size[0],height:size[1],reduced:true});a.click('.topic[data-topic="demo"]');assert(!a.$('#reader').hidden,`tap works at ${size}`);a.click('#closeReader');assert(a.$('#reader').hidden);assert(a.$('#toggleMotion').disabled);assert.equal(a.errors.length,0);a.dom.window.close();
}
const deep=create({hash:'#vision'});assert(!deep.$('#reader').hidden,'deep link opens');deep.click('#closeReader');assert(!deep.$('#mapScreen').hidden);assert.equal(deep.errors.length,0);deep.dom.window.close();
console.log('PASS DOM: all topics, X/Esc/focus, navigation, direct link, charts, snapshot, timeline, full report, tap vs drag, wheel, reset, reduced motion');

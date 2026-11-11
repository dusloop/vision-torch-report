const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
function create({width=1280,height=850,reduced=false,hash=''}={}){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://dusloop.github.io/vision-torch-report/'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;Object.defineProperty(w,'innerWidth',{value:width,configurable:true});Object.defineProperty(w,'innerHeight',{value:height,configurable:true});
 const frames=new Map();let next=1;w.requestAnimationFrame=f=>{frames.set(next,f);return next++};w.cancelAnimationFrame=i=>frames.delete(i);
 w.matchMedia=()=>({matches:reduced,addEventListener(){}});const d=w.document,map=d.querySelector('#map');
 const canvas={left:20,top:80,width:width-40,height:height-160};
 map.getBoundingClientRect=()=>({...canvas,right:canvas.left+canvas.width,bottom:canvas.top+canvas.height});
 w.HTMLElement.prototype.setPointerCapture=function(id){this.captured=id;};
 w.HTMLElement.prototype.hasPointerCapture=function(id){return this.captured===id;};
 w.HTMLElement.prototype.releasePointerCapture=function(){this.captured=null;};
 for(const file of ['content.js','physics.js','layout.js','report.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 const $=s=>d.querySelector(s);const click=s=>$(s).click();const input=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
 let time=0;const step=(count=1)=>{for(let i=0;i<count;i++){time+=16.67;const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(time));}};
 const point=(type,x,y,target=map)=>{const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointermove'||type==='pointerdown'?1:0});Object.defineProperty(e,'pointerId',{value:1});Object.defineProperty(e,'pointerType',{value:'mouse'});target.dispatchEvent(e);return e;};
 return {dom,w,d,$,click,input,errors,step,point,canvas};
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
// Desktop capture, actual cursor following, and native-link drag prevention.
const node=$('.topic[data-topic="overview"]');
const xy=el=>el.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px/).slice(1).map(Number);
assert.equal(node.draggable,false);
const nativeDrag=new w.Event('dragstart',{bubbles:true,cancelable:true});node.dispatchEvent(nativeDrag);assert(nativeDrag.defaultPrevented,'no browser ghost-link drag');
point('pointerdown',200,200,node);assert(node.hasPointerCapture(1),'capture the original link immediately');point('pointerup',200,200,w);node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert(!$('#reader').hidden);click('#closeReader');
const start=xy(node);point('pointerdown',200,200,node);point('pointermove',230,240,w);const moved=xy(node);assert(Math.abs(moved[0]-start[0]-30)<.02&&Math.abs(moved[1]-start[1]-40)<.02,'node follows mouse one-to-one outside its element');
point('pointerup',230,240,w);assert(!node.hasPointerCapture(1));node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert($('#reader').hidden,'drag must not navigate');
// A separate, immediately following deliberate click must not be swallowed.
point('pointerdown',230,240,node);point('pointerup',230,240,w);node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert(!$('#reader').hidden);click('#closeReader');
click('#resetMap');const initial=node.style.transform;$('#map').dispatchEvent(new w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));step(5);assert.notEqual(node.style.transform,initial);click('#resetMap');assert.equal(node.style.transform,initial);
// Background is a pan, not a spring kick; all nodes and lines translate equally.
const core=$('.core'),panStart=xy(core),otherStart=xy(node),line=$('#connections line'),lineX=+line.getAttribute('x1');
point('pointerdown',500,400);point('pointermove',620,470,w);assert.deepEqual(xy(core),[panStart[0]+120,panStart[1]+70]);assert(Math.abs(xy(node)[0]-otherStart[0]-120)<.02);assert.equal(+line.getAttribute('x1'),lineX+120);point('pointerup',620,470,w);assert.deepEqual(xy(core),[panStart[0]+120,panStart[1]+70]);click('#resetMap');assert.deepEqual(xy(core),panStart);
// Manual drag works even with animations disabled.
click('#toggleMotion');$('#map').dispatchEvent(new w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));step(5);assert.equal(node.style.transform,initial,'motion off stays still');
const still=xy(node);point('pointerdown',200,200,node);point('pointermove',225,215,w);point('pointerup',225,215,w);assert(Math.abs(xy(node)[0]-still[0]-25)<.02,'motion off still permits direct drag');step(20);assert(Math.abs(xy(node)[0]-still[0]-25)<.02,'no unwanted spring animation');click('#resetMap');
// Missing mouse-up / tab focus loss must release capture and the grabbing cursor.
point('pointerdown',200,200,node);point('pointermove',230,240,w);w.dispatchEvent(new w.Event('blur'));assert(!$('#map').classList.contains('dragging'));assert(!node.hasPointerCapture(1));
// Mouse fallback for an older desktop browser without PointerEvent.
const fallbackStart=xy(node);node.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true,clientX:200,clientY:200,button:0,buttons:1}));
w.dispatchEvent(new w.MouseEvent('mousemove',{bubbles:true,cancelable:true,clientX:240,clientY:210,buttons:1}));w.dispatchEvent(new w.MouseEvent('mouseup',{bubbles:true,clientX:240,clientY:210,buttons:0}));assert(Math.abs(xy(node)[0]-fallbackStart[0]-40)<.02);
// Resizing during a drag cleans capture and refits to the new drawable area.
point('pointerdown',200,200,node);point('pointermove',215,210,w);
app.canvas.width=600;app.canvas.height=260;w.dispatchEvent(new w.Event('resize'));step(1);
assert(!node.hasPointerCapture(1));assert(!$('#map').classList.contains('dragging'));
for(const el of app.d.querySelectorAll('.map-node:not([hidden])')){const [x,y]=xy(el),diameter=parseFloat(el.style.width);assert(x>=0&&y>=0&&x+diameter<=600.02&&y+diameter<=260.02,'resize fits nodes to new stage');}
assert.equal(app.errors.length,0,app.errors.map(String).join('\n'));app.dom.window.close();
for(const size of [[320,360],[390,844],[320,568],[768,1024],[844,390],[1024,768],[1366,768],[1920,1080],[2560,1440],[3440,1440],[3840,2160]]){
 const a=create({width:size[0],height:size[1],reduced:true});a.click('.topic[data-topic="demo"]');assert(!a.$('#reader').hidden,`tap works at ${size}`);a.click('#closeReader');assert(a.$('#reader').hidden);assert(a.$('#toggleMotion').disabled);
 const n=a.$('.topic[data-topic="overview"]'),before=xy(n);a.point('pointerdown',100,100,n);a.point('pointermove',105,110,a.w);a.point('pointerup',105,110,a.w);assert(Math.abs(xy(n)[0]-before[0]-5)<.02,'reduced motion preserves mouse interaction');
 a.click('#resetMap');assert.deepEqual(xy(n),before);assert.equal(a.errors.length,0);a.dom.window.close();
}
const deep=create({hash:'#vision'});assert(!deep.$('#reader').hidden,'deep link opens');deep.click('#closeReader');assert(!deep.$('#mapScreen').hidden);assert.equal(deep.errors.length,0);deep.dom.window.close();
console.log('PASS DOM: all topics, X/Esc/focus, navigation, direct link, charts, snapshot, timeline, full report, desktop capture/native-drag suppression, pan, mouse fallback, drag with motion off, 11 viewport inputs');

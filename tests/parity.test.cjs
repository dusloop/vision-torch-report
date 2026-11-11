const assert=require('node:assert/strict');
const {create}=require('./ui.test.cjs');
const xy=el=>el.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px/).slice(1).map(Number);
const neighbors=[];
for(const pointer of ['mouse','touch','pen']){
 const a=create(),{$,w,click,point,step,input}=a;
 const node=$('.topic[data-topic="overview"]'),core=$('.core'),other=$('.topic[data-topic="control"]');
 const c0=xy(core),o0=xy(other);
 point('pointerdown',300,300,node,pointer);point('pointermove',400,375,w,pointer);step(60);
 const c1=xy(core),o1=xy(other);
 assert(Math.hypot(c1[0]-c0[0],c1[1]-c0[1])>10,`${pointer}: connected node follows`);
 assert(Math.hypot(o1[0]-o0[0],o1[1]-o0[1])>5,`${pointer}: second-hop node follows`);
 neighbors.push([c1,o1]);point('pointerup',400,375,w,pointer);step(800);
 assert(Math.hypot(xy(core)[0]-c0[0],xy(core)[1]-c0[1])<.1,`${pointer}: settles`);
 // Diagram drag, inertia, zoom and reset work with the same gesture path.
 click('.topic[data-topic="vision"]');
 const vp=$('.diagram-viewport'),scene=$('.diagram-scene');
 point('pointerdown',100,100,vp,pointer);point('pointermove',160,140,w,pointer);assert.deepEqual(xy(scene),[60,40]);point('pointerup',160,140,w,pointer);step(50);
 assert(xy(scene)[0]>60&&xy(scene)[0]<=240,'bounded inertia after releasing diagram');
 click('[data-view="in"]');step(20);assert(scene.style.transform.includes('scale(1.250)'));
 click('[data-view="reset"]');step(20);assert.deepEqual(xy(scene),[0,0]);assert(scene.style.transform.includes('scale(1.000)'));
 input('#alpha','1');step(20);assert.equal($('#emaLine').getAttribute('d'),$('#rawLine').getAttribute('d'));
 click('#closeReader');
 // Drag the actual point on the graph to change the servo time.
 click('.topic[data-topic="control"]');
 const handle=$('#curveHandle'),svg=handle.ownerSVGElement;
 svg.getBoundingClientRect=()=>({left:100,top:100,width:600,height:235});
 point('pointerdown',145,290,handle,pointer);point('pointermove',675,130,w,pointer);point('pointerup',675,130,w,pointer);
 assert.equal($('#trajectory').value,'100');assert.equal($('#progressA').textContent,'100%');
 input('#trajectory','0');step(20);
 const gripper=$('#trajectoryGripper');gripper.getBoundingClientRect=()=>({left:0,top:0,width:320,height:170});
 point('pointerdown',80,80,gripper,pointer);point('pointermove',240,80,w,pointer);point('pointerup',240,80,w,pointer);assert.equal($('#trajectory').value,'100','gripper direct manipulation');
 // Coordinates still map correctly when a diagram is scaled.
 svg.getBoundingClientRect=()=>({left:100,top:100,width:750,height:293.75});
 point('pointerdown',818.75,137.5,handle,pointer);point('pointermove',487.5,237.5,w,pointer);point('pointerup',487.5,237.5,w,pointer);assert.equal($('#trajectory').value,'50');
 handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal($('#trajectory').value,'0');click('#closeReader');
 // Drag a radar handle, snapshot it, and keep the snapshot during later dragging.
 click('.topic[data-topic="demo"]');const radar=$('.radar'),knob=$('[data-radar="0"]');
 radar.getBoundingClientRect=()=>({left:50,top:50,width:300,height:260});
 point('pointerdown',200,141,knob,pointer);point('pointermove',200,92,w,pointer);point('pointerup',200,92,w,pointer);assert.equal(+$('#property0').value,1);
 click('#grasp');const snapshot=$('#snapshotPolygon').getAttribute('points');
 point('pointerdown',200,92,knob,pointer);point('pointermove',200,190,w,pointer);point('pointerup',200,190,w,pointer);assert.equal(+$('#property0').value,-1);assert.equal($('#snapshotPolygon').getAttribute('points'),snapshot);
 knob.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(+$('#property0').value,1);
 click('#release');assert(!$('#snapshotPolygon').hasAttribute('points'));
 // Closing an article mid-drag / mid-animation disposes all interaction work.
 point('pointerdown',150,140,knob,pointer);point('pointermove',180,100,w,pointer);click('#closeReader');point('pointerup',180,100,w,pointer);step(100);
 assert.equal(a.errors.length,0,a.errors.map(String).join('\n'));a.dom.window.close();
}
assert.deepEqual(neighbors[0],neighbors[1],'mouse and touch use the same physics');assert.deepEqual(neighbors[1],neighbors[2],'pen uses the same physics');
// Motion is enabled without a switch, regardless of obsolete saved settings.
const reduced=create({reduced:true,storedMotion:'off'});assert.equal(reduced.d.documentElement.dataset.motion,'on');
for(const id of ['toggleMotion','readerMotion','resetMap'])assert.equal(reduced.$('#'+id),null);
const core=reduced.$('.core'),before=xy(core);reduced.$('#map').dispatchEvent(new reduced.w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));reduced.step(5);assert.notDeepEqual(xy(core),before,'motion runs with no opt-in');
reduced.click('.topic[data-topic="vision"]');reduced.input('#alpha','1');reduced.step(20);assert.equal(reduced.$('#emaLine').getAttribute('d'),reduced.$('#rawLine').getAttribute('d'));assert.equal(reduced.errors.length,0);reduced.dom.window.close();
console.log('PASS input parity: mouse/touch/pen coupling, diagram pan/inertia/zoom/reset, graph and gripper dragging, radar dragging/snapshot, keyboard, scaled coordinates, cleanup, always-on motion');

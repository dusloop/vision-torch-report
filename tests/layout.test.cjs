const assert=require('node:assert/strict');
const {makeMapLayout}=require('../layout.js');
const ids=['overview','vision','control','demo','activity','validation'];
const stages=[[280,200],[300,180],[300,324],[350,480],[366,590],[560,280],[680,540],[804,240],[976,520],[1310,520],[1864,834],[2480,1200],[3344,1144],[3744,1884]];
for(const [w,h] of stages){
 const layout=makeMapLayout(w,h,ids),seen=new Set();
 assert.equal(layout.nodes.filter(n=>ids.includes(n.id)).length,6,'all categories retained');
 for(const n of layout.nodes){
  assert(!seen.has(n.id));seen.add(n.id);
  assert(n.r>=22,'at least 44px hit target at supported sizes');
  assert(n.x-n.r>=0&&n.y-n.r>=0&&n.x+n.r<=w&&n.y+n.r<=h,`${w}x${h}: ${n.id} inside stage`);
 }
 for(let i=0;i<layout.nodes.length;i++)for(let j=0;j<i;j++){
  const a=layout.nodes[i],b=layout.nodes[j];assert(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r+5,`${w}x${h}: ${a.id}/${b.id} must not overlap`);
 }
 for(const [a,b]of layout.links)assert(seen.has(a)&&seen.has(b));
}
console.log('PASS geometry: 14 map sizes, 44px+ targets, no node overlap or clipping, all categories retained');

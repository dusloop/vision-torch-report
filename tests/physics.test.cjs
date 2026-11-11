const assert=require('node:assert/strict');
const {SpringWorld}=require('../physics.js');
const w=new SpringWorld(800,600);const a=w.add('a',200,300,45),b=w.add('b',500,300,45,2);w.connect(a,b);
w.impulse(0,-300);w.step(1/60);assert(a.y<300&&b.y<300,'downward wheel impulse moves nodes upward');assert(a.y<b.y,'mass changes response');
for(let i=0;i<1500;i++)w.step(1/120);
assert(Math.abs(a.y-300)<.01&&Math.abs(b.y-300)<.01,'damping brings nodes home');
w.impulse(0,300);w.step(1/60);assert(a.y>300,'opposite impulse reverses motion');
for(let i=0;i<500;i++){w.impulse(1e6,-1e6);w.step(.5);for(const n of w.bodies){assert(Number.isFinite(n.x+n.y+n.vx+n.vy));assert(n.x>=n.r&&n.x<=800-n.r&&n.y>=n.r&&n.y<=600-n.r,'bounded under extreme input');}}
w.reset();a.x=380;b.x=390;for(let i=0;i<300;i++)w.step(1/120);assert(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r,'collision response separates nodes');
a.pin={x:310,y:220};w.step(.02);assert.equal(a.x,310);assert.equal(a.y,220);a.pin=null;for(let i=0;i<1500;i++)w.step(1/120);assert(Math.abs(a.x-a.ax)<.01,'released drag returns to anchor');
console.log('PASS physics: opposite impulses, mass, damping, collisions, bounds, drag release');

// Tangential movement must propagate through two links, not just stretch one string.
const network=new SpringWorld(1200,900);
const n1=network.add('left',300,450,40),n2=network.add('center',600,450,60,2.6),n3=network.add('right',900,450,40);
network.connect(n1,n2);network.connect(n2,n3);n1.pin={x:300,y:570};
for(let i=0;i<120;i++)network.step(1/120);
assert(n2.y>480&&n3.y>475,'connected and second-hop nodes visibly follow a sideways pull');
n1.pin=null;for(let i=0;i<1800;i++)network.step(1/120);
assert(network.bodies.every(b=>Math.abs(b.x-b.ax)<.02&&Math.abs(b.y-b.ay)<.02),'whole network settles after release');
console.log('PASS coupling: tangential drag, two-hop force propagation, network restoration');

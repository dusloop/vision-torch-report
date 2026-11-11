/* Small deterministic mass–spring engine. Pixels, seconds, semi-implicit Euler. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 class SpringWorld{
  constructor(width,height){this.width=width;this.height=height;this.bodies=[];this.links=[];}
  add(id,x,y,r,mass=1){const b={id,x,y,ax:x,ay:y,r,mass,vx:0,vy:0,pin:null};this.bodies.push(b);return b;}
  connect(a,b){this.links.push({a,b,restX:b.ax-a.ax,restY:b.ay-a.ay,ai:this.bodies.indexOf(a),bi:this.bodies.indexOf(b)});}
  impulse(dx,dy){for(const b of this.bodies){if(b.pin)continue;b.vx=clamp(b.vx+dx/b.mass,-850,850);b.vy=clamp(b.vy+dy/b.mass,-850,850);}}
  reset(){for(const b of this.bodies){b.x=b.ax;b.y=b.ay;b.vx=b.vy=0;b.pin=null;}}
  step(dt){
   const count=Math.max(1,Math.ceil(Math.min(dt,.05)*120));const h=Math.min(dt,.05)/count;
   for(let n=0;n<count;n++){
    const forces=this.bodies.map(b=>({x:7*(b.ax-b.x)-7.2*b.vx,y:7*(b.ay-b.y)-7.2*b.vy}));
    // Vector springs transmit tangential as well as radial dragging through the graph.
    for(const {a,b,restX,restY,ai,bi} of this.links){
     const fx=36*((b.x-a.x)-restX),fy=36*((b.y-a.y)-restY);
     forces[ai].x+=fx;forces[ai].y+=fy;forces[bi].x-=fx;forces[bi].y-=fy;
    }
    for(let i=0;i<this.bodies.length;i++)for(let j=i+1;j<this.bodies.length;j++){
     const a=this.bodies[i],b=this.bodies[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.01,Math.hypot(dx,dy)),overlap=a.r+b.r+12-d;
     if(overlap>0){const ux=d<1?1:dx/d,uy=d<1?0:dy/d,f=overlap*110;forces[i].x-=f*ux;forces[i].y-=f*uy;forces[j].x+=f*ux;forces[j].y+=f*uy;}
    }
    this.bodies.forEach((b,i)=>{
     if(b.pin){b.x=b.pin.x;b.y=b.pin.y;b.vx=b.vy=0;return;}
     b.vx=clamp(b.vx+forces[i].x/b.mass*h,-850,850);b.vy=clamp(b.vy+forces[i].y/b.mass*h,-850,850);
     b.x+=b.vx*h;b.y+=b.vy*h;
     const px=clamp(b.x,b.r+8,Math.max(b.r+8,this.width-b.r-8)),py=clamp(b.y,b.r+8,Math.max(b.r+8,this.height-b.r-8));
     if(px!==b.x)b.vx*=-.25;if(py!==b.y)b.vy*=-.25;b.x=px;b.y=py;
    });
   }
  }
  energy(){return this.bodies.reduce((v,b)=>v+b.vx*b.vx+b.vy*b.vy,0);}
 }
 root.SpringWorld=SpringWorld;
 if(typeof module!=='undefined')module.exports={SpringWorld};
})(typeof window!=='undefined'?window:globalThis);

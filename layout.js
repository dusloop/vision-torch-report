/* Responsive map geometry in the canvas's CSS pixels, independent of display DPI. */
(function(root){
 'use strict';
 function makeMapLayout(width,height,ids){
  const w=Math.max(1,width),h=Math.max(1,height),cx=w/2,cy=h/2;
  const nodes=[],links=[];
  const add=(id,x,y,r,mass)=>{const b={id,x,y,r,mass};nodes.push(b);return b;};
  const link=(a,b)=>links.push([a.id,b.id]);
  const compact=w<480&&h<280;
  if(compact){
   const r=Math.min(30,w/10,h/5),cr=r*1.12;
   const positions=Array.from({length:7},(_,i)=>({x:i<4?w*(i+.5)/4:w*(i-4+1)/4,y:i<4?h*.28:h*.72}));
   const center=add('core',positions[0].x,positions[0].y,cr,2.6);
   ids.forEach((id,i)=>{const p=positions[i+1];link(center,add(id,p.x,p.y,r,1+(i%3)*.15));});
   return {width:w,height:h,nodes,links,compact:true,satellites:false};
  }
  const scale=Math.min(1.4,Math.max(.65,Math.min(w/1100,h/600)));
  const r=Math.min(50*scale,w*.1,h*.135),cr=r*1.35,sr=Math.min(30,Math.max(22,r*.46));
  const large=w>=1000&&h>=480;
  const outerX=Math.min(w*.43,w/2-sr-16),outerY=h/2-sr-16;
  const rx=large?outerX-r-sr-22:Math.min(w*.34,w/2-r-16);
  const ry=large?outerY-r-sr-22:h/2-r-16;
  const angles=[-135,-45,0,45,135,180];
  const center=add('core',cx,cy,cr,2.6);
  ids.forEach((id,i)=>{
   const a=angles[i]*Math.PI/180;
   const b=add(id,cx+rx*Math.cos(a),cy+ry*Math.sin(a),r,1+(i%3)*.15);link(center,b);
   if(large)for(let j=0;j<2;j++){
    const angle=a+(j===0?-.18:.18);
    link(b,add(`${id}-${j}`,cx+outerX*Math.cos(angle),cy+outerY*Math.sin(angle),sr,.65));
   }
  });
  return {width:w,height:h,nodes,links,compact:false,satellites:large};
 }
 root.makeMapLayout=makeMapLayout;
 if(typeof module!=='undefined')module.exports={makeMapLayout};
})(typeof window!=='undefined'?window:globalThis);

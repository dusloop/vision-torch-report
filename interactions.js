/* One mouse/touch/pen interaction path for the research diagrams. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function createScope(motion){
  let disposed=false;const cleanups=[],animations=new Set();
  function on(el,type,fn,options){el.addEventListener(type,fn,options);cleanups.push(()=>el.removeEventListener(type,fn,options));}
  function drag(el,handlers){
   let g=null,blockUntil=0;
   const finish=(cancelled=false)=>{
    if(!g)return;const previous=g;g=null;el.classList.remove('is-interacting');
    if(previous.moved)blockUntil=performance.now()+400;
    if(el.hasPointerCapture&&el.hasPointerCapture(previous.id)){try{el.releasePointerCapture(previous.id);}catch(_){}}
    if(handlers.end)handlers.end(previous,cancelled);
   };
   const start=e=>{
    if(disposed||g||e.button!==0||e.isPrimary===false)return;blockUntil=0;
    if(handlers.accept&&!handlers.accept(e))return;
    e.preventDefault();e.stopPropagation();
    g={id:e.pointerId,type:e.pointerType||'mouse',x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dx:0,dy:0,moved:false,last:performance.now(),vx:0,vy:0};
    if(el.setPointerCapture&&e.pointerId!==undefined){try{el.setPointerCapture(e.pointerId);}catch(_){}}
    if(el.hasAttribute('tabindex'))el.focus({preventScroll:true});
    if(handlers.start)handlers.start(g,e);
   };
   const move=e=>{
    if(!g||e.pointerId!==g.id)return;if(g.type==='mouse'&&e.buttons===0){finish(true);return;}
    const now=performance.now(),dt=clamp((now-g.last)/1000,.008,.08);
    g.vx=clamp((e.clientX-g.x)/dt,-900,900);g.vy=clamp((e.clientY-g.y)/dt,-900,900);
    g.x=e.clientX;g.y=e.clientY;g.dx=g.x-g.startX;g.dy=g.y-g.startY;g.last=now;
    if(Math.hypot(g.dx,g.dy)>(handlers.threshold??3)){g.moved=true;el.classList.add('is-interacting');}
    e.preventDefault();if(handlers.move)handlers.move(g,e);
   };
   const end=e=>{if(g&&e.pointerId===g.id)finish(e.type==='pointercancel');};
   on(el,'pointerdown',start);on(window,'pointermove',move,{passive:false});on(window,'pointerup',end);on(window,'pointercancel',end);
   on(el,'lostpointercapture',e=>{if(g&&e.pointerId===g.id&&e.target===el)finish(true);});on(window,'blur',()=>finish(true));
   if(!window.PointerEvent){on(el,'mousedown',start);on(window,'mousemove',move,{passive:false});on(window,'mouseup',end);}
   on(el,'dragstart',e=>e.preventDefault());
   on(el,'click',e=>{if(e.detail!==0&&performance.now()<blockUntil){e.preventDefault();e.stopPropagation();}},true);
   cleanups.push(()=>finish(true));
   return {cancel:()=>finish(true)};
  }
  function tween(initial,render,duration=190){
   let value=initial.slice(),target=value.slice(),start=value.slice(),frame=0,started=null;
   const cancel=()=>{if(frame)cancelAnimationFrame(frame);frame=0;};
   const finish=()=>{cancel();value=target.slice();if(!disposed)render(value);};
   const step=now=>{frame=0;if(disposed)return;if(started===null)started=now;const t=clamp((now-started)/duration,0,1),e=1-Math.pow(1-t,3);value=target.map((v,i)=>start[i]+(v-start[i])*e);render(value);if(t<1)frame=requestAnimationFrame(step);};
   const api={set(next,immediate=false){cancel();target=next.slice();if(immediate||!motion()){finish();return;}start=value.slice();started=null;frame=requestAnimationFrame(step);},finish,get:()=>value.slice()};
   animations.add(api);cleanups.push(cancel);render(value);return api;
  }
  on(document,'vt:motion-change',()=>{if(!motion())animations.forEach(a=>a.finish());});
  function numericKeys(el,input,update){
   on(el,'keydown',e=>{
    const min=+input.min,max=+input.max,step=+input.step||1;
    const keys={ArrowLeft:-step,ArrowDown:-step,ArrowRight:step,ArrowUp:step,PageDown:-step*10,PageUp:step*10};
    if(!(e.key in keys)&&e.key!=='Home'&&e.key!=='End')return;e.preventDefault();e.stopPropagation();
    input.value=e.key==='Home'?min:e.key==='End'?max:clamp(+input.value+keys[e.key],min,max);update(true);
   });
  }
  function viewport(element,label){
   const shell=document.createElement('div');shell.className='diagram-shell';
   const toolbar=document.createElement('div');toolbar.className='diagram-toolbar';
   toolbar.innerHTML=`<span>잡고 이동 · ± 확대/축소</span><div><button type="button" data-view="out" aria-label="${label} 축소">−</button><output aria-label="확대 비율">100%</output><button type="button" data-view="in" aria-label="${label} 확대">＋</button><button type="button" data-view="reset" aria-label="${label} 원래 위치와 크기로">↺</button></div>`;
   const viewport=document.createElement('div');viewport.className='diagram-viewport';viewport.tabIndex=0;viewport.setAttribute('role','group');viewport.setAttribute('aria-label',`${label}. 빈 곳을 잡아 이동, 더하기와 빼기로 확대·축소. Home 키로 초기화.`);
   const scene=document.createElement('div');scene.className='diagram-scene';
   element.before(shell);shell.append(toolbar,viewport);viewport.append(scene);scene.append(element);
   let state=[0,0,1],inertia=0,last=0,velocity=[0,0],starting=state.slice();
   const size=()=>({w:viewport.clientWidth||viewport.getBoundingClientRect().width||400,h:viewport.clientHeight||viewport.getBoundingClientRect().height||220});
   const bounds=v=>{const {w,h}=size();return [clamp(v[0],-w*.6,w*.6),clamp(v[1],-h*.6,h*.6),clamp(v[2],.75,2.5)];};
   const paint=v=>{state=bounds(v);scene.style.transform=`translate3d(${state[0].toFixed(2)}px,${state[1].toFixed(2)}px,0) scale(${state[2].toFixed(3)})`;toolbar.querySelector('output').value=`${Math.round(state[2]*100)}%`;toolbar.querySelector('[data-view="out"]').disabled=state[2]<=.751;toolbar.querySelector('[data-view="in"]').disabled=state[2]>=2.499;};
   const ease=tween(state,paint,220);
   const stop=()=>{if(inertia)cancelAnimationFrame(inertia);inertia=0;};
   const coast=now=>{
    inertia=0;if(disposed||!motion())return;const dt=last?clamp((now-last)/1000,0,.035):1/60;last=now;
    const next=bounds([state[0]+velocity[0]*dt,state[1]+velocity[1]*dt,state[2]]);
    if(next[0]===state[0])velocity[0]=0;if(next[1]===state[1])velocity[1]=0;
    ease.set(next,true);velocity=velocity.map(v=>v*Math.exp(-9*dt));
    if(Math.hypot(...velocity)>4)inertia=requestAnimationFrame(coast);
   };
   const shift=(dx,dy,scale=state[2])=>{stop();ease.set(bounds([state[0]+dx,state[1]+dy,scale]));};
   drag(viewport,{
    accept:e=>!e.target.closest('button,a,input,select,textarea,[data-drag-control]'),
    start(){stop();ease.set(state,true);starting=state.slice();},
    move(g){if(g.moved)ease.set(bounds([starting[0]+g.dx,starting[1]+g.dy,starting[2]]),true);},
    end(g,cancelled){if(!disposed&&!cancelled&&g.moved&&motion()&&performance.now()-g.last<100){velocity=[g.vx*.55,g.vy*.55];last=0;inertia=requestAnimationFrame(coast);}}
   });
   on(toolbar,'click',e=>{const b=e.target.closest('[data-view]');if(!b)return;stop();if(b.dataset.view==='reset')ease.set([0,0,1]);else shift(0,0,state[2]+(b.dataset.view==='in'?.25:-.25));});
   on(viewport,'keydown',e=>{
    if(e.target!==viewport)return;
    const keys={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};
    if(e.key in keys){e.preventDefault();shift(...keys[e.key]);}
    else if(e.key==='+'||e.key==='='){e.preventDefault();shift(0,0,state[2]+.25);}
    else if(e.key==='-'){e.preventDefault();shift(0,0,state[2]-.25);}
    else if(e.key==='Home'){e.preventDefault();stop();ease.set([0,0,1]);}
   });
   on(document,'vt:motion-change',()=>{if(!motion())stop();});
   cleanups.push(stop);return shell;
  }
  return {on,drag,tween,numericKeys,viewport,dispose(){if(disposed)return;disposed=true;cleanups.reverse().forEach(f=>f());animations.clear();}};
 }
 function svgPoint(svg,event){
  // The matrix includes CSS pan/zoom, SVG viewBox scaling and nested transforms.
  if(svg.createSVGPoint&&svg.getScreenCTM){const m=svg.getScreenCTM();if(m){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;try{return p.matrixTransform(m.inverse());}catch(_){}}}
  const rect=svg.getBoundingClientRect(),v=(svg.getAttribute('viewBox')||'0 0 300 150').split(/\s+/).map(Number),s=Math.min(rect.width/v[2],rect.height/v[3])||1;
  return {x:v[0]+(event.clientX-rect.left-(rect.width-v[2]*s)/2)/s,y:v[1]+(event.clientY-rect.top-(rect.height-v[3]*s)/2)/s};
 }
 root.DiagramInteractions={createScope,svgPoint};
})(window);

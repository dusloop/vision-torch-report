(function(){
'use strict';
const {sections,journals}=window.ReportData;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const mapScreen=$('#mapScreen'), reader=$('#reader'), map=$('#map'), detail=$('#detailBody');
const visited=new Set();let selected='overview',returnFocus=null,world=null,frame=0,previousTime=0,gesture=null,blockedUntil=0,pan={x:0,y:0},layoutSize={width:0,height:0},resizeFrame=0;
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');let motion=!reduce.matches;
const satellites=[['탐구 질문','시스템 설계'],['ROI · 전처리','EMA · 추론'],['서보모터','입력 보정'],['물성 벡터','예측값 저장'],['개발 과정','팀의 기록'],['검증 범위','후속 실험']];
const themes=sections.map(s=>`--tint:${s.tint};--accent:${s.accent}`);
const core=`<a draggable="false" href="#overview" class="map-node core" data-body="core" data-topic="overview" style="--tint:#ece2ff;--accent:#ad91db" aria-label="시각에서 촉각으로, 탐구 개요 열기"><span class="node-icon">◈</span><strong class="node-title">시각 → 촉각</strong><span class="node-subtitle">로봇 그리퍼 제어</span><span class="core-label">EXPLORE THE RESEARCH</span></a>`;
$('#nodes').innerHTML=core+sections.map((s,i)=>`<a draggable="false" href="#${s.id}" class="map-node topic" data-body="${s.id}" data-topic="${s.id}" style="${themes[i]}" aria-label="${s.title} 보고서 열기"><span class="node-icon" aria-hidden="true">${s.icon}</span><strong class="node-title">${s.title}</strong><span class="node-subtitle">${s.en}</span></a>`+satellites[i].map((name,j)=>`<a draggable="false" href="#${s.id}" class="map-node satellite" data-body="${s.id}-${j}" data-topic="${s.id}" style="${themes[i]}" aria-label="${name}: ${s.title} 열기"><span class="node-title">${name}</span></a>`).join('')).join('');
$('#contentsLinks').innerHTML=sections.map((s,i)=>`<a href="#${s.id}"><span>0${i+1}</span>${s.title}</a>`).join('');
const nodeElements=new Map($$('.map-node').map(n=>[n.dataset.body,n]));
let lineElements=[];
function canvasSize(){
 const rect=map.getBoundingClientRect();
 return {width:rect.width||map.clientWidth||innerWidth,height:rect.height||map.clientHeight||innerHeight};
}
function layout(){
 finishGesture(true);stopMotion();
 const size=canvasSize(),plan=makeMapLayout(size.width,size.height,sections.map(s=>s.id));
 layoutSize=size;pan={x:0,y:0};map.classList.toggle('compact-map',plan.compact);
 world=new SpringWorld(size.width,size.height);
 const bodies=new Map();nodeElements.forEach(el=>el.hidden=true);
 for(const n of plan.nodes){
  const b=world.add(n.id,n.x,n.y,n.r,n.mass);bodies.set(n.id,b);
  const el=nodeElements.get(n.id);el.hidden=false;el.style.width=el.style.height=`${n.r*2}px`;el.style.setProperty('--node-radius',`${n.r}px`);
 }
 for(const [a,b] of plan.links)world.connect(bodies.get(a),bodies.get(b));
 $('#connections').innerHTML=world.links.map(l=>`<line class="${l.b.id.includes('-')?'twig':''}"/>`).join('');lineElements=$$('line',$('#connections'));
 draw();wake();
}
function draw(){if(!world)return;for(const b of world.bodies){nodeElements.get(b.id).style.transform=`translate3d(${(b.x-b.r+pan.x).toFixed(2)}px,${(b.y-b.r+pan.y).toFixed(2)}px,0)`;}
 world.links.forEach((l,i)=>{const el=lineElements[i];el.setAttribute('x1',l.a.x+pan.x);el.setAttribute('y1',l.a.y+pan.y);el.setAttribute('x2',l.b.x+pan.x);el.setAttribute('y2',l.b.y+pan.y);});}
function wake(){if(!frame&&motion&&!mapScreen.hidden&&!document.hidden){previousTime=0;frame=requestAnimationFrame(tick);}}
function tick(t){frame=0;if(!motion||mapScreen.hidden||document.hidden)return;world.step(previousTime?Math.min(.05,(t-previousTime)/1000):1/60);previousTime=t;draw();if(world.energy()>.02||gesture)frame=requestAnimationFrame(tick);}
function stopMotion(){if(frame)cancelAnimationFrame(frame);frame=0;previousTime=0;}
function updateMotion(){const b=$('#toggleMotion');b.setAttribute('aria-pressed',String(motion));b.textContent=reduce.matches?'모션 줄임':motion?'모션 켜짐':'모션 꺼짐';b.disabled=reduce.matches;}
$('#toggleMotion').onclick=()=>{finishGesture(true);motion=!motion;updateMotion();if(!motion){stopMotion();world.reset();draw();}else wake();};
const handleReduced=()=>{finishGesture(true);motion=!reduce.matches;updateMotion();if(!motion){stopMotion();world.reset();draw();}else wake();};
if(reduce.addEventListener)reduce.addEventListener('change',handleReduced);else if(reduce.addListener)reduce.addListener(handleReduced);
$('#resetMap').onclick=()=>{layout();$('#mapStatus').textContent='지도를 화면 크기에 맞추고 중앙으로 되돌렸습니다.';};
map.addEventListener('wheel',e=>{if(e.ctrlKey||!motion)return;e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?world.height:1;world.impulse(-Math.max(-150,Math.min(150,e.deltaX*unit))*1.2,-Math.max(-170,Math.min(170,e.deltaY*unit))*2.3);wake();},{passive:false});
// Native link/image dragging must not steal desktop pointer events.
map.addEventListener('dragstart',e=>e.preventDefault());
map.addEventListener('selectstart',e=>e.preventDefault());
function startPointer(e){
 if(e.button!==0||e.isPrimary===false||gesture||mapScreen.hidden)return;
 const a=e.target.closest('[data-body]'),body=a?world.bodies.find(n=>n.id===a.dataset.body):null;
 const capture=a||map,pointType=e.pointerType||'mouse';blockedUntil=0;
 gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,body,moved:false,type:pointType,capture,
  bodyX:body?body.x:0,bodyY:body?body.y:0,panX:pan.x,panY:pan.y};
 if(body){body.pin={x:body.x,y:body.y};a.focus({preventScroll:true});}
 // Capture on the original link, not its parent: a stationary click still opens it.
 if(capture.setPointerCapture&&e.pointerId!==undefined){try{capture.setPointerCapture(e.pointerId);}catch(_){/* Window listeners provide the fallback. */}}
 if(pointType==='mouse')e.preventDefault();
}
function movePointer(e){
 if(!gesture||gesture.id!==e.pointerId)return;
 const g=gesture;
 if(g.type==='mouse'&&e.buttons===0){finishGesture(true);return;}
 const dx=e.clientX-g.startX,dy=e.clientY-g.startY;
 if(!g.moved&&Math.hypot(dx,dy)>(g.type==='mouse'?4:8)){
  g.moved=true;map.classList.add('dragging');if(g.body)g.capture.classList.add('is-dragging');
 }
 if(!g.moved)return;e.preventDefault();
 if(g.body){
  const b=g.body;b.pin={x:Math.max(b.r+8,Math.min(world.width-b.r-8,g.bodyX+dx)),y:Math.max(b.r+8,Math.min(world.height-b.r-8,g.bodyY+dy))};
  b.x=b.pin.x;b.y=b.pin.y;b.vx=b.vy=0;
 }else{
  // Background dragging pans the entire map one-to-one, including all connector lines.
  pan.x=Math.max(-world.width*.65,Math.min(world.width*.65,g.panX+dx));
  pan.y=Math.max(-world.height*.65,Math.min(world.height*.65,g.panY+dy));
 }
 draw();wake();
}
function finishGesture(cancelled=false){
 if(!gesture)return;const g=gesture;gesture=null;
 if(g.body)g.body.pin=null;
 if(g.moved||cancelled)blockedUntil=performance.now()+450;
 g.capture.classList.remove('is-dragging');map.classList.remove('dragging');
 if(g.capture.hasPointerCapture&&g.capture.hasPointerCapture(g.id)){try{g.capture.releasePointerCapture(g.id);}catch(_){}}
 wake();
}
function endPointer(e){if(gesture&&gesture.id===e.pointerId)finishGesture(e.type==='pointercancel');}
map.addEventListener('pointerdown',startPointer);
window.addEventListener('pointermove',movePointer,{passive:false});
window.addEventListener('pointerup',endPointer);window.addEventListener('pointercancel',endPointer);
window.addEventListener('lostpointercapture',e=>{if(gesture&&e.pointerId===gesture.id&&e.target===gesture.capture)finishGesture(true);});
window.addEventListener('blur',()=>finishGesture(true));
// Older desktop browsers without Pointer Events still support the mouse path.
if(!window.PointerEvent){
 map.addEventListener('mousedown',startPointer);window.addEventListener('mousemove',movePointer,{passive:false});window.addEventListener('mouseup',endPointer);
}
map.addEventListener('click',e=>{
 if(e.detail!==0&&performance.now()<blockedUntil){e.preventDefault();e.stopPropagation();return;}
 const a=e.target.closest('a[data-topic]');if(a){e.preventDefault();navigate(a.dataset.topic,a);}
});
function scheduleLayout(){
 if(mapScreen.hidden)return;
 if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(mapScreen.hidden)return;const size=canvasSize();if(Math.abs(size.width-layoutSize.width)>.5||Math.abs(size.height-layoutSize.height)>.5)layout();});
}
window.addEventListener('resize',scheduleLayout);
if(window.ResizeObserver)new ResizeObserver(scheduleLayout).observe(map);
if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleLayout);
document.addEventListener('visibilitychange',()=>{if(document.hidden){finishGesture(true);stopMotion();}else wake();});
$('#openContents').onclick=()=>{const open=$('#contents').hidden;$('#contents').hidden=!open;$('#openContents').setAttribute('aria-expanded',String(open));};
function closeContents(){$('#contents').hidden=true;$('#openContents').setAttribute('aria-expanded','false');}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a&&!a.closest('#map')&&!e.defaultPrevented){e.preventDefault();navigate(a.getAttribute('href').slice(1),a);}});
function navigate(id,trigger){if(trigger&&!mapScreen.hidden)returnFocus=trigger;const target=id==='sources'?'validation':id;if(location.hash!==`#${target}`)history.pushState({topic:target},'',`#${target}`);showRoute(target);}
function showRoute(id){closeContents();if(id==='map'||!id){showMap();return;}if(id==='all'){showReader('all');return;}if(!sections.some(s=>s.id===id)){showMap();return;}showReader(id);}
function showMap(){reader.hidden=true;mapScreen.hidden=false;mapScreen.inert=false;reader.inert=true;scheduleLayout();const target=returnFocus&&returnFocus.isConnected?returnFocus:nodeElements.get(selected)||nodeElements.get('core');if(target)target.focus({preventScroll:true});wake();}
function closeArticle(){history.replaceState(null,'','#map');showMap();}
function showReader(id){
 finishGesture(true);stopMotion();
 selected=id;mapScreen.hidden=true;mapScreen.inert=true;reader.hidden=false;reader.inert=false;
 if(id==='all')renderAll();else{
  const s=sections.find(s=>s.id===id),i=sections.indexOf(s);visited.add(id);
  detail.innerHTML=`<div class="section-kicker">${s.tag}</div><p class="reader-category">${s.title}</p><h2 class="article-title">${s.heading.replace(/<br>/g,' ')}</h2>${articleBody(s)}`;
  $('#readerTitle').textContent=s.title;$('#readerProgress').style.width=`${(i+1)/6*100}%`;$('#pageNumber').textContent=`0${i+1} / 06`;
  $('#previous').textContent=i===0?'← 마인드맵':'← 이전 탐구';$('#next').textContent=i===5?'마인드맵으로 →':'다음 탐구 →';
  initVisual(id);
 }
 $('#readCount').textContent=`${visited.size} / 6 탐구`;
 $$('.map-node').forEach(n=>n.setAttribute('aria-current',String(n.dataset.topic===id)));
 reader.scrollTop=0;$('#detail').focus({preventScroll:true});
}
$('#closeReader').onclick=closeArticle;
$('#previous').onclick=()=>{const i=sections.findIndex(s=>s.id===selected);if(i<=0)closeArticle();else navigate(sections[i-1].id);};
$('#next').onclick=()=>{const i=sections.findIndex(s=>s.id===selected);if(i<0||i===5)closeArticle();else navigate(sections[i+1].id);};
$('#readAll').onclick=()=>navigate('all');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!reader.hidden)closeArticle();else closeContents();}});
window.addEventListener('popstate',()=>showRoute(location.hash.slice(1)));window.addEventListener('hashchange',()=>showRoute(location.hash.slice(1)));
const figure=(title,badge,body,caption)=>`<figure class="visual"><div class="visual-head"><h3>${title}</h3><span class="badge">${badge}</span></div>${body}<figcaption class="figure-caption">${caption}</figcaption></figure>`;
const chartGrid=(ylow='−1',yhigh='+1',ylabel='정규화 값',xlabel='샘플 순서')=>`<line class="grid-line" x1="45" x2="575" y1="30" y2="30"/><line class="grid-line" x1="45" x2="575" y1="110" y2="110"/><line class="grid-line" x1="45" x2="575" y1="190" y2="190"/><text class="axis-label" x="10" y="34">${yhigh}</text><text class="axis-label" x="10" y="194">${ylow}</text><text class="axis-label" x="45" y="16">${ylabel}</text><text class="axis-label" x="475" y="220">${xlabel}</text>`;
function graphPath(values,min=-1,max=1){return values.map((v,i)=>`${i?'L':'M'}${(45+i/(values.length-1)*530).toFixed(2)},${(190-(v-min)/(max-min)*160).toFixed(2)}`).join(' ');}
const visualHTML={
 overview:()=>figure('이미지 한 장이 동작이 되기까지','단계를 눌러 탐색',`<div class="pipeline" id="pipeline">${[['▧','카메라','영상 · 관심 영역'],['◉','물성 예측','거칠기 · 경도 · 마찰'],['▣','값 저장','잡기 버튼 시점'],['⋈','그리퍼','두 서보의 움직임']].map((x,i)=>`<button data-step="${i}" aria-pressed="${i===0}"><b>${x[0]}</b>${x[1]}<small class="step-sub">${x[2]}</small></button>`).join('')}</div><div class="pipeline-description" id="pipelineInfo" role="status"></div>`,'활동 기록에 근거한 시스템 관계도입니다. 영상에서 예측하는 과정과 실제 힘을 측정하는 과정은 다릅니다.'),
 vision:()=>figure('예측값의 흔들림을 줄이는 방법','설명용 합성 신호',`<div class="chart-legend"><span style="--key:#dfcfee">원래 입력</span><span style="--key:#a67ac5">EMA 적용</span></div><svg viewBox="0 0 600 235" role="img" aria-label="합성 입력과 지수이동평균 출력을 비교하는 선 그래프"><title>EMA 비교 그래프: 실제 모델의 측정 데이터가 아닙니다</title>${chartGrid()}<path id="rawLine" class="chart-line" stroke="#dfcfee" stroke-width="2"/><path id="emaLine" class="chart-line" stroke="#a67ac5" stroke-width="3"/></svg><label class="range-label" for="alpha">새 예측값을 반영하는 비율 α <output id="alphaValue" for="alpha">0.25</output><input id="alpha" type="range" min="0.05" max="1" step="0.05" value="0.25"></label><div class="formula">평활값 = α × 현재 입력 + (1 − α) × 이전 평활값</div><p id="emaSummary" class="figure-caption"></p>`,'슬라이더로 흔들림과 반응 속도의 차이를 확인해 보세요. α가 작으면 변화가 부드러워지지만 입력을 늦게 따라갑니다. 실제 사용한 α와 예측 성능은 확인되지 않았습니다.'),
 control:()=>figure('같은 시간, 부드럽게 닫히는 두 손가락','설명용 궤적',`<div class="split-visual"><div><svg viewBox="0 0 600 235" role="img" aria-label="시간에 따른 선형 이동과 가감속 이동의 정규화 진행률 비교">${chartGrid('0','1','이동 진행률','시간 (정규화)')}<path class="chart-line" d="M45 190 L575 30" stroke="#decfeb" stroke-width="2"/><path id="smoothLine" class="chart-line" stroke="#ae88c8" stroke-width="3"/><circle id="curvePoint" r="7" fill="#ae88c8"/><line id="curveGuide" y1="30" y2="190" stroke="#c9b3da" stroke-dasharray="4 4"/></svg><div class="chart-legend"><span style="--key:#decfeb">선형 이동</span><span style="--key:#ae88c8">가감속 예시</span></div></div><div><div id="trajectoryGripper" class="gripper-scene" role="img" aria-label="공통 진행률로 움직이는 그리퍼 모형"><div class="gripper-rail"></div><div class="finger left" style="transition:none"></div><div class="finger right" style="transition:none"></div><div class="gripper-object"></div></div><div class="readout"><div><b id="progressA">0%</b><small>서보 A 진행률</small></div><div><b id="progressB">0%</b><small>서보 B 진행률</small></div></div></div></div><label class="range-label" for="trajectory">동작 시간 <output id="trajectoryValue">0%</output><input id="trajectory" type="range" min="0" max="100" value="0"></label><div class="formula">설명용 진행률 s(t) = 3t² − 2t³, 0 ≤ t ≤ 1</div>`,'두 서보의 실제 회전 방향과 각도는 별도 보정이 필요합니다. 그래프는 공통 진행률과 가감속의 개념을 설명하며, 원본 로봇의 궤적이나 파지력을 재현하지 않습니다.'),
 demo:()=>figure('바뀌는 예측값, 저장되는 한 순간','직접 조절하는 설명용 모형',`<div class="material-presets" aria-label="설명용 입력 프리셋"><button data-preset="-0.6,-0.7,0.5">가상 입력 A</button><button data-preset="0.4,0.8,-0.6">가상 입력 B</button><button data-preset="0,0,0">중앙값</button></div><div class="split-visual"><div>${['거칠기','경도','마찰'].map((n,i)=>`<label class="range-label" for="property${i}">${n}<output id="value${i}">0.00</output><input id="property${i}" type="range" min="-1" max="1" step="0.05" value="0"></label>`).join('')}<div class="demo-buttons"><button id="grasp" class="primary">잡기 · 현재 값 저장</button><button id="release">열기 / 초기화</button></div><div id="demoState" class="demo-state" role="status">입력 대기 · 아직 저장된 값이 없습니다.</div></div><div><svg class="radar" viewBox="0 0 300 260" role="img" aria-label="현재 물성 입력과 잡기 순간 저장값의 레이더 차트"><title>−1은 중심, +1은 가장자리인 설명용 물성 차트</title><g id="radarGrid"></g><polygon id="snapshotPolygon" fill="#e0b9be24" stroke="#c69da9" stroke-width="2" stroke-dasharray="5 4"/><polygon id="livePolygon" fill="#bfa0dc45" stroke="#b292d0" stroke-width="2"/><text x="150" y="21" text-anchor="middle" class="axis-label">거칠기</text><text x="260" y="225" text-anchor="middle" class="axis-label">경도</text><text x="40" y="225" text-anchor="middle" class="axis-label">마찰</text></svg><div class="chart-legend"><span style="--key:#b292d0">현재 입력</span><span class="dashed">잡기 시 저장값</span></div></div></div><div id="demoScene" class="gripper-scene" role="img" aria-label="열린 그리퍼 모형"><div class="gripper-rail"></div><div class="finger left"></div><div class="finger right"></div><div class="gripper-object"></div></div>`,'잡기 후에도 슬라이더를 움직여 보세요. 현재 입력은 변하지만 저장된 값과 진행 중인 고정 위치 동작은 유지됩니다. 실제 AI 추론·로봇 연결·물성별 힘 계산은 수행하지 않습니다.'),
 activity:()=>figure('다섯 번의 활동, 세 사람의 시선','날짜를 선택하세요',`<div class="journal-path" id="journalPath">${[['08.19','주제 선정'],['09.09','환경 구성'],['09.23','예측 · 제작'],['10.14','제어 · 개선'],['10.28','통합 · 점검']].map((x,i)=>`<button data-date="${i}" aria-pressed="${i===0}">${x[0]}<small>${x[1]}</small></button>`).join('')}</div><div id="journalEntries" class="journal-entries"></div>`,'각 날짜에 작성된 활동을 요약했습니다. 짧은 미완성 기록은 추측해 채우지 않았으며, 활동자가 기록한 내용과 검증된 수치를 구분했습니다.'),
 validation:()=>figure('구현에서 검증으로 이어지는 다음 단계','연구 범위 구분',`<div class="evidence-flow"><div class="evidence-column"><span class="state-label">활동 기록으로 확인</span><h4>시스템 구현</h4><p>영상에서 물성 출력</p><p>버튼 보정 · 예측값 저장</p><p>두 서보의 파지 동작</p></div><div class="evidence-arrow">→</div><div class="evidence-column"><span class="state-label">추가 실험 필요</span><h4>성능 검증</h4><p>물성 예측 오차</p><p>실제 힘(N) · 미끄러짐</p><p>재질별 반복 파지 성공률</p></div></div>`,'실험 데이터가 없는 항목에는 임의의 성공률이나 정확도 그래프를 넣지 않았습니다. 실제 힘 측정과 반복 실험이 확보되면 결과 비교 그래프로 확장할 수 있습니다.')
};
function articleBody(s){
 if(s.id==='demo')return `<p class="lead">물성 벡터를 직접 바꾸고, 잡기 순간의 값을 저장해 보세요. 변화하는 입력과 고정된 동작의 관계를 눈으로 확인할 수 있습니다.</p>${visualHTML.demo()}<section class="prose-section"><h4>왜 물성이 달라도 닫힘 위치는 같을까요?</h4><p>최신 활동 기록은 ‘예측값 저장과 고정 각도 제어’를 구분합니다. 물성 예측값을 실제 힘으로 환산할 실험적 근거가 부족하므로, 이 체험도 임의의 힘 계산식을 사용하지 않습니다. 프리셋은 특정 재질의 측정값이 아닌 가상 입력입니다.</p></section>`;
 if(s.id==='activity')return `<p class="lead">처음의 구상에서 하드웨어 제작, 실시간 추론과 제어 개선까지. 날짜를 눌러 세 사람이 남긴 기록을 함께 읽어보세요.</p>${visualHTML.activity()}<p class="source-note">근거 · 2학기활동내용 D5:H5(정연준), D6:H6(강준혁), D8:H8(권준현).</p>`;
 const html=s.html,first=html.indexOf('</p>')+4;return html.slice(0,first)+visualHTML[s.id]()+html.slice(first);
}
const stepTexts=[
 '카메라 영상을 읽고 물체를 담은 관심 영역(ROI)을 다룹니다. 기록에는 224 × 224 전처리와 ROI 축소, 영상 재연결 점검이 포함되어 있습니다.',
 'PyTorch 기반 모델이 거칠기·경도·마찰의 세 성분을 예측합니다. 정규화 출력은 이미지에서 얻은 추정치이며, 물리적인 마찰계수나 힘(N) 자체가 아닙니다.',
 '잡기 버튼을 누르는 순간의 최신 예측값을 따로 저장합니다. 이후 영상에서 다른 값이 나오더라도 진행 중인 동작의 기준이 계속 바뀌지 않도록 합니다.',
 '두 서보를 이용해 양쪽 손가락을 움직입니다. 최신 기록에서는 예측값 저장과 고정 각도 제어를 구분하며, 실제 파지력 검증은 후속 과제로 남아 있습니다.'
];
function initVisual(id){
 if(id==='overview'){const update=i=>{$$('#pipeline button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.step===i)));$('#pipelineInfo').textContent=stepTexts[i];};$('#pipeline').onclick=e=>{const b=e.target.closest('[data-step]');if(b)update(+b.dataset.step);};update(0);}
 if(id==='vision'){
  const raw=Array.from({length:60},(_,i)=>Math.max(-.95,Math.min(.95,(i<20?-.45:i<40?.55:-.15)+.2*Math.sin(i*2.3)+.1*Math.cos(i*1.7))));
  $('#rawLine').setAttribute('d',graphPath(raw));const update=()=>{const a=+$('#alpha').value;let previous=raw[0];const smoothed=raw.map((x,i)=>previous=i?a*x+(1-a)*previous:x);$('#emaLine').setAttribute('d',graphPath(smoothed));$('#alphaValue').textContent=a.toFixed(2);$('#emaSummary').textContent=a===1?'α = 1: 원래 입력을 그대로 따라가며 두 선이 겹칩니다.':`현재 α = ${a.toFixed(2)}. 새 입력 ${Math.round(a*100)}%, 이전 평활값 ${Math.round((1-a)*100)}%를 반영합니다.`;};$('#alpha').oninput=update;update();
 }
 if(id==='control'){
  const smooth=t=>t*t*(3-2*t);$('#smoothLine').setAttribute('d',graphPath(Array.from({length:51},(_,i)=>smooth(i/50)),0,1));
  const update=()=>{const t=+$('#trajectory').value/100,s=smooth(t);$('#trajectoryValue').textContent=`${Math.round(t*100)}%`;$('#progressA').textContent=$('#progressB').textContent=`${Math.round(s*100)}%`;$('#curvePoint').setAttribute('cx',45+t*530);$('#curvePoint').setAttribute('cy',190-s*160);$('#curveGuide').setAttribute('x1',45+t*530);$('#curveGuide').setAttribute('x2',45+t*530);$('#trajectoryGripper .left').style.transform=`translateX(${s*42}px)`;$('#trajectoryGripper .right').style.transform=`translateX(${-s*42}px)`;};$('#trajectory').oninput=update;update();
 }
 if(id==='demo')initDemo();
 if(id==='activity'){
  const update=i=>{$$('#journalPath button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.date===i)));$('#journalEntries').innerHTML=Object.entries(journals).map(([name,rows])=>{let entry=rows[i];if(name==='강준혁')entry=rows[i<2?i:i===4?3:2];return `<section class="journal-entry"><h4>${name} · ${entry[0]}</h4><p>${entry[1]}</p></section>`;}).join('');};$('#journalPath').onclick=e=>{const b=e.target.closest('[data-date]');if(b)update(+b.dataset.date);};update(0);
 }
}
function initDemo(){
 const inputs=$$('.range-label input',detail),center=[150,140],directions=[-90,30,150];let snapshot=null;
 const points=values=>values.map((v,i)=>{const r=(v+1)/2*98,a=directions[i]*Math.PI/180;return `${center[0]+r*Math.cos(a)},${center[1]+r*Math.sin(a)}`;}).join(' ');
 $('#radarGrid').innerHTML=[-.5,0,.5,1].map(v=>`<polygon points="${points([v,v,v])}" fill="none" stroke="#e4d9ef"/>`).join('')+directions.map(a=>`<line x1="150" y1="140" x2="${150+98*Math.cos(a*Math.PI/180)}" y2="${140+98*Math.sin(a*Math.PI/180)}" stroke="#e4d9ef"/>`).join('');
 const update=()=>{const v=inputs.map((e,i)=>{const n=+e.value;$('#value'+i).textContent=n.toFixed(2);return n;});$('#livePolygon').setAttribute('points',points(v));if(snapshot)$('#snapshotPolygon').setAttribute('points',points(snapshot));else $('#snapshotPolygon').removeAttribute('points');};
 inputs.forEach(e=>e.oninput=update);
 $$('.material-presets button').forEach(b=>b.onclick=()=>{b.dataset.preset.split(',').forEach((v,i)=>inputs[i].value=v);update();});
 $('#grasp').onclick=()=>{snapshot=inputs.map(e=>+e.value);$('#demoState').textContent=`저장 완료 · 거칠기 ${snapshot[0].toFixed(2)} / 경도 ${snapshot[1].toFixed(2)} / 마찰 ${snapshot[2].toFixed(2)}. 슬라이더를 움직여도 이 값은 유지됩니다.`;$('#demoScene').classList.add('closed');$('#demoScene').setAttribute('aria-label','고정 위치로 닫힌 그리퍼 모형');$('#grasp').disabled=true;update();};
 $('#release').onclick=()=>{snapshot=null;$('#demoScene').classList.remove('closed');$('#demoScene').setAttribute('aria-label','열린 그리퍼 모형');$('#grasp').disabled=false;$('#demoState').textContent='열기 완료 · 저장값을 초기화했습니다. 다시 잡아보세요.';update();};update();
}
function renderAll(){
 $('#readerTitle').textContent='전체 보고서';$('#readerProgress').style.width='100%';$('#pageNumber').textContent='전체 읽기';$('#previous').textContent='← 마인드맵';$('#next').textContent='마인드맵으로 →';
 detail.innerHTML=`<div class="section-kicker">FULL RESEARCH REPORT</div><h2 class="article-title">시각 기반 촉각 예측을 통한<br>로봇 그리퍼 제어</h2><p class="lead">각 카테고리의 시각 자료와 체험은 아래 바로가기로 열 수 있습니다.</p><nav class="reader-chapters">${sections.map(s=>`<a href="#${s.id}">${s.title} ↗</a>`).join('')}</nav><div class="figure-actions"><button id="printReport">인쇄 / PDF 저장</button></div>`+sections.map(s=>{
 let html=s.html;if(s.id==='demo')html='<p>설명용 체험에서는 세 물성 입력을 조절하고 잡기 시점의 값을 저장합니다. 이후 입력 변화와 관계없이 고정된 위치로 닫힙니다. 실제 AI 추론·하드웨어 제어·힘 측정 결과가 아닙니다.</p>';
 if(s.id==='activity')html=Object.entries(journals).map(([n,rows])=>`<h4>${n}</h4>`+rows.map(([d,t])=>`<p><strong>${d}</strong> · ${t}</p>`).join('')).join('');
 return `<section class="full-section"><h3>${s.title}</h3>${html}</section>`;}).join('');$('#printReport').onclick=()=>window.print();
}
layout();updateMotion();reader.inert=true;showRoute(location.hash.slice(1));
})();

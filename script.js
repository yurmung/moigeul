(()=>{
const TAU=Math.PI*2,R=(a,b)=>a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1));
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const hudT=document.getElementById('hudT'),barI=document.querySelector('#bar i'),msg=document.getElementById('msg');
const panel=document.getElementById('panel'),txt=document.getElementById('txt'),spd=document.getElementById('spd'),cnt=document.getElementById('cnt'),hint=document.getElementById('scrollHint');
let W=0,H=0,DPR=1,worldH=0,scrollY=0,userScrolled=false;
let nuts=[],birds=[],crumbs=[],live=new Set(),dirty=[],fullDirty=true;
let appearing=false,appearT=0,appearDur=1,appearIdx=0;
let fontScale=1,started=false,lastText='',pendingText=null,birdScale=1,elapsed=0,spawnTimer=0,phase='idle',total=0,alive=0,speed=1,capB=25,maxR=10;

/* ---------- 바닥 타일 (세로로 이어 붙임) ---------- */
const TILE=512,bg=document.createElement('canvas');
function drawBg(){
  bg.width=Math.round(W*DPR);bg.height=TILE*DPR;const g=bg.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
  g.fillStyle='#f3eadb';g.fillRect(0,0,W,TILE);
  const cols=['#c9b590','#b8a37c','#d8c8a6'];
  for(let i=0,n=W*TILE/900;i<n;i++){g.globalAlpha=R(.12,.28);g.fillStyle=cols[i%3];g.fillRect(R(0,W),R(0,TILE),R(.8,2),R(.8,2))}
  g.lineCap='round';
  for(let i=0,n=W*TILE/5000;i<n;i++){
    const x=Math.random()<.5?R(0,W*.06):R(W*.94,W),y=R(8,TILE-8);
    g.globalAlpha=R(.3,.55);g.strokeStyle=['#8aa35a','#76924a','#9cb26a'][i%3];g.lineWidth=R(1,1.7);
    for(let k=0;k<RI(2,4);k++){g.beginPath();g.moveTo(x+k*2,y);g.quadraticCurveTo(x+k*2+R(-3,3),y-R(3,6),x+k*2+R(-5,5),y-R(6,11));g.stroke()}
  }
  g.globalAlpha=1;
}

/* ---------- 견과류 스프라이트 ---------- */
const NUT_TYPES=['almond','walnut','hazel','peanut','pistachio','cashew'],NUT_W=[.24,.22,.22,.14,.1,.08];
function randNut(){let r=Math.random();for(let i=0;i<6;i++){r-=NUT_W[i];if(r<=0)return NUT_TYPES[i]}return 'almond'}
const NUT_COL={almond:['#b06a38','#7a4321'],peanut:['#d9b47a','#a77b45'],walnut:['#a87a4a','#6f4a28'],hazel:['#9c5a30','#e0bf90'],cashew:['#f1dcae','#d2b073'],pistachio:['#ddc99c','#89a83a']};
const sprites={};
function lin(g,a,b){const l=g.createLinearGradient(-16,-22,16,22);l.addColorStop(0,a);l.addColorStop(1,b);return l}
function makeSprite(t){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.translate(32,32);
  g.shadowColor='rgba(50,30,10,.4)';g.shadowBlur=3;g.shadowOffsetY=2.5;
  if(t==='almond'){
    g.beginPath();g.moveTo(0,-25);g.bezierCurveTo(16,-17,17,10,0,25);g.bezierCurveTo(-17,10,-16,-17,0,-25);
    g.fillStyle=lin(g,'#b8703c','#6e3a1a');g.fill();g.shadowColor='transparent';
    g.strokeStyle='rgba(60,30,10,.35)';g.lineWidth=1.2;
    for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*3.5,-19+Math.abs(k)*3);g.quadraticCurveTo(k*6,0,k*3.5,19-Math.abs(k)*3);g.stroke()}
    g.fillStyle='rgba(255,230,200,.28)';g.beginPath();g.ellipse(-5,-7,3,8,-.2,0,TAU);g.fill();
  }else if(t==='peanut'){
    const sh=()=>{g.beginPath();g.ellipse(0,-11,12,12.5,0,0,TAU);g.moveTo(13,12);g.ellipse(0,12,13,13,0,0,TAU)};
    sh();g.rect(-9.5,-9,19,18);g.fillStyle=lin(g,'#d6ad6e','#9a6c36');g.fill();g.shadowColor='transparent';
    g.save();sh();g.clip();g.fillStyle='rgba(110,70,30,.38)';
    for(let y=-22;y<26;y+=5)for(let x=-12;x<14;x+=5){g.beginPath();g.arc(x+(y%10?2.5:0),y,1.1,0,TAU);g.fill()}
    g.restore();
  }else if(t==='walnut'){
    g.beginPath();for(let i=0;i<=24;i++){const a=i/24*TAU,r=22+Math.sin(a*5)*1.3;g.lineTo(Math.cos(a)*r,Math.sin(a)*r*1.05)}
    const rg=g.createRadialGradient(-6,-8,2,0,0,26);rg.addColorStop(0,'#b88752');rg.addColorStop(1,'#6a4424');g.fillStyle=rg;g.fill();g.shadowColor='transparent';
    g.strokeStyle='rgba(55,30,10,.55)';g.lineWidth=1.6;g.lineCap='round';
    g.beginPath();g.moveTo(0,-22);g.bezierCurveTo(3,-8,-3,8,0,23);g.stroke();
    for(let i=0;i<10;i++){const s=i%2?1:-1,y=-16+i*3.5;g.beginPath();g.moveTo(s*3,y);g.quadraticCurveTo(s*R(9,14),y+R(-5,5),s*R(14,19),y+R(-4,4));g.stroke()}
  }else if(t==='hazel'){
    g.beginPath();g.arc(0,4,20,0,TAU);const rg=g.createRadialGradient(-6,-2,2,0,4,22);rg.addColorStop(0,'#ad6638');rg.addColorStop(1,'#5e3016');g.fillStyle=rg;g.fill();g.shadowColor='transparent';
    g.strokeStyle='rgba(45,22,6,.3)';g.lineWidth=1;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*6,-8);g.quadraticCurveTo(k*9,8,k*5,22);g.stroke()}
    g.beginPath();g.ellipse(0,-13,12.5,7.5,0,0,TAU);g.fillStyle='#c9a26e';g.fill();
    g.fillStyle='rgba(110,70,35,.45)';for(let i=0;i<14;i++){g.beginPath();g.arc(R(-9,9),R(-17,-9),.9,0,TAU);g.fill()}
  }else if(t==='cashew'){
    g.lineCap='round';g.lineWidth=15;g.strokeStyle=lin(g,'#e9cf98','#b98f50');
    g.beginPath();g.arc(9,0,16,Math.PI*.58,Math.PI*1.42);g.stroke();g.shadowColor='transparent';
    g.lineWidth=3;g.strokeStyle='rgba(255,250,230,.55)';g.beginPath();g.arc(9,0,19,Math.PI*.75,Math.PI*1.2);g.stroke();
  }else{
    g.beginPath();g.ellipse(0,0,15,23,0,0,TAU);g.fillStyle=lin(g,'#d9c393','#a88b58');g.fill();g.shadowColor='transparent';
    g.beginPath();g.ellipse(3,-3,6.5,16,.08,0,TAU);const lg=g.createLinearGradient(-3,-18,9,14);lg.addColorStop(0,'#8fb03a');lg.addColorStop(1,'#55721e');g.fillStyle=lg;g.fill();
    g.strokeStyle='rgba(120,60,80,.65)';g.lineWidth=1.6;g.stroke();
  }
  return c;
}
NUT_TYPES.forEach(t=>sprites[t]=makeSprite(t));

function drawNut(c,n,pop,t){
  let s=n.size*(1-n.bite*0.5)*pop;if(s<=0)return;
  const sh=n.shake>0?Math.sin(t*70)*n.shake*2.2:0;
  c.save();c.translate(n.x+sh,n.y);c.rotate(n.rot);c.drawImage(sprites[n.type],-s/2,-s/2,s,s);c.restore();
}

/* ---------- 공간 격자 + 조각 레이어 ---------- */
const G=48,CH=512;let grid=new Map(),chunks=[];
const gk=(cx,cy)=>cy*100000+cx;
function buildGrid(){grid=new Map();for(const n of nuts){const k=gk(Math.floor(n.x/G),Math.floor(n.y/G));let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(n)}}
function forNutsIn(x0,y0,x1,y1,cb){
  for(let cy=Math.floor(y0/G),ey=Math.floor(y1/G);cy<=ey;cy++)for(let cx=Math.floor(x0/G),ex=Math.floor(x1/G);cx<=ex;cx++){
    const a=grid.get(gk(cx,cy));if(a)for(const n of a)cb(n);
  }
}
function buildChunks(){
  const need=W>0?Math.ceil(worldH/CH):0;chunks=new Array(need).fill(null);dirty=[];fullDirty=false;
}
const MAX_CHUNKS=12;
function getChunk(ci){
  if(!chunks[ci]){
    const c=document.createElement('canvas');c.width=Math.round(W*DPR);c.height=CH*DPR;chunks[ci]=c;
    paintRect(-50,ci*CH,W+50,(ci+1)*CH);
  }
  return chunks[ci];
}
function evictChunks(){
  const made=[];for(let i=0;i<chunks.length;i++)if(chunks[i])made.push(i);
  if(made.length<=MAX_CHUNKS)return;
  const mid=(scrollY+H/2)/CH;made.sort((a,b)=>Math.abs(b-mid)-Math.abs(a-mid));
  for(let k=0;k<made.length-MAX_CHUNKS;k++)chunks[made[k]]=null;
}
function paintRect(x0,y0,x1,y1){
  const c0=Math.max(0,Math.floor(y0/CH)),c1=Math.min(chunks.length-1,Math.floor(y1/CH));
  for(let ci=c0;ci<=c1;ci++){
    if(!chunks[ci])continue;
    const g=chunks[ci].getContext('2d');g.save();g.setTransform(DPR,0,0,DPR,0,-ci*CH*DPR);
    g.beginPath();g.rect(x0,y0,x1-x0,y1-y0);g.clip();g.clearRect(x0,y0,x1-x0,y1-y0);
    forNutsIn(x0-maxR,y0-maxR,x1+maxR,y1+maxR,n=>{if(n.alive&&n.shown&&!n.live)drawNut(g,n,1,0)});
    g.restore();
  }
}
function markDirty(n){const r=maxR+3;dirty.push([n.x-r,n.y-r,n.x+r,n.y+r])}
function setLive(n,v){if(n.live===v)return;n.live=v;if(v)live.add(n);else live.delete(n);markDirty(n)}
function flushDirty(){
  if(fullDirty){fullDirty=false;dirty=[];chunks.fill(null);return}
  for(const d of dirty)paintRect(d[0],d[1],d[2],d[3]);dirty=[];
}

/* ---------- 글 → 견과류 배치 ---------- */
const FONT=s=>`900 ${s}px 'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
function wrap(o,text,maxW){
  const out=[];
  for(const para of text.split('\n')){
    let cur='';
    for(const tk of para.split(/(\s+)/)){
      if(!tk)continue;
      if(o.measureText(cur+tk).width<=maxW){cur+=tk;continue}
      if(cur.trim())out.push(cur.trim());
      cur=tk.replace(/^\s+/,'');
      while(cur&&o.measureText(cur).width>maxW){
        const ch=[...cur];let c2='',i=0;
        for(;i<ch.length;i++){if(o.measureText(c2+ch[i]).width>maxW)break;c2+=ch[i]}
        if(i===0){c2=ch[0];i=1}
        out.push(c2);cur=ch.slice(i).join('');
      }
    }
    out.push(cur.trim());
  }
  return out;
}
const ready=()=>W>=80&&H>=120;
function writeText(text){
  text=text.replace(/\r/g,'').trim();if(!text)return;
  lastText=text;if(window.__fillOrig)window.__fillOrig();if(!ready()){pendingText=text;return}pendingText=null;
  const meas=document.createElement('canvas').getContext('2d');
  const panelTop=Math.min(H-110,panel.getBoundingClientRect().top||H-140);
  const maxW=W*.88,usableH=panelTop-90,minSize=W<600?34:46;
  let size=Math.min(240,H*.42),lines;
  for(;;size*=.94){
    if(size<minSize)size=minSize;
    meas.font=FONT(size);lines=wrap(meas,text,maxW);
    if(lines.length*size*1.2<=usableH||size===minSize)break;
  }
  // 지금 맞춘 크기를 100%로 보고 50~200% 배율 적용
  if(fontScale!==1){size*=fontScale;meas.font=FONT(size);lines=wrap(meas,text,maxW)}
  const lh=size*1.2,contentH=lines.length*lh;
  let top;
  if(contentH<=usableH){worldH=H;top=70+(usableH-contentH)/2+lh/2}
  else{top=80+lh/2;worldH=Math.ceil(top+contentH+(H-panelTop)+40)}
  // 촘촘한 육각 배치. 아주 긴 글도 되도록 2048px 띠로 나눠 그리고 읽음
  const step=Math.max(3.6,Math.min(14,size/12)),rh=step*.87,pts=[],BAND=2048;
  const off=document.createElement('canvas');off.width=W;
  const o=off.getContext('2d',{willReadFrequently:true});
  for(let by=0;by<worldH;by+=BAND){
    const bh=Math.min(BAND,worldH-by);off.height=bh;
    o.font=FONT(size);o.textAlign='center';o.textBaseline='middle';o.fillStyle='#000';o.clearRect(0,0,W,bh);
    lines.forEach((l,i)=>{const y=top+i*lh;if(y>by-lh&&y<by+bh+lh)o.fillText(l,W/2,y-by)});
    const data=o.getImageData(0,0,W,bh).data;
    for(let row=Math.max(0,Math.ceil((by-rh/2)/rh));;row++){
      const y=rh/2+row*rh;if(y>=by+bh)break;const yi=(y-by)|0;
      for(let x=(row%2)*step/2;x<W;x+=step)if(data[(yi*W+(x|0))*4+3]>110)pts.push([x+R(-.12,.12)*step,y+R(-.12,.12)*step]);
    }
  }
  pts.sort((a,b)=>(Math.round((a[1]-top)/lh)-Math.round((b[1]-top)/lh))||(a[0]-b[0]));
  appearDur=Math.min(10,.6+pts.length*.0004);
  birds.forEach(b=>flyAway(b,b.dir));
  maxR=step*1.9*.62;
  nuts=pts.map((p,i)=>({x:p[0],y:p[1],type:randNut(),rot:R(0,TAU),size:step*R(1.6,1.9),
    alive:true,shown:false,res:null,live:false,bite:0,shake:0,delay:i/pts.length*appearDur}));
  total=alive=nuts.length;crumbs=[];live=new Set();dirty=[];
  capB=Math.round(Math.max(25,Math.min(110,total/70)));birdScale=Math.max(.6,Math.min(1.15,step/9));
  buildGrid();buildChunks();
  appearing=true;appearT=0;appearIdx=0;elapsed=0;spawnTimer=2.2;phase='writing';
  scrollY=0;userScrolled=false;
  hint.classList.toggle('show',worldH>H);
  msg.classList.remove('show');panel.classList.add('dim');
}

/* ---------- 새 ---------- */
const BIRDS={
  sparrow:{s:1,w:.42,body:'#9a7550',belly:'#ecdfc8',wing:'#6b4a2e',head:'#8a5f3a',beak:'#3a2a1c',stripe:'#3e2a18'},
  pigeon:{s:1.3,w:.22,body:'#8f96a3',belly:'#aeb4c0',wing:'#6c7383',head:'#5b6878',beak:'#c79a9a',neck:'#6d9c8c'},
  tit:{s:.82,w:.2,body:'#7d9462',belly:'#f1cf45',wing:'#55687a',head:'#1e1e22',beak:'#222',cheek:'#fff'},
  magpie:{s:1.38,w:.16,body:'#1c1e24',belly:'#f3f3f3',wing:'#22345a',head:'#15161a',beak:'#111',longTail:true,patch:'#f3f3f3'}
};
const BKEYS=Object.keys(BIRDS);
function randBird(){let r=Math.random();for(const k of BKEYS){r-=BIRDS[k].w;if(r<=0)return k}return 'sparrow'}
const free=n=>n.alive&&n.shown&&!n.popping&&!n.res;
function pickNut(x,y,r){
  if(x!==undefined){let best=null,bd=1e9;
    forNutsIn(x-r,y-r,x+r,y+r,n=>{if(!free(n))return;const d=Math.hypot(n.x-x,n.y-y);if(d<r){const w=d*R(.6,1.4);if(w<bd){bd=w;best=n}}});
    return best}
  for(let i=0;i<60;i++){const n=nuts[(Math.random()*nuts.length)|0];if(n&&free(n))return n}
  const c=nuts.filter(free);return c.length?c[(Math.random()*c.length)|0]:null;
}
function setTarget(b,n){n.res=b;b.target=n;b.dir=n.x>=b.x?1:-1;b.tx=n.x-b.dir*30*b.s;b.ty=n.y+5*b.s}
function spawnBird(){
  // 절반은 지금 보이는 화면 쪽 견과를 노림
  let n=null;
  if(Math.random()<.55)for(let i=0;i<25&&!n;i++){const c=pickNut(R(0,W),scrollY+R(0,H),80);if(c)n=c}
  if(!n)n=pickNut();if(!n)return;
  const type=randBird(),T=BIRDS[type],side=RI(0,2);let x,y;
  if(side===0){x=-60;y=n.y-R(60,400)}else if(side===1){x=W+60;y=n.y-R(60,400)}else{x=R(0,W);y=n.y-R(350,600)}
  const b={type,s:T.s*birdScale*R(.9,1.1),x,y,alt:0,dir:1,state:'fly',flap:R(0,TAU),t:0,angle:0,
    speed:R(240,340),pecks:0,peckN:RI(2,4),pt:0,hit:false,pause:0,eaten:0,appetite:RI(4,10)};
  setTarget(b,n);birds.push(b);
}
function release(b){const n=b.target;if(n){n.res=null;setLive(n,false)}b.target=null}
function flyAway(b,dir){
  if(b.state==='away')return;
  release(b);b.state='away';b.dir=dir||(Math.random()<.5?-1:1);
  b.vx=b.dir*R(150,260);b.vy=-R(60,150);
}
function eat(b){
  const n=b.target;n.res=null;setLive(n,false);n.alive=false;alive--;
  burst(n,8);b.target=null;b.eaten++;
  if(b.eaten<b.appetite){
    const n2=pickNut(b.x+b.dir*30*b.s,b.y,150*b.s);
    if(n2){b.hx=b.x;b.hy=b.y;setTarget(b,n2);b.state='hop';b.t=0;b.hd=.22+Math.hypot(b.tx-b.hx,b.ty-b.hy)/550;return}
  }
  flyAway(b,b.dir);
}
function burst(n,k){
  if(n.y<scrollY-100||n.y>scrollY+H+100)return;
  const [c1,c2]=NUT_COL[n.type];
  for(let i=0;i<k;i++)crumbs.push({x:n.x+R(-3,3),y:n.y+R(-3,3),z:R(0,4),vx:R(-60,60),vy:R(-25,25),vz:R(40,150),life:R(.7,1.5),c:Math.random()<.5?c1:c2,s:R(1.2,2.6)});
}
function updateBird(b,dt){
  if(b.state==='fly'){
    const dx=b.tx-b.x,dy=b.ty-b.y,d=Math.hypot(dx,dy);
    const sp=b.speed*(d<140?Math.max(.3,d/140):1);
    b.flap+=dt*(d<140?20:27);b.alt=Math.min(70,d*.35);
    if(d<sp*dt+1){b.x=b.tx;b.y=b.ty;b.alt=0;b.state='land';b.t=0;setLive(b.target,true)}
    else{b.x+=dx/d*sp*dt;b.y+=dy/d*sp*dt}
  }else if(b.state==='land'){
    b.t+=dt;b.angle=0;if(b.t>R(.12,.3)){b.state='peck';b.pt=0;b.pecks=0;b.hit=false;b.pause=R(0,.3)}
  }else if(b.state==='peck'){
    const n=b.target,cyc=.24;
    if(b.pause>0){b.pause-=dt;b.angle*=.8;return}
    b.pt+=dt;const ph=b.pt/cyc;b.angle=Math.sin(Math.min(1,ph)*Math.PI)*.62;
    if(!b.hit&&ph>=.5){b.hit=true;b.pecks++;n.bite=b.pecks/(b.peckN+1);n.shake=1;burst(n,2)}
    if(ph>=1){b.pt=0;b.hit=false;b.angle=0;
      if(b.pecks>=b.peckN)eat(b);else b.pause=Math.random()<.35?R(.15,.6):R(0,.08)}
  }else if(b.state==='hop'){
    b.t+=dt;const k=Math.min(1,b.t/b.hd);b.flap+=dt*30;
    b.x=b.hx+(b.tx-b.hx)*k;b.y=b.hy+(b.ty-b.hy)*k;b.alt=Math.sin(k*Math.PI)*14*b.s;b.angle=0;
    if(k>=1){b.alt=0;b.state='land';b.t=0;setLive(b.target,true)}
  }else{
    b.flap+=dt*28;b.vx*=1+dt*.8;b.vy-=dt*90;b.x+=b.vx*dt;b.y+=b.vy*dt*.4;b.alt+=-b.vy*dt*.6;
    if(b.x<-100||b.x>W+100||b.alt>900)b.dead=true;
  }
}
function ell(x,y,rx,ry,c,r){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,r||0,0,TAU);ctx.fill()}
function drawShadow(b){
  const a=Math.max(0,1-b.alt/90);if(a<=0)return;
  ctx.globalAlpha=.22*a;ell(b.x,b.y+1,12*b.s*(.6+.4*a),3.2*b.s,'#3a2410');ctx.globalAlpha=1;
}
function drawBird(b){
  const T=BIRDS[b.type],air=b.state==='fly'||b.state==='away',wingUp=air||b.state==='hop';
  ctx.save();ctx.translate(b.x,b.y-b.alt);ctx.scale(b.dir*b.s,b.s);
  ctx.rotate(air?-.12:b.angle);
  if(!air){ctx.strokeStyle='#5a3d2a';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-2,-7);ctx.lineTo(-3.5,0);ctx.lineTo(-1,0);ctx.moveTo(2,-7);ctx.lineTo(1.5,0);ctx.lineTo(4,0);ctx.stroke()}
  ctx.fillStyle=T.wing;ctx.beginPath();
  if(T.longTail){ctx.moveTo(-8,-17);ctx.lineTo(-36,-25);ctx.lineTo(-35,-19);ctx.lineTo(-8,-11)}
  else{ctx.moveTo(-8,-17);ctx.lineTo(-21,-21);ctx.lineTo(-20,-13);ctx.lineTo(-8,-11)}
  ctx.fill();
  ell(0,-14,13,9,T.body);ell(3,-11,9,5.5,T.belly);
  if(wingUp){
    const f=Math.sin(b.flap)*.95;ctx.save();ctx.translate(-1,-18);ctx.rotate(-.25-f);
    ell(-9,0,12,4.6,T.wing);if(T.patch)ell(-6,0,4,2.4,T.patch);ctx.restore();
  }else{
    ctx.save();ctx.translate(-3,-15.5);ctx.rotate(.18);ell(0,0,9.5,5.5,T.wing);
    if(T.stripe){ctx.strokeStyle=T.stripe;ctx.lineWidth=.9;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-6,i*2.2);ctx.lineTo(5,i*2.2+.6);ctx.stroke()}}
    if(T.patch)ell(1,0,4,2.4,T.patch);ctx.restore();
  }
  if(T.neck)ell(8,-18,5.2,5,T.neck);
  ell(11,-22,6.6,6.4,T.head);
  if(T.cheek)ell(11.5,-21,3.6,2.8,T.cheek);
  ell(13.4,-23.4,1.45,1.45,'#111');ell(13.8,-23.9,.5,.5,'#fff');
  ctx.fillStyle=T.beak;ctx.beginPath();ctx.moveTo(16.5,-24.2);ctx.lineTo(22.5,-21.8);ctx.lineTo(16.5,-19.8);ctx.fill();
  ctx.restore();
}

/* ---------- 루프 ---------- */
let last=performance.now(),hudTimer=0,clock=0;
const POP=.35;
function clampScroll(){scrollY=Math.max(0,Math.min(Math.max(0,worldH-H),scrollY))}
function update(dt,rdt){
  clock+=dt;
  if(appearing){
    appearT+=dt;
    while(appearIdx<nuts.length&&nuts[appearIdx].delay<=appearT){const n=nuts[appearIdx++];n.shown=true;n.popping=true;live.add(n);n.live=true}
    for(const n of live)if(n.popping&&appearT-n.delay>=POP){n.popping=false;setLive(n,false)}
    if(!userScrolled&&worldH>H&&appearIdx>0){const ty=nuts[appearIdx-1].y-H*.55;scrollY+=(ty-scrollY)*Math.min(1,rdt*4);clampScroll()}
    if(appearIdx>=nuts.length&&appearT>appearDur+POP){appearing=false;for(const n of live)if(n.popping){n.popping=false;setLive(n,false)}}
  }
  if(phase==='writing'&&started&&appearIdx>nuts.length*.15){
    elapsed+=dt;spawnTimer-=dt;
    const maxB=Math.min(capB,5+elapsed*(capB/50));
    while(spawnTimer<=0){
      if(birds.filter(b=>b.state!=='away').length<maxB)spawnBird();
      spawnTimer+=Math.max(.16*25/capB,2.6*Math.exp(-elapsed/20))*R(.6,1.4);
    }
  }
  for(const b of birds)updateBird(b,dt);
  birds=birds.filter(b=>!b.dead);
  for(const n of live)if(n.shake>0)n.shake=Math.max(0,n.shake-dt*6);
  for(const c of crumbs){c.life-=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.vz-=420*dt;if(c.z<0){c.z=0;c.vz*=-.3;c.vx*=.5;c.vy*=.5}}
  crumbs=crumbs.filter(c=>c.life>0);
  if(phase==='writing'&&alive===0&&!appearing&&birds.every(b=>b.state==='away')){
    phase='done';msg.innerHTML='모든 글자가 새들의 배 속으로 사라졌어요<small>새로운 글을 써 보세요</small>';
    msg.classList.add('show');panel.classList.remove('dim');hint.classList.remove('show');
  }
}
function render(){
  if(!ready()||!bg.width||!bg.height)return;
  flushDirty();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  for(let y=-(scrollY%TILE);y<H;y+=TILE)ctx.drawImage(bg,0,y,W,TILE);
  for(let ci=Math.max(0,Math.floor(scrollY/CH));ci<chunks.length&&ci*CH<scrollY+H;ci++)ctx.drawImage(getChunk(ci),0,ci*CH-scrollY,W,CH);
  evictChunks();
  ctx.translate(0,-scrollY);
  const y0=scrollY-80,y1=scrollY+H+80;
  for(const n of live){if(n.y<y0||n.y>y1)continue;
    let pop=1;if(n.popping){const k=Math.min(1,(appearT-n.delay)/POP);pop=1+2.2*Math.pow(k-1,3)+1.2*Math.pow(k-1,2)}
    drawNut(ctx,n,pop,clock)}
  for(const c of crumbs){ctx.globalAlpha=Math.min(1,c.life*1.5);ctx.fillStyle=c.c;ctx.fillRect(c.x-c.s/2,c.y-c.z-c.s/2,c.s,c.s)}
  ctx.globalAlpha=1;
  const vis=birds.filter(b=>b.y-b.alt>y0-40&&b.y-b.alt<y1+40).sort((a,b)=>a.y-b.y);
  for(const b of vis)drawShadow(b);
  for(const b of vis)drawBird(b);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.max(W,H)*.75);
  vg.addColorStop(0,'rgba(120,90,50,0)');vg.addColorStop(1,'rgba(120,90,50,.18)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}
function frame(now){
  const rdt=Math.min(.05,(now-last)/1000),dt=rdt*speed;last=now;
  update(dt,rdt);render();
  if((hudTimer-=rdt)<=0){hudTimer=.25;
    if(total){
      const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60);
      hudT.innerHTML=`남은 견과류 ${alive.toLocaleString()} / ${total.toLocaleString()}<br>새 ${birds.filter(b=>b.state!=='away').length}마리 · 흐른 시간 ${m}:${String(s).padStart(2,'0')}`;
      barI.style.width=(alive/total*100)+'%';
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- 크기 조정 / 입력 ---------- */
function resize(){
  const oW=W,oH=H;DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);drawBg();
  if(oW&&oW!==W){const dx=(W-oW)/2;
    for(const n of nuts)n.x+=dx;
    for(const b of birds){b.x+=dx;b.tx+=dx;if(b.hx!==undefined)b.hx+=dx}
    for(const c of crumbs)c.x+=dx;buildGrid()}
  if(!ready())return;
  worldH=Math.max(worldH,H);buildChunks();clampScroll();
  if(pendingText)writeText(pendingText);
  else if(lastText&&phase==='writing'&&alive===total&&(Math.abs(W-oW)>40||Math.abs(H-oH)>40))writeText(lastText);
}
if(window.ResizeObserver)new ResizeObserver(()=>{if(innerWidth!==W||innerHeight!==H)resize()}).observe(document.documentElement);
setInterval(()=>{if(innerWidth!==W||innerHeight!==H)resize()},500);
addEventListener('error',e=>{msg.innerHTML='오류: '+(e.message||e)+'<small>새로고침해 보세요</small>';msg.classList.add('show')});
addEventListener('resize',resize);
cv.addEventListener('wheel',e=>{e.preventDefault();scrollY+=e.deltaY;userScrolled=true;clampScroll()},{passive:false});
let drag=null;
cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,s:scrollY,moved:false};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag)return;const dy=e.clientY-drag.y;
  if(Math.abs(dy)>8||Math.abs(e.clientX-drag.x)>8)drag.moved=true;
  if(drag.moved&&worldH>H){scrollY=drag.s-dy;userScrolled=true;clampScroll()}});
cv.addEventListener('pointerup',e=>{
  if(drag&&!drag.moved&&!started){drag=null;startBirds();return}
  if(drag&&!drag.moved){const px=e.clientX,py=e.clientY+scrollY;
    for(const b of birds){if(b.state==='away')continue;if(Math.hypot(b.x-px,b.y-b.alt-py)<170)flyAway(b,b.x>=px?1:-1)}}
  drag=null;
});
addEventListener('keydown',e=>{if(document.activeElement===txt)return;
  if(e.key==='ArrowDown'||e.key==='PageDown'){scrollY+=e.key==='PageDown'?H*.8:60;userScrolled=true;clampScroll()}
  if(e.key==='ArrowUp'||e.key==='PageUp'){scrollY-=e.key==='PageUp'?H*.8:60;userScrolled=true;clampScroll()}});
panel.addEventListener('submit',e=>{e.preventDefault();const v=txt.value;if(v.trim()){writeText(v);txt.value='';onInput();txt.blur()}});
txt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();panel.requestSubmit()}});
function onInput(){cnt.textContent=`${txt.value.length} / 2000`;txt.style.height='52px';txt.style.height=Math.min(150,Math.max(52,txt.scrollHeight))+'px'}
txt.addEventListener('input',onInput);
spd.addEventListener('change',()=>speed=+spd.value);
const fsz=document.getElementById('fsz'),fszV=document.getElementById('fszV');
function setScale(pct){pct=Math.max(50,Math.min(200,Math.round(pct/10)*10||100));fontScale=pct/100;fsz.value=pct;fszV.textContent=pct+'%'}
fsz.addEventListener('input',()=>fszV.textContent=fsz.value+'%');
fsz.addEventListener('change',()=>{setScale(+fsz.value);if(lastText)writeText(lastText)});

/* ---------- 시작 / 공유 ---------- */
const startTip=document.getElementById('startTip'),startFrom=document.getElementById('startFrom');
const shareBox=document.getElementById('shareBox'),shareLink=document.getElementById('shareLink'),shareNote=document.getElementById('shareNote');
const nativeBtn=document.getElementById('nativeBtn');
function startBirds(){started=true;startTip.classList.add('hide')}
// 글을 주소(#t=...) 안에 담기: UTF-8 → (가능하면 deflate 압축) → base64url
function b64u(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(str){const s=atob(str.replace(/-/g,'+').replace(/_/g,'/'));const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b}
async function pipe(bytes,stream){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())}
async function encodeText(text){
  const raw=new TextEncoder().encode(text);
  if(window.CompressionStream){try{const z=await pipe(raw,new CompressionStream('deflate-raw'));if(z.length<raw.length)return 'z'+b64u(z)}catch(e){}}
  return 'u'+b64u(raw);
}
async function decodeText(code){
  const kind=code[0],bytes=unb64u(code.slice(1));
  return new TextDecoder().decode(kind==='z'?await pipe(bytes,new DecompressionStream('deflate-raw')):bytes);
}
async function readShared(){
  const m=location.hash.match(/^#t=([A-Za-z0-9_-]+)(?:&f=(\d+))?$/);if(!m)return null;
  if(m[2])setScale(+m[2]);
  const t=(await decodeText(m[1])).slice(0,2000).trim();return t||null;
}
async function openShare(){
  if(!lastText)return;
  const pct=Math.round(fontScale*100);
  const url=location.href.split('#')[0]+'#t='+await encodeText(lastText)+(pct!==100?'&f='+pct:'');
  try{history.replaceState(null,'',url)}catch(e){}
  shareLink.value=url;shareNote.textContent='';
  nativeBtn.hidden=!navigator.share;
  shareBox.hidden=false;shareLink.focus();shareLink.select();
}
document.getElementById('shareBtn').addEventListener('click',openShare);
const origPanel=document.getElementById('origPanel'),origBtn=document.getElementById('origBtn'),origText=document.getElementById('origText'),origInfo=document.getElementById('origInfo'),origNote=document.getElementById('origNote');
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('click',e=>{if(e.target===m||e.target.hasAttribute('data-close'))m.hidden=true});
});
addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal').forEach(m=>m.hidden=true);showOrig(false)}});
function fillOrig(){
  origText.textContent=lastText;
  const left=total?Math.round(alive/total*100):100;
  origInfo.textContent=`${[...lastText].length.toLocaleString()}자 · 새들이 ${100-left}% 먹었어요 ·`;
}
function showOrig(v){
  if(v&&!lastText)return;
  origPanel.hidden=!v;origBtn.classList.toggle('on',v);origBtn.textContent=v?'🥜 견과류':'📜 원문';
  if(v){origNote.textContent='';fillOrig()}
}
origBtn.addEventListener('click',()=>showOrig(origPanel.hidden));
window.__fillOrig=()=>{if(!origPanel.hidden)setTimeout(fillOrig,0)};
setInterval(()=>{if(!origPanel.hidden)fillOrig()},1000);
document.getElementById('origCopy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(lastText);origNote.textContent='복사했어요!'}
  catch(e){const r=document.createRange();r.selectNodeContents(origText);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);origNote.textContent='선택된 글을 Ctrl+C로 복사해 주세요'}
});
document.getElementById('copyBtn').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(shareLink.value);shareNote.textContent='링크를 복사했어요!'}
  catch(e){shareLink.select();shareNote.textContent='복사가 막혀 있어요. 위 링크를 직접 복사해 주세요 (Ctrl+C).'}
});
nativeBtn.addEventListener('click',async()=>{
  try{await navigator.share({title:'모이글',text:'새들이 쪼아먹기 전에 내 글을 봐 주세요 🥜🐦',url:shareLink.value})}catch(e){}
});
document.getElementById('imgBtn').addEventListener('click',()=>{
  const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const g=c.getContext('2d');
  g.drawImage(cv,0,0);g.scale(DPR,DPR);
  g.font="700 15px 'Noto Sans KR',sans-serif";g.textAlign='right';g.fillStyle='rgba(59,42,26,.7)';
  g.fillText('🥜 모이글 · 남은 견과류 '+alive.toLocaleString()+' / '+total.toLocaleString(),W-16,H-14);
  c.toBlob(blob=>{
    if(!blob){shareNote.textContent='이미지를 만들지 못했어요.';return}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='moigeul.png';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    shareNote.textContent='이미지를 저장했어요. (미리보기 창 안에서는 저장이 막힐 수 있어요)';
  },'image/png');
});
addEventListener('hashchange',async()=>{const t=await readShared().catch(()=>null);if(t&&t!==lastText){startFrom.textContent='누군가 남긴 글이에요';writeText(t)}});

resize();
const start=async()=>{let t=null;try{t=await readShared()}catch(e){}
  if(t){startFrom.textContent='누군가 남긴 글이에요';}
  writeText(t||'안녕, 새들아');requestAnimationFrame(t=>{last=t;frame(t)})};
(document.fonts&&document.fonts.load)?Promise.race([document.fonts.load(FONT(100),'안녕가'),new Promise(r=>setTimeout(r,1500))]).then(start,start):start();
})();

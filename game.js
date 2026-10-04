(() => {
'use strict';

const TITLE = 'STARJUNK';
const TAGLINE = 'Build it from scrap. Survive what finds you.';
const $ = id => document.getElementById(id);
$('gameTitle').textContent = TITLE;
$('tagline').textContent = TAGLINE;
document.title = TITLE;

const screens = [...document.querySelectorAll('.screen')];
function showScreen(id){ screens.forEach(s=>s.classList.toggle('active', s.id===id)); }
function showOverlay(id,show=true){ $(id).classList.toggle('hidden',!show); }

document.querySelectorAll('.backBtn').forEach(b=>b.addEventListener('click',()=>showScreen('menu')));
$('openPrivate').onclick=()=>showScreen('privateScreen');
$('openSettings').onclick=()=>showScreen('settingsScreen');
$('openHow').onclick=()=>showScreen('howScreen');

const save = JSON.parse(localStorage.getItem('starjunkSave')||'{}');
let settings = Object.assign({music:100,sfx:100,shake:70,damage:true,contrast:false,bestWave:0,bestScore:0}, save.settings||{});
function persist(){ localStorage.setItem('starjunkSave',JSON.stringify({settings})); updateBest(); }
function updateBest(){ $('bestLine').textContent = `Best wave ${settings.bestWave||0} · Best score ${(settings.bestScore||0).toLocaleString()}`; }
updateBest();

for (const [id,key,suffix] of [['musicVolume','music','%'],['sfxVolume','sfx','%'],['shakeAmount','shake','%']]){
  $(id).value=settings[key]; $(id.replace('Volume','Value').replace('Amount','Value')).textContent=settings[key]+suffix;
  $(id).addEventListener('input',e=>{ settings[key]=+e.target.value; $(id.replace('Volume','Value').replace('Amount','Value')).textContent=settings[key]+suffix; persist(); if(key==='music') audio.setMusic(); });
}
$('damageNumbers').checked=settings.damage; $('highContrast').checked=settings.contrast;
$('damageNumbers').onchange=e=>{settings.damage=e.target.checked;persist()};
$('highContrast').onchange=e=>{settings.contrast=e.target.checked;document.body.classList.toggle('high-contrast',settings.contrast);persist()};
document.body.classList.toggle('high-contrast',settings.contrast);

const audio = {
  ctx:null, master:null, musicGain:null, timer:null, step:0,
  init(){ if(this.ctx) return; this.ctx=new (window.AudioContext||window.webkitAudioContext)(); this.master=this.ctx.createGain(); this.musicGain=this.ctx.createGain(); this.musicGain.connect(this.master); this.master.connect(this.ctx.destination); this.setMusic(); this.startMusic(); },
  setMusic(){ if(!this.musicGain) return; this.musicGain.gain.value=Math.min(1.8, settings.music/100*0.12); },
  tone(freq,dur=.08,type='square',gain=.06,when=0){ if(!this.ctx) return; const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=Math.min(1.5,gain*(settings.sfx/100));o.connect(g);g.connect(this.master);const t=this.ctx.currentTime+when;g.gain.setValueAtTime(g.gain.value,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.start(t);o.stop(t+dur); },
  hit(){this.tone(85,.05,'sawtooth',.045)}, shoot(){this.tone(240,.035,'square',.025)}, scrap(){this.tone(720,.05,'triangle',.035);this.tone(980,.04,'triangle',.02,.035)}, dash(){this.tone(150,.14,'sawtooth',.04)}, upgrade(){this.tone(440,.08,'triangle',.04);this.tone(660,.12,'triangle',.035,.07)}, boss(){this.tone(55,.5,'sawtooth',.06);},
  startMusic(){ if(this.timer) return; const seq=[110,0,165,220,0,196,147,0,110,165,247,0,220,196,165,147]; this.timer=setInterval(()=>{ if(!this.ctx||this.ctx.state==='suspended')return;const f=seq[this.step++%seq.length];if(!f)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='triangle';o.frequency.value=f;g.gain.value=.6;o.connect(g);g.connect(this.musicGain);const t=this.ctx.currentTime;g.gain.setValueAtTime(.55,t);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.start(t);o.stop(t+.3);},220); }
};

const canvas=$('game'), ctx=canvas.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();

const rand=(a,b)=>Math.random()*(b-a)+a, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let game=null, keys={}, mouse={x:0,y:0,down:false};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' '){e.preventDefault();dash()}});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
canvas.addEventListener('pointerdown',e=>{mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY});
addEventListener('pointerup',()=>mouse.down=false);

const joystick={active:false,id:null,dx:0,dy:0,cx:0,cy:0};
const stick=$('joystick'), knob=stick.querySelector('.knob');
stick.addEventListener('pointerdown',e=>{joystick.active=true;joystick.id=e.pointerId;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();joystick.cx=r.left+r.width/2;joystick.cy=r.top+r.height/2;moveStick(e)});
stick.addEventListener('pointermove',e=>{if(joystick.active&&e.pointerId===joystick.id)moveStick(e)});
stick.addEventListener('pointerup',e=>{if(e.pointerId===joystick.id)resetStick()});
stick.addEventListener('pointercancel',resetStick);
function moveStick(e){let dx=e.clientX-joystick.cx,dy=e.clientY-joystick.cy;const m=Math.hypot(dx,dy)||1,lim=38;if(m>lim){dx=dx/m*lim;dy=dy/m*lim}joystick.dx=dx/lim;joystick.dy=dy/lim;knob.style.transform=`translate(${dx}px,${dy}px)`}
function resetStick(){joystick.active=false;joystick.dx=joystick.dy=0;knob.style.transform='translate(0,0)'}

let mobileAim={active:false,angle:0};
$('aimPad').addEventListener('pointerdown',e=>{mobileAim.active=true;updateAim(e);$('aimPad').setPointerCapture(e.pointerId)});
$('aimPad').addEventListener('pointermove',e=>{if(mobileAim.active)updateAim(e)});
$('aimPad').addEventListener('pointerup',()=>mobileAim.active=false);
function updateAim(e){if(!game)return;mobileAim.angle=Math.atan2(e.clientY-game.player.y,e.clientX-game.player.x)}
$('fireBtn').addEventListener('pointerdown',()=>{mouse.down=true}); $('fireBtn').addEventListener('pointerup',()=>mouse.down=false); $('fireBtn').addEventListener('pointercancel',()=>mouse.down=false);
$('dashBtn').onclick=dash;

function newPlayer(){return {x:W/2,y:H/2,r:19,hp:100,maxHp:100,speed:210,fireRate:.23,fireCd:0,bulletSpeed:520,damage:16,spread:0,dashCd:0,dashMax:2.2,dashPower:420,inv:0,armor:0,magnet:85,crit:.06,shotCount:1,pierce:0,orbiters:0,regen:0};}
function startRun(mode,bots=0,room=''){audio.init();showScreen('gameScreen');showOverlay('gameOverScreen',false);showOverlay('pauseScreen',false);showOverlay('upgradeScreen',false);game={mode,bots,room,player:newPlayer(),enemies:[],bullets:[],enemyBullets:[],scraps:[],particles:[],floaters:[],allies:[],wave:0,score:0,scrap:0,kills:0,spawnLeft:0,spawnTimer:0,between:false,paused:false,time:0,shake:0,boss:null,selectedUpgrades:0};for(let i=0;i<bots;i++) game.allies.push(makeAlly(i));nextWave();chatSystem.reset();last=performance.now();requestAnimationFrame(loop)}
$('playSolo').onclick=()=>startRun('solo',0);
$('playBots').onclick=()=>startRun('crew',2);
$('startPrivate').onclick=()=>{const code=$('roomCode').value.trim();let bots=+$('botCount').value; if(code.length>=5) bots=Math.max(0,bots); startRun('private',bots,code)};

function makeAlly(i){const names=['Mica','Rook','Patch','Vanta'];return{x:W/2+rand(-70,70),y:H/2+rand(-70,70),r:15,hp:70,maxHp:70,speed:155,fireCd:rand(0,.5),name:names[i%names.length],tone:i};}

const enemyTypes={
  scout:{r:13,hp:25,speed:95,damage:11,color:'#ff8a7a',scrap:[1,3]},
  rammer:{r:19,hp:64,speed:75,damage:22,color:'#ffc66d',scrap:[2,5]},
  gunner:{r:16,hp:46,speed:55,damage:9,color:'#bf8cff',scrap:[2,4],shoot:true},
  splitter:{r:18,hp:56,speed:68,damage:13,color:'#70c9ff',scrap:[2,5],split:true}
};
function spawnEnemy(type, x=null,y=null,scale=1){const t=enemyTypes[type];if(x==null){const edge=Math.floor(rand(0,4)); if(edge===0){x=rand(0,W);y=-40}else if(edge===1){x=W+40;y=rand(0,H)}else if(edge===2){x=rand(0,W);y=H+40}else{x=-40;y=rand(0,H)}} const mult=1+(game.wave-1)*.08;game.enemies.push({type,x,y,r:t.r*scale,hp:t.hp*mult*scale,maxHp:t.hp*mult*scale,speed:t.speed*(1+game.wave*.012),damage:t.damage,color:t.color,shootCd:rand(.5,1.6),scale,flash:0});}
function spawnBoss(){const hp=650+game.wave*105;game.boss={name:game.wave%10===0?'THE WARDEN':'SCRAP TITAN',x:W/2,y:-90,r:48,hp,maxHp:hp,speed:48,angle:0,shootCd:1.2,burstCd:4.5,flash:0};$('bossName').textContent=game.boss.name;$('bossBar').classList.remove('hidden');audio.boss();announce(game.boss.name)}

function nextWave(){game.wave++;game.between=false;game.selectedUpgrades=0;game.spawnLeft=5+Math.floor(game.wave*2.6);game.spawnTimer=.3;announce(`WAVE ${game.wave}`);$('waveText').textContent=game.wave;if(game.wave%5===0) setTimeout(()=>{if(game&&!game.paused&&!game.between)spawnBoss()},900);}
function announce(t){const m=$('message');m.textContent=t;m.style.opacity=1;clearTimeout(announce.t);announce.t=setTimeout(()=>m.style.opacity=0,1200)}

function shoot(from,angle,enemy=false,damage=null,speed=null){const arr=enemy?game.enemyBullets:game.bullets;arr.push({x:from.x+Math.cos(angle)*(from.r+4),y:from.y+Math.sin(angle)*(from.r+4),vx:Math.cos(angle)*(speed||game.player.bulletSpeed),vy:Math.sin(angle)*(speed||game.player.bulletSpeed),r:enemy?5:4,life:2.2,damage:damage??game.player.damage,pierce:enemy?0:game.player.pierce,enemy});if(!enemy)audio.shoot();}
function playerShoot(){const p=game.player;if(p.fireCd>0)return;let angle;if(mobileAim.active)angle=mobileAim.angle;else if(mouse.down)angle=Math.atan2(mouse.y-p.y,mouse.x-p.x);else{const e=nearestEnemy(p,520);if(!e)return;angle=Math.atan2(e.y-p.y,e.x-p.x)}p.fireCd=p.fireRate;const count=p.shotCount;for(let i=0;i<count;i++){const off=(i-(count-1)/2)*.12+rand(-p.spread,p.spread);shoot(p,angle+off)} }
function nearestEnemy(p,max=9999){let best=null,bd=max;for(const e of game.enemies){const d=dist(p,e);if(d<bd){bd=d;best=e}}if(game.boss){const d=dist(p,game.boss);if(d<bd)best=game.boss}return best}

function dash(){if(!game||game.paused||game.between)return;const p=game.player;if(p.dashCd>0)return;let dx=joystick.dx+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=joystick.dy+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let m=Math.hypot(dx,dy);if(m<.2){const a=mobileAim.active?mobileAim.angle:Math.atan2(mouse.y-p.y,mouse.x-p.x);dx=Math.cos(a);dy=Math.sin(a);m=1}p.x=clamp(p.x+dx/m*p.dashPower,30,W-30);p.y=clamp(p.y+dy/m*p.dashPower,30,H-30);p.inv=.5;p.dashCd=p.dashMax;game.shake=10;audio.dash();burst(p.x,p.y,'#7df1b7',18)}

function damagePlayer(amount){const p=game.player;if(p.inv>0)return;amount=Math.max(1,amount-p.armor);p.hp-=amount;p.inv=.35;game.shake=Math.max(game.shake,7);audio.hit();if(settings.damage) floater(p.x,p.y-28,`-${Math.ceil(amount)}`,'#ff8b8b');if(p.hp<=0)endGame()}
function damageEnemy(e,amount){if(Math.random()<game.player.crit)amount*=2;e.hp-=amount;e.flash=.08;if(settings.damage)floater(e.x,e.y-18,Math.round(amount),amount>game.player.damage*1.5?'#ffe27d':'#fff');if(e.hp<=0)killEnemy(e)}
function killEnemy(e){const idx=game.enemies.indexOf(e);if(idx>=0)game.enemies.splice(idx,1);const t=enemyTypes[e.type];const n=Math.floor(rand(t.scrap[0],t.scrap[1]+1));for(let i=0;i<n;i++)game.scraps.push({x:e.x+rand(-8,8),y:e.y+rand(-8,8),vx:rand(-70,70),vy:rand(-70,70),r:5,value:1});if(e.type==='splitter'&&e.scale>.65){for(let i=0;i<2;i++)spawnEnemy('scout',e.x+rand(-12,12),e.y+rand(-12,12),.7)}game.score+=Math.floor(12+game.wave*2);game.kills++;burst(e.x,e.y,e.color,8)}
function killBoss(){game.score+=800+game.wave*80;game.scrap+=35+game.wave*2;burst(game.boss.x,game.boss.y,'#ffe27d',60);game.boss=null;$('bossBar').classList.add('hidden');announce('BOSS DOWN');}

function burst(x,y,color,n=10){for(let i=0;i<n;i++)game.particles.push({x,y,vx:rand(-160,160),vy:rand(-160,160),life:rand(.25,.8),max:1,color,size:rand(2,6)})}
function floater(x,y,text,color){game.floaters.push({x,y,text,color,life:.65})}

function update(dt){if(!game||game.paused||game.between)return;const g=game,p=g.player;g.time+=dt;p.fireCd=Math.max(0,p.fireCd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.inv=Math.max(0,p.inv-dt);if(p.regen>0&&p.hp>0)p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);
  let dx=joystick.dx+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=joystick.dy+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}p.x=clamp(p.x+dx*p.speed*dt,24,W-24);p.y=clamp(p.y+dy*p.speed*dt,24,H-24);
  if(mouse.down||mobileAim.active||nearestEnemy(p,500))playerShoot();
  if(g.spawnLeft>0 && !g.boss){g.spawnTimer-=dt;if(g.spawnTimer<=0){const roll=Math.random();let type='scout';if(g.wave>=2&&roll>.55)type='rammer';if(g.wave>=3&&roll>.74)type='gunner';if(g.wave>=4&&roll>.88)type='splitter';spawnEnemy(type);g.spawnLeft--;g.spawnTimer=Math.max(.18,.75-g.wave*.025)}}
  updateEnemies(dt);updateBoss(dt);updateBullets(dt);updateScrap(dt);updateAllies(dt);updateParticles(dt);chatSystem.update(dt);
  if(!g.boss && g.spawnLeft===0 && g.enemies.length===0){openWorkbench()}
  $('hpText').textContent=Math.ceil(p.hp);$('scrapText').textContent=g.scrap;$('waveText').textContent=g.wave;
}

function updateEnemies(dt){const p=game.player;for(const e of [...game.enemies]){e.flash=Math.max(0,e.flash-dt);let tx=p.x,ty=p.y;if(game.allies.length&&Math.random()<.22){const a=game.allies[Math.floor(Math.random()*game.allies.length)];tx=a.x;ty=a.y}let a=Math.atan2(ty-e.y,tx-e.x),d=Math.hypot(tx-e.x,ty-e.y);if(enemyTypes[e.type].shoot){if(d>230){e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt}else if(d<160){e.x-=Math.cos(a)*e.speed*.5*dt;e.y-=Math.sin(a)*e.speed*.5*dt}e.shootCd-=dt;if(e.shootCd<=0&&d<430){shoot(e,a,true,e.damage,250);e.shootCd=rand(1.1,1.8)}}else{e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt}if(dist(e,p)<e.r+p.r)damagePlayer(e.damage*dt*2.4)}}
function updateBoss(dt){const b=game.boss;if(!b)return;b.flash=Math.max(0,b.flash-dt);const p=game.player,a=Math.atan2(p.y-b.y,p.x-b.x),d=dist(b,p);if(d>185){b.x+=Math.cos(a)*b.speed*dt;b.y+=Math.sin(a)*b.speed*dt}b.angle+=dt;b.shootCd-=dt;b.burstCd-=dt;if(b.shootCd<=0){for(let i=-1;i<=1;i++)shoot(b,a+i*.16,true,12+game.wave*.6,290);b.shootCd=.9}if(b.burstCd<=0){for(let i=0;i<14;i++)shoot(b,i/14*Math.PI*2,true,9+game.wave*.45,220);b.burstCd=4.2}if(d<b.r+p.r)damagePlayer(30*dt);$('bossFill').style.width=Math.max(0,b.hp/b.maxHp*100)+'%'}
function updateBullets(dt){for(const b of [...game.bullets]){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let remove=b.life<=0||b.x<-30||b.x>W+30||b.y<-30||b.y>H+30;if(!remove){for(const e of [...game.enemies]){if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){damageEnemy(e,b.damage);if(b.pierce>0)b.pierce--;else{remove=true;break}}}if(!remove&&game.boss&&Math.hypot(b.x-game.boss.x,b.y-game.boss.y)<b.r+game.boss.r){game.boss.hp-=b.damage;game.boss.flash=.08;if(settings.damage)floater(game.boss.x,game.boss.y-50,Math.round(b.damage),'#fff');remove=true;if(game.boss.hp<=0)killBoss()}}if(remove)game.bullets.splice(game.bullets.indexOf(b),1)}
  for(const b of [...game.enemyBullets]){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let remove=b.life<=0;if(Math.hypot(b.x-game.player.x,b.y-game.player.y)<b.r+game.player.r){damagePlayer(b.damage);remove=true}else{for(const a of game.allies){if(Math.hypot(b.x-a.x,b.y-a.y)<b.r+a.r){a.hp-=b.damage;remove=true;break}}}if(remove)game.enemyBullets.splice(game.enemyBullets.indexOf(b),1)}}
function updateScrap(dt){const p=game.player;for(const s of [...game.scraps]){s.vx*=.96;s.vy*=.96;s.x+=s.vx*dt;s.y+=s.vy*dt;const d=dist(s,p);if(d<p.magnet){const a=Math.atan2(p.y-s.y,p.x-s.x),pull=(1-d/p.magnet)*650;s.vx+=Math.cos(a)*pull*dt;s.vy+=Math.sin(a)*pull*dt}if(d<p.r+9){game.scrap+=s.value;audio.scrap();game.scraps.splice(game.scraps.indexOf(s),1)}}}
function updateAllies(dt){for(const a of game.allies){if(a.hp<=0)continue;const p=game.player;const da=dist(a,p);let target=nearestEnemy(a,600);if(target){const ang=Math.atan2(target.y-a.y,target.x-a.x),d=dist(a,target);if(d>170){a.x+=Math.cos(ang)*a.speed*dt;a.y+=Math.sin(ang)*a.speed*dt}a.fireCd-=dt;if(a.fireCd<=0){game.bullets.push({x:a.x,y:a.y,vx:Math.cos(ang)*460,vy:Math.sin(ang)*460,r:4,life:2,damage:9+game.wave*.25,pierce:0,enemy:false});a.fireCd=.55}}else if(da>90){const ang=Math.atan2(p.y-a.y,p.x-a.x);a.x+=Math.cos(ang)*a.speed*dt;a.y+=Math.sin(ang)*a.speed*dt}a.x=clamp(a.x,20,W-20);a.y=clamp(a.y,20,H-20)}}
function updateParticles(dt){for(const p of [...game.particles]){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;if(p.life<=0)game.particles.splice(game.particles.indexOf(p),1)}for(const f of [...game.floaters]){f.y-=35*dt;f.life-=dt;if(f.life<=0)game.floaters.splice(game.floaters.indexOf(f),1)}}

const upgrades=[
  {name:'Reinforced Hull',desc:'+25 max HP and repair 25 HP.',base:12,apply:p=>{p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+25)}},
  {name:'Overclocked Cannon',desc:'Fire 14% faster.',base:14,apply:p=>p.fireRate=Math.max(.07,p.fireRate*.86)},
  {name:'Heavy Rounds',desc:'+7 bullet damage.',base:16,apply:p=>p.damage+=7},
  {name:'Twin Mount',desc:'+1 projectile per shot.',base:28,apply:p=>p.shotCount=Math.min(5,p.shotCount+1)},
  {name:'Thruster Pack',desc:'+24 movement speed.',base:12,apply:p=>p.speed+=24},
  {name:'Magnetic Intake',desc:'+45 scrap pickup range.',base:10,apply:p=>p.magnet+=45},
  {name:'Impact Plating',desc:'Reduce contact and bullet damage.',base:20,apply:p=>p.armor+=1.7},
  {name:'Phase Dash',desc:'Dash cooldown reduced by 18%.',base:18,apply:p=>p.dashMax=Math.max(.7,p.dashMax*.82)},
  {name:'Piercing Core',desc:'Bullets pierce one extra target.',base:26,apply:p=>p.pierce=Math.min(4,p.pierce+1)},
  {name:'Repair Nanites',desc:'Slowly regenerate hull integrity.',base:30,apply:p=>p.regen+=1.2},
  {name:'Critical Relay',desc:'+6% critical hit chance.',base:18,apply:p=>p.crit=Math.min(.5,p.crit+.06)},
  {name:'Emergency Repair',desc:'Restore 55 HP immediately.',base:8,apply:p=>p.hp=Math.min(p.maxHp,p.hp+55)}
];
function openWorkbench(){if(game.between)return;game.between=true;game.enemyBullets.length=0;const opts=[...upgrades].sort(()=>Math.random()-.5).slice(0,6);const wrap=$('upgradeOptions');wrap.innerHTML='';$('upgradeScrap').textContent=game.scrap;$('upgradeTitle').textContent=`Wave ${game.wave} cleared`;for(const up of opts){const cost=Math.floor(up.base*(1+game.wave*.06));const b=document.createElement('button');b.className='upgrade'+(game.scrap<cost?' locked':'');b.innerHTML=`<strong>${up.name}</strong><small>${up.desc}</small><span class="price">${cost} scrap</span>`;b.onclick=()=>{if(game.scrap<cost)return;game.scrap-=cost;up.apply(game.player);audio.upgrade();game.selectedUpgrades++;$('upgradeScrap').textContent=game.scrap;b.disabled=true;b.classList.add('locked');chatSystem.sayUpgrade(up.name)};wrap.appendChild(b)}showOverlay('upgradeScreen',true)}
$('continueWave').onclick=()=>{if(!game)return;showOverlay('upgradeScreen',false);nextWave()};

const chatSystem={t:0,reset(){this.t=rand(4,7);$('crewChat').innerHTML=''},update(dt){if(!game||!game.allies.length)return;this.t-=dt;if(this.t<=0){this.t=rand(5,10);const lines=game.player.hp<35?['Hull is getting shredded.','Fall back toward me.','That health bar is NOT looking good.']:game.wave%5===0?['Big contact incoming.','That thing is huge.','Focus fire. No hero moves.']:['I found a clean angle.','Scrap on your left.','Keeping the lane clear.','This run is actually cooking.','I am absolutely stealing that upgrade next time.'];this.say(lines[Math.floor(Math.random()*lines.length)])}},say(text){const live=game.allies.filter(a=>a.hp>0);if(!live.length)return;const a=live[Math.floor(Math.random()*live.length)],div=document.createElement('div');div.className='chatline';div.innerHTML=`<b>${a.name}:</b> ${text}`;$('crewChat').appendChild(div);while($('crewChat').children.length>4)$('crewChat').firstChild.remove();setTimeout(()=>div.remove(),6500)},sayUpgrade(name){if(game.allies.length)this.say(`Installing ${name}. Nice.`)}};

function draw(){if(!game)return;ctx.save();let sx=0,sy=0;if(game.shake>0){const amt=game.shake*(settings.shake/100);sx=rand(-amt,amt);sy=rand(-amt,amt);game.shake*=.84}ctx.translate(sx,sy);ctx.fillStyle='#070a0f';ctx.fillRect(-20,-20,W+40,H+40);drawGrid();
  for(const s of game.scraps){ctx.fillStyle='#ffd66e';ctx.fillRect(s.x-4,s.y-4,8,8)}
  for(const b of game.bullets){ctx.fillStyle='#dfffee';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}
  for(const b of game.enemyBullets){ctx.fillStyle='#ff7c7c';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}
  for(const e of game.enemies)drawEnemy(e);
  if(game.boss)drawBoss(game.boss);
  for(const a of game.allies)drawAlly(a);
  drawPlayer(game.player);
  for(const p of game.particles){ctx.globalAlpha=clamp(p.life/.6,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);ctx.globalAlpha=1}
  ctx.font='900 14px system-ui';ctx.textAlign='center';for(const f of game.floaters){ctx.globalAlpha=clamp(f.life/.65,0,1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1}ctx.restore()}
function drawGrid(){const size=54,ox=(-game.time*12)%size,oy=(game.time*5)%size;ctx.strokeStyle='rgba(118,144,173,.07)';ctx.lineWidth=1;for(let x=ox-size;x<W+size;x+=size){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=oy-size;y<H+size;y+=size){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}for(let i=0;i<28;i++){const x=(i*193)%W,y=(i*311)%H;ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x,y,1,1)}}
function drawPlayer(p){ctx.save();ctx.translate(p.x,p.y);if(p.inv>0)ctx.globalAlpha=.55+.45*Math.sin(game.time*35);ctx.rotate(game.time*.8);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillStyle='#1d2a38';ctx.fillRect(13,-5,13,10)}ctx.rotate(-game.time*.8-2*Math.PI);ctx.fillStyle='#7df1b7';ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#08100d';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawAlly(a){if(a.hp<=0)return;ctx.save();ctx.translate(a.x,a.y);ctx.fillStyle='#6b8cff';ctx.beginPath();ctx.arc(0,0,a.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.stroke();ctx.restore();ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(a.x-18,a.y-26,36,4);ctx.fillStyle='#7df1b7';ctx.fillRect(a.x-18,a.y-26,36*(a.hp/a.maxHp),4)}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.flash>0?'#fff':e.color;if(e.type==='rammer'){ctx.rotate(game.time*1.5);ctx.fillRect(-e.r,-e.r,e.r*2,e.r*2)}else if(e.type==='gunner'){ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=i%2?e.r*.7:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill()}else{ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill()}ctx.restore()}
function drawBoss(b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);ctx.fillStyle=b.flash>0?'#fff':'#ff7272';for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.fillRect(24,-6,34,12)}ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#220c10';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.restore()}

let last=performance.now();function loop(t){if(!game)return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();if(game)requestAnimationFrame(loop)}

function endGame(){if(!game)return;game.paused=true;const score=Math.floor(game.score+game.wave*100+game.kills*5);settings.bestWave=Math.max(settings.bestWave,game.wave);settings.bestScore=Math.max(settings.bestScore,score);persist();$('gameOverTitle').textContent=game.wave>=10?'Legendary Wreck':'System Failure';$('gameOverStats').textContent=`Wave ${game.wave} · ${game.kills} destroyed · ${game.scrap} scrap · ${score.toLocaleString()} score`;showOverlay('gameOverScreen',true)}
function quit(){game=null;showOverlay('pauseScreen',false);showOverlay('upgradeScreen',false);showOverlay('gameOverScreen',false);showScreen('menu');$('bossBar').classList.add('hidden');}
$('retryBtn').onclick=()=>{const m=game?.mode||'solo',b=game?.bots||0,r=game?.room||'';game=null;startRun(m,b,r)};$('menuBtn').onclick=quit;$('quitBtn').onclick=quit;
$('pauseBtn').onclick=()=>{if(!game)return;game.paused=true;showOverlay('pauseScreen',true)};$('resumeBtn').onclick=()=>{if(!game)return;game.paused=false;showOverlay('pauseScreen',false);last=performance.now()};
$('pauseSettings').onclick=()=>{showOverlay('pauseScreen',false);showScreen('settingsScreen')};

// Resume safely if settings were opened from a paused run.
document.querySelectorAll('#settingsScreen .backBtn').forEach(b=>b.addEventListener('click',()=>{if(game){showScreen('gameScreen');showOverlay('pauseScreen',true)}}));

document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&!game.between){game.paused=true;showOverlay('pauseScreen',true)}});
})();

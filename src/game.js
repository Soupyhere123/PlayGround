import * as THREE from '../vendor/three.module.js';

const $ = (id) => document.getElementById(id);
const sceneCanvas = $('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080908);
scene.fog = new THREE.FogExp2(0x090b0a, 0.035);
const camera = new THREE.PerspectiveCamera(73, innerWidth / innerHeight, 0.08, 90);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ canvas: sceneCanvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const world = new THREE.Group(); scene.add(world);
const clock = new THREE.Clock();
const player = { x: 0, z: 11, yaw: 0, pitch: 0, vx: 0, vz: 0, moving: false, started: false, locked: false, loop: 0, items: new Set(), ending: false, passed: 0 };
const held = new Set();
const items = [
  { id: 'photograph', label: 'THE PHOTOGRAPH', name: 'A rain-stained photograph', color: 0x9d7850, line: 'Mara at the front steps. Someone has scratched your face out.' },
  { id: 'key', label: 'THE BRASS KEY', name: 'A cold brass key', color: 0xc3a05f, line: 'The teeth are worn smooth. It has been turned a thousand times.' },
  { id: 'tape', label: 'THE CASSETTE', name: 'A cassette marked HOME', color: 0x76877b, line: 'The tape is still warm. You hear someone breathing on the other side.' },
];
const lines = [
  'Eleanor? You found the house. I knew you would. Don’t trust the windows.',
  'This is the hall from the night we left. But the door was never this far away.',
  'You used to count the floorboards with me. One, two, three… there were always too many.',
  'I can hear you outside. I am right behind the red door. Please hurry.',
  'The house has learned your footsteps. It knows which ones are yours now.',
  'That room is not a room. It is the house remembering a room.',
];
let audioContext = null, masterGain = null, droneGain = null, voiceEnabled = true, ambienceNodes = [];
let footstepTimer = 0, currentTarget = null, narrationTimer = 0;
let roomLights = [], figure = null, figureTriggered = false, collectible = null, door = null, doorGroup = null, lampBulbs = [];

function makeTexture(type) {
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  if(type==='wall'){
    ctx.fillStyle='#37332a';ctx.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=54){ctx.fillStyle=y%108===0?'#423a2e':'#3e372d';ctx.fillRect(0,y,512,54);ctx.fillStyle='rgba(173,146,101,.15)';ctx.fillRect(0,y,512,1);for(let x=14;x<512;x+=28){ctx.fillStyle='rgba(166,139,99,.25)';ctx.beginPath();ctx.arc(x+(y%108?14:0),y+18,1.3,0,7);ctx.fill();ctx.beginPath();ctx.arc(x,y+38,1.3,0,7);ctx.fill();}}
  }else if(type==='floor'){
    ctx.fillStyle='#211a13';ctx.fillRect(0,0,512,512);for(let y=0;y<512;y+=64){ctx.fillStyle=['#38291d','#302319','#3b2b1d','#332518'][Math.floor(y/64)%4];ctx.fillRect(0,y,512,62);ctx.fillStyle='rgba(8,5,4,.9)';ctx.fillRect(0,y+62,512,2);ctx.strokeStyle='rgba(12,7,5,.65)';ctx.beginPath();ctx.moveTo((Math.floor(y/64)%2)*95,y);ctx.lineTo((Math.floor(y/64)%2)*95,y+64);ctx.moveTo(310-(Math.floor(y/64)%2)*60,y);ctx.lineTo(310-(Math.floor(y/64)%2)*60,y+64);ctx.stroke();}for(let i=0;i<1200;i++){const x=Math.random()*512,y=Math.random()*512;ctx.fillStyle=`rgba(8,5,3,${Math.random()*.15})`;ctx.fillRect(x,y,Math.random()*13,1);}
  }else{
    ctx.fillStyle='#241a14';ctx.fillRect(0,0,512,512);const g=ctx.createLinearGradient(0,0,512,0);g.addColorStop(0,'#2b1c15');g.addColorStop(.5,'#4a3020');g.addColorStop(1,'#291b15');ctx.fillStyle=g;ctx.fillRect(20,0,472,512);for(let x=40;x<512;x+=48){ctx.strokeStyle='rgba(8,5,4,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}ctx.strokeStyle='rgba(166,126,78,.4)';ctx.lineWidth=8;ctx.strokeRect(56,60,400,188);ctx.strokeRect(56,278,400,190);
  }
  const im=ctx.getImageData(0,0,512,512);for(let i=0;i<im.data.length;i+=4){const n=(Math.random()-.5)*16;im.data[i]+=n;im.data[i+1]+=n;im.data[i+2]+=n;}ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
const wallTex=makeTexture('wall'),floorTex=makeTexture('floor'),doorTex=makeTexture('door');
const mats={wall:new THREE.MeshStandardMaterial({map:wallTex,roughness:.96,color:0xb8a98b}),floor:new THREE.MeshStandardMaterial({map:floorTex,roughness:.91}),ceiling:new THREE.MeshStandardMaterial({color:0x171613,roughness:1}),trim:new THREE.MeshStandardMaterial({color:0x271c14,roughness:.8}),door:new THREE.MeshStandardMaterial({map:doorTex,roughness:.75}),metal:new THREE.MeshStandardMaterial({color:0x80633c,metalness:.72,roughness:.36}),dark:new THREE.MeshStandardMaterial({color:0x080907,roughness:1}),glass:new THREE.MeshStandardMaterial({color:0x09100f,roughness:.1,metalness:.2}),plaster:new THREE.MeshStandardMaterial({color:0x54483a,roughness:.94})};
function mesh(geometry,material,x=0,y=0,z=0,group=world){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function box(x,y,z,sx,sy,sz,material=mats.trim,group=world){return mesh(new THREE.BoxGeometry(sx,sy,sz),material,x,y,z,group);}
function pointLight(color,intensity,distance,x,y,z,group=world){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(x,y,z);group.add(l);return l;}
function clearWorld(){while(world.children.length){const o=world.children[0];world.remove(o);o.traverse?.(child=>{if(child.geometry)child.geometry.dispose();});}roomLights=[];lampBulbs=[];figure=null;collectible=null;door=null;doorGroup=null;}
function createDoor(){
  doorGroup=new THREE.Group();doorGroup.position.set(0,0,-18.7);world.add(doorGroup);
  box(-2.28,2.25,-.2,2.45,4.5,.4,mats.wall,doorGroup);box(2.28,2.25,-.2,2.45,4.5,.4,mats.wall,doorGroup);box(0,3.93,-.2,2.12,1.15,.4,mats.wall,doorGroup);
  box(-1.15,1.67,.02,.15,3.35,.35,mats.trim,doorGroup);box(1.15,1.67,.02,.15,3.35,.35,mats.trim,doorGroup);box(0,3.36,.02,2.4,.2,.35,mats.trim,doorGroup);
  door=mesh(new THREE.BoxGeometry(2.13,3.12,.16),mats.door,0,1.58,.13,doorGroup);door.userData.interactive='door';
  box(-.88,1.58,.23,.08,2.9,.05,mats.trim,doorGroup);box(.88,1.58,.23,.08,2.9,.05,mats.trim,doorGroup);box(0,2.97,.23,1.76,.08,.05,mats.trim,doorGroup);box(0,.2,.23,1.76,.08,.05,mats.trim,doorGroup);
  mesh(new THREE.SphereGeometry(.075,12,8),mats.metal,.77,1.38,.26,doorGroup);box(0,2.55,.24,.45,.28,.05,new THREE.MeshStandardMaterial({color:0x70552f,metalness:.6,roughness:.45}),doorGroup);
  box(0,2.55,.27,.23,.045,.01,new THREE.MeshStandardMaterial({color:0x17120d,emissive:0x090604}),doorGroup);pointLight(0xb64527,1.3,5,0,3.5,-17.5);
}
function createItem(which){
  const item=items[which],group=new THREE.Group(),x=which===0?-1.8:which===1?1.8:0,z=-3.6-(which%2)*2.1;group.position.set(x,.12,z);world.add(group);group.userData.kind='item';
  const glow=new THREE.PointLight(item.color,1.05,3,2);glow.position.y=.9;group.add(glow);
  if(which===0){mesh(new THREE.BoxGeometry(.54,.42,.045),new THREE.MeshStandardMaterial({color:0x82755e,roughness:.92}),0,.7,0,group);mesh(new THREE.BoxGeometry(.4,.27,.01),new THREE.MeshStandardMaterial({color:0x4c4940}),0,.7,.03,group);const silhouette=mesh(new THREE.ConeGeometry(.075,.19,7),new THREE.MeshStandardMaterial({color:0x171714}),-.08,.7,.04,group);silhouette.rotation.z=Math.PI;}
  else if(which===1){const ring=mesh(new THREE.TorusGeometry(.14,.035,8,20),new THREE.MeshStandardMaterial({color:0xc2a15d,metalness:.82,roughness:.25,emissive:0x221506}),0,.73,0,group);ring.rotation.x=Math.PI/2;const shaft=mesh(new THREE.CylinderGeometry(.032,.032,.42,8),mats.metal,.14,.73,0,group);shaft.rotation.z=Math.PI/2;for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.08,.035,.04),mats.metal,.31,.57+i*.08,0,group);}
  else{mesh(new THREE.BoxGeometry(.48,.29,.12),new THREE.MeshStandardMaterial({color:0x31372f,roughness:.65}),0,.7,0,group);const reelmat=new THREE.MeshStandardMaterial({color:0x0d0f0d,metalness:.25,roughness:.7});for(const rx of [-.12,.12])mesh(new THREE.CylinderGeometry(.07,.07,.035,12),reelmat,rx,.7,.08,group).rotation.x=Math.PI/2;mesh(new THREE.BoxGeometry(.27,.025,.02),new THREE.MeshStandardMaterial({color:0x9b8b68}),0,.83,.075,group);}
  const marker=mesh(new THREE.TorusGeometry(.42,.012,5,30),new THREE.MeshBasicMaterial({color:item.color,transparent:true,opacity:.43}),0,.06,0,group);marker.rotation.x=-Math.PI/2;collectible={group,which,item,x,z,taken:false};
}
function addFrame(x,y,z,side,index){const frame=new THREE.Group();frame.position.set(x,y,z);frame.rotation.y=side>0?-Math.PI/2:Math.PI/2;world.add(frame);const w=index%3===0?1.12:.82,h=index%3===0?1.3:1.04;const wood=new THREE.MeshStandardMaterial({color:0x251a13,roughness:.7}),inner=new THREE.MeshStandardMaterial({color:index%2?0x292c25:0x3b3025,roughness:1}),canvas=new THREE.MeshStandardMaterial({color:index%3===0?0x625648:0x312c26,roughness:1});mesh(new THREE.BoxGeometry(w+.12,h+.12,.09),wood,0,0,0,frame);mesh(new THREE.BoxGeometry(w,h,.025),inner,0,0,.057,frame);mesh(new THREE.BoxGeometry(w-.12,h-.12,.018),canvas,0,0,.075,frame);if(index%4===1){const eyes=new THREE.MeshStandardMaterial({color:0xa99c7a,emissive:0x322c1f,emissiveIntensity:.3});for(const ex of [-.13,.13])mesh(new THREE.SphereGeometry(.018,8,6),eyes,ex,.07,.092,frame);}}
function addSconce(x,z,side,index){const g=new THREE.Group();g.position.set(x,2.95,z);g.rotation.y=side>0?-Math.PI/2:Math.PI/2;world.add(g);mesh(new THREE.BoxGeometry(.24,.34,.12),new THREE.MeshStandardMaterial({color:0x715638,metalness:.7,roughness:.45}),0,0,0,g);const glassmat=new THREE.MeshStandardMaterial({color:0xffdba0,emissive:0xff9a3e,emissiveIntensity:2.2,roughness:.3}),bulb=mesh(new THREE.SphereGeometry(.105,12,10),glassmat,0,.17,.08,g);lampBulbs.push({bulb,phase:index*.93});const light=pointLight(0xffb871,index%2?3.7:4.7,8,x+side*.35,3.05,z);roomLights.push({light,phase:index*2.7,base:index%2?3.7:4.7});}
function addSideDoor(x,z,side,index){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=side>0?-Math.PI/2:Math.PI/2;world.add(g);const depth=side*.09;box(0,1.62,depth,1.5,3.3,.14,mats.trim,g);box(0,1.56,depth+side*.08,1.15,3.05,.08,mats.door,g);box(-.67,1.62,depth+side*.14,.12,3.48,.22,mats.trim,g);box(.67,1.62,depth+side*.14,.12,3.48,.22,mats.trim,g);box(0,3.34,depth+side*.14,1.46,.16,.22,mats.trim,g);mesh(new THREE.SphereGeometry(.055,10,8),mats.metal,side*.38,1.45,depth+side*.14,g);if(index%4===0)box(0,2.65,depth+side*.13,.7,.04,.05,mats.metal,g);}

function buildHall(){
  clearWorld();
  floorTex.repeat.set(1,9);wallTex.repeat.set(1.7,1);
  mesh(new THREE.PlaneGeometry(6.5,40),mats.floor,0,.005,-1,world).rotation.x=-Math.PI/2;
  mesh(new THREE.PlaneGeometry(6.5,40),mats.ceiling,0,4.52,-1,world).rotation.x=Math.PI/2;
  // Long repeated walls, seams, floor and crown moulding make the corridor feel built, not tiled.
  for(let i=0;i<7;i++){
    const z=15.8-i*5.35;
    for(const side of [-1,1]){
      box(side*3.23,2.25,z, .22,4.5,5.4,mats.wall);
      box(side*3.08,.18,z,.14,.36,5.4,mats.trim);box(side*3.08,4.26,z,.14,.22,5.4,mats.trim);
      if(i%2===0)addSconce(side*3.01,z-1.6,side,i+1);
      if(i%2===1)addFrame(side*3.095,2.45,z+.7,side,i+1);
      if(i===2||i===5)addSideDoor(side*3.06,z-1.7,side,i);
    }
    box(0,4.35,z,6.2,.22,.18,mats.trim);
  }
  // End walls. The front door opens onto another copy of this impossible corridor.
  box(0,2.25,18.55,6.5,4.5,.4,mats.wall);
  box(0,2.25,-21.0,6.5,4.5,.42,mats.wall);
  for(let i=0;i<15;i++){
    const x=(Math.random()-.5)*5.5,z=-14+Math.random()*29;
    const plank=box(x,.035,z,.18+Math.random()*.42,.035,.025,mats.trim);
    plank.rotation.y=(Math.random()-.5)*.11;plank.rotation.x=(Math.random()-.5)*.07;
  }
  for(const z of [-8,3,13]){
    // Black windows that show no reflection and no world beyond.
    for(const side of [-1,1]){
      const g=new THREE.Group();g.position.set(side*3.08,2.25,z);g.rotation.y=side>0?-Math.PI/2:Math.PI/2;world.add(g);
      box(0,0,0,.94,1.55,.12,mats.trim,g);box(0,0,.07,.72,1.31,.04,mats.glass,g);
      box(0,0,.1,.035,1.3,.04,mats.metal,g);box(0,0,.1,.7,.035,.04,mats.metal,g);
      const haze=new THREE.MeshBasicMaterial({color:0x101715,transparent:true,opacity:.35});mesh(new THREE.PlaneGeometry(.68,1.25),haze,0,0,.105,g);
    }
  }
  createDoor();
  // The next memory is physically present in the hall; never spawn what was already carried away.
  const next=items.findIndex(i=>!player.items.has(i.id));
  if(next>=0)createItem(next,player.loop);
  if(player.loop>=1&&!figureTriggered)makeFigure();
  // The first entrance is nailed shut behind you. Its number changes while you aren't looking.
  const back=new THREE.Group();back.position.set(0,0,18.2);world.add(back);
  box(0,1.55,0,2.2,3.1,.16,mats.door,back);
  box(0,3.19,.01,2.5,.17,.22,mats.trim,back);
  box(-1.18,1.6,.01,.16,3.35,.22,mats.trim,back);box(1.18,1.6,.01,.16,3.35,.22,mats.trim,back);
  box(0,1.65,.11,1.1,2.6,.03,mats.dark,back);
  const smallGlow=pointLight(0x9d2519,.35,4,0,2.2,16.9);
}
function makeFigure(){
  figure=new THREE.Group();figure.position.set(-.35,0,-10.4);world.add(figure);
  const shadowMat=new THREE.MeshStandardMaterial({color:0x080a09,roughness:1,transparent:true,opacity:.92});
  const robe=mesh(new THREE.CylinderGeometry(.11,.42,1.48,9,1),shadowMat,0,1.02,0,figure);robe.rotation.z=.06;
  const head=mesh(new THREE.SphereGeometry(.23,14,12),shadowMat,0,1.91,.015,figure);head.scale.set(.73,1.14,.72);
  for(const side of [-1,1]){const arm=mesh(new THREE.CylinderGeometry(.07,.12,1.04,7),shadowMat,side*.4,1.15,0,figure);arm.rotation.z=side*.16;}
  figure.visible=false;
}
function startAudio(){
  if(audioContext){audioContext.resume();return;}
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
  audioContext=new Ctx();masterGain=audioContext.createGain();masterGain.gain.value=.42;masterGain.connect(audioContext.destination);
  const low=audioContext.createOscillator(),lowGain=audioContext.createGain(),lowFilter=audioContext.createBiquadFilter();
  low.type='sine';low.frequency.value=43;lowFilter.type='lowpass';lowFilter.frequency.value=125;lowGain.gain.value=.15;low.connect(lowFilter);lowFilter.connect(lowGain);lowGain.connect(masterGain);low.start();
  const hissBuffer=audioContext.createBuffer(1,audioContext.sampleRate*3,audioContext.sampleRate),data=hissBuffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.14;
  const hiss=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),hissGain=audioContext.createGain();hiss.buffer=hissBuffer;hiss.loop=true;filter.type='lowpass';filter.frequency.value=440;hissGain.gain.value=.13;hiss.connect(filter);filter.connect(hissGain);hissGain.connect(masterGain);hiss.start();
  const throb=audioContext.createOscillator(),throbGain=audioContext.createGain();throb.type='sine';throb.frequency.value=1.07;throbGain.gain.value=.035;throb.connect(throbGain);throbGain.connect(masterGain);throb.start();
  droneGain=lowGain;ambienceNodes=[low,hiss,throb];
}
function sound(type){
  if(!audioContext||!voiceEnabled)return;const now=audioContext.currentTime;
  const osc=audioContext.createOscillator(),gain=audioContext.createGain(),filter=audioContext.createBiquadFilter();
  osc.type=type==='step'?'triangle':'sine';osc.frequency.setValueAtTime(type==='door'?84:type==='step'?92:260,now);osc.frequency.exponentialRampToValueAtTime(type==='door'?39:type==='step'?48:95,now+.45);
  gain.gain.setValueAtTime(type==='door'?.23:type==='step'?.09:.12,now);gain.gain.exponentialRampToValueAtTime(.001,now+(type==='door'?.8:.38));filter.type='lowpass';filter.frequency.value=type==='door'?450:800;osc.connect(filter);filter.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+.9);
}
function speak(text,caption=true){
  if(caption){$('narration-text').textContent=text;$('narration').classList.remove('hidden');clearTimeout(narrationTimer);narrationTimer=setTimeout(()=>$('narration').classList.add('hidden'),Math.min(8500,2200+text.length*48));}
  if(!voiceEnabled||!('speechSynthesis'in window))return;
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.83;u.pitch=.72;u.volume=.8;
  const voices=speechSynthesis.getVoices();const pick=voices.find(v=>/en/i.test(v.lang)&&/female|samantha|victoria|karen|serena|zira/i.test(v.name))||voices.find(v=>/en/i.test(v.lang));if(pick)u.voice=pick;speechSynthesis.speak(u);
}
function showCard(title){$('chapter-title').textContent=title;$('chapter-card').classList.remove('hidden');clearTimeout(showCard.t);showCard.t=setTimeout(()=>$('chapter-card').classList.add('hidden'),3200);}
function updateInventory(){
  const names=items.filter(i=>player.items.has(i.id)).map(i=>`<span>${i.label}</span>`);
  $('inventory-items').innerHTML=names.length?names.join(''):'<span class="empty">— &nbsp; NOTHING YET</span>';
  $('objective').textContent=player.items.size<3?'Find the things you left behind.':"The red door is waiting for you.";
}
function enterHouse(){
  $('title-screen').classList.add('hidden');$('hud').classList.remove('hidden');player.started=true;player.x=0;player.z=11;flashlightOn=true;flashlight.intensity=32;startAudio();buildHall();updateInventory();showCard('THE FRONT HALL');setTimeout(()=>speak(lines[0]),750);
  if(matchMedia('(pointer:coarse)').matches){$('mobile-controls').classList.remove('hidden');}else requestLock();
}

const hemi=new THREE.HemisphereLight(0x718078,0x15120e,.18);scene.add(hemi);
const ambient=new THREE.AmbientLight(0xa58e6b,.12);scene.add(ambient);
const flashlight=new THREE.SpotLight(0xffe2b2,0,18,Math.PI/7,.45,1.3);
flashlight.position.set(0,0,0);flashlight.target.position.set(0,0,-1);camera.add(flashlight);camera.add(flashlight.target);scene.add(camera);
const raycaster=new THREE.Raycaster();raycaster.far=3.4;
let lastTime=0, lookPointer=null, lookTouch=null, flashlightOn=false, scareCooldown=0, doorOpening=false;

function requestLock(){if(!player.started||matchMedia('(pointer:coarse)').matches)return;sceneCanvas.requestPointerLock?.();}
document.addEventListener('pointerlockchange',()=>{player.locked=document.pointerLockElement===sceneCanvas;$('crosshair-prompt').classList.toggle('hidden',player.locked||!player.started);});
document.addEventListener('pointerlockerror',()=>{$('crosshair-prompt').classList.remove('hidden');});
sceneCanvas.addEventListener('click',()=>{if(player.started&&!player.locked)requestLock();});
document.addEventListener('mousemove',(e)=>{if(!player.locked)return;player.yaw-=e.movementX*.0021;player.pitch=Math.max(-1.28,Math.min(1.28,player.pitch-e.movementY*.0018));});
$('begin').addEventListener('click',enterHouse);
$('sound-toggle').addEventListener('click',()=>{voiceEnabled=!voiceEnabled;$('sound-toggle').innerHTML=`SOUND <span>${voiceEnabled?'ON':'OFF'}</span>`;if(!voiceEnabled&&'speechSynthesis'in window)speechSynthesis.cancel();if(masterGain)masterGain.gain.setTargetAtTime(voiceEnabled?.42:0,audioContext.currentTime,.12);});
$('stay-button').addEventListener('click',()=>{$('ending-screen').classList.add('hidden');player.ending=false;player.z=11;player.x=0;buildHall();showCard('THE NEXT HALL');});
window.addEventListener('keydown',(e)=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();held.add(k);if(k==='f'&&!e.repeat)toggleFlashlight();if(k==='e'&&!e.repeat)interact();if(k==='escape'&&player.locked)document.exitPointerLock();});
window.addEventListener('keyup',(e)=>held.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>held.clear());
function toggleFlashlight(){if(!player.started)return;flashlightOn=!flashlightOn;flashlight.intensity=flashlightOn?32:0;sound('click');}
function interact(){
  if(!currentTarget)return;
  if(currentTarget.type==='item'){
    const {which,item}=currentTarget.data;if(collectible?.taken)return;
    collectible.taken=true;player.items.add(item.id);sound('pickup');
    const caption=item.line;speak(caption);updateInventory();showCard(item.name.toUpperCase());
    if(collectible.group)collectible.group.visible=false;
    if(player.items.size===3){setTimeout(()=>speak('You have everything you brought. The door is open now. It was never locked.'),1100);}
    else{const next=items.findIndex(i=>!player.items.has(i.id));setTimeout(()=>{if(player.started&&!player.ending&&next>=0)createItem(next,player.loop);},1300);}
  }else if(currentTarget.type==='door'){
    if(player.items.size<3){sound('door');speak(player.items.size===0?'It will not move. Something is missing.':'Not yet. There is still something in the house that belongs to you.');return;}
    if(!doorOpening){doorOpening=true;door.userData.opening=true;sound('door');speak('Mara? I am coming in.');}
  }
}
function updateTarget(){
  currentTarget=null;if(!player.started||player.ending)return;
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  if(collectible&&!collectible.taken&&collectible.group.visible){
    const hit=raycaster.intersectObject(collectible.group,true)[0];if(hit){const dist=hit.distance;if(dist<3.25)currentTarget={type:'item',data:collectible};}
  }
  if(door&&player.items.size>=3){const hit=raycaster.intersectObject(door,false)[0];if(hit&&hit.distance<3.25)currentTarget={type:'door',data:door};}
  $('interact').classList.toggle('hidden',!currentTarget);
  if(currentTarget)$('interact').querySelector('span').textContent=currentTarget.type==='door'?'OPEN THE RED DOOR':'TAKE';
}
function move(dt){
  if(!player.started||player.ending)return;
  let forward=(held.has('w')||held.has('arrowup')?1:0)-(held.has('s')||held.has('arrowdown')?1:0);
  let strafe=(held.has('d')||held.has('arrowright')?1:0)-(held.has('a')||held.has('arrowleft')?1:0);
  if(!player.locked&&matchMedia('(pointer:fine)').matches){forward=0;strafe=0;}
  const len=Math.hypot(forward,strafe)||1;forward/=len;strafe/=len;
  const speed=held.has('shift')?3.5:2.35;
  const dx=(-Math.sin(player.yaw)*forward+Math.cos(player.yaw)*strafe)*speed*dt;
  const dz=(-Math.cos(player.yaw)*forward-Math.sin(player.yaw)*strafe)*speed*dt;
  const nx=THREE.MathUtils.clamp(player.x+dx,-2.62,2.62),nz=player.z+dz;
  player.moving=Math.abs(dx)+Math.abs(dz)>.0005;
  player.x=nx;player.z=Math.max(-19.1,Math.min(17.65,nz));
  if(player.moving){footstepTimer-=dt;if(footstepTimer<=0){sound('step');footstepTimer=held.has('shift')?.29:.48;}}
  const time=clock.elapsedTime;const sway=player.moving?Math.sin(time*9)*.025:Math.sin(time*1.6)*.008;
  camera.position.set(player.x,1.67+sway,player.z);camera.rotation.set(player.pitch,player.yaw,player.moving?Math.sin(time*4)*.003:0,'YXZ');
  if(player.z<-17.3&&player.items.size===3&&!doorOpening&&door)currentTarget={type:'door',data:door};
}
function encounter(dt){
  const time=clock.elapsedTime;scareCooldown=Math.max(0,scareCooldown-dt);
  roomLights.forEach(({light,phase,base})=>{const flicker=Math.sin(time*3.1+phase)*.12+(Math.random()<.006?-Math.random()*.8:0);light.intensity=Math.max(.4,base+flicker);});
  lampBulbs.forEach(({bulb,phase})=>{bulb.material.emissiveIntensity=1.8+Math.sin(time*4+phase)*.45;});
  if(figure&&!figureTriggered&&player.loop>=1&&player.z<-6){figure.visible=true;figureTriggered=true;scareCooldown=3;sound('sting');setTimeout(()=>{if(figure)figure.visible=false;},2400);speak('No. That is not how you looked when you were little.',true);}
  if(figure&&figureTriggered&&figure.visible){figure.lookAt(camera.position.x,1.2,camera.position.z);}
  if(player.z<-14&&player.items.size<3&&scareCooldown===0){scareCooldown=22;if(Math.random()<.55){sound('sting');$('edge-whisper').textContent='TURN AROUND';$('edge-whisper').style.left=Math.random()<.5?'8%':'auto';$('edge-whisper').style.right=$('edge-whisper').style.left==='auto'?'8%':'auto';$('edge-whisper').style.color='rgba(190,164,132,.72)';setTimeout(()=>$('edge-whisper').style.color='rgba(190,164,132,0)',1300);}}
  if(doorOpening&&door){door.rotation.y=THREE.MathUtils.damp(door.rotation.y,-1.48,2.5,dt);if(Math.abs(door.rotation.y)>1.12){doorOpening=false;player.passed++;player.loop++;door.rotation.y=0;player.x=0;player.z=10.6;player.yaw=0;player.pitch=0;buildHall();showCard(player.loop===1?'THE HOUSE HAS MOVED':'THRESHOLD '+String(player.loop+1).padStart(2,'0'));sound('door');
      if(player.loop===1){setTimeout(()=>speak(lines[1]),1800);}else if(player.loop===2){setTimeout(()=>speak(lines[2]),1300);}else if(player.loop===3){setTimeout(()=>speak(lines[3]),1300);}else{setTimeout(()=>speak(lines[4+(player.loop%2)]),1300);}
      if(player.loop>=5&&!player.ending){player.ending=true;$('ending-screen').classList.remove('hidden');setTimeout(()=>speak('You are home now. There is no outside anymore.'),900);}
    }}
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));}
window.addEventListener('resize',resize);

// Coarse-pointer controls: directional buttons and a right-side drag-to-look zone.
for(const button of document.querySelectorAll('[data-move]')){
  const key={forward:'w',back:'s',left:'a',right:'d'}[button.dataset.move];
  button.addEventListener('pointerdown',(e)=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.add(key);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>held.delete(key));
}
$('mobile-look').addEventListener('pointerdown',(e)=>{e.preventDefault();lookPointer=e.pointerId;lookTouch={x:e.clientX,y:e.clientY};$('mobile-look').setPointerCapture(e.pointerId);});
$('mobile-look').addEventListener('pointermove',(e)=>{if(e.pointerId!==lookPointer||!lookTouch)return;player.yaw-=(e.clientX-lookTouch.x)*.006;player.pitch=THREE.MathUtils.clamp(player.pitch-(e.clientY-lookTouch.y)*.005,-1.15,1.15);lookTouch={x:e.clientX,y:e.clientY};});
$('mobile-look').addEventListener('pointerup',()=>{lookPointer=null;lookTouch=null;});
$('mobile-light').addEventListener('click',toggleFlashlight);
sceneCanvas.addEventListener('touchstart',(e)=>{if(player.started&&!player.locked)e.preventDefault();},{passive:false});

function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;move(dt);encounter(dt);
  if(collectible&&!collectible.taken){collectible.group.rotation.y+=dt*.32;collectible.group.position.y=.12+Math.sin(clock.elapsedTime*1.4)*.045;}
  updateTarget();renderer.render(scene,camera);
}
// Compose a corridor under the title so the first glance already feels like trespassing.
buildHall();camera.position.set(0,1.67,11);camera.rotation.set(0,0,0,'YXZ');requestAnimationFrame(animate);

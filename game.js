import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const ui = {
  title: $('title-screen'), intro: $('intro-screen'), hud: $('hud'), pause: $('pause-screen'), end: $('end-screen'),
  loading: $('loading-cover'), canvas: $('scene'), clock: $('clock-time'), progress: $('time-progress'), power: $('power-number'), powerFill: $('power-fill'), usage: $('usage-bars'), status: $('status-message'), camName: $('cam-name'), camera: $('camera-overlay'), feedLoc: $('feed-location'), warning: $('warning-banner'), warningText: $('warning-text'), subtitle: $('subtitle'), toast: $('toast'),
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => a.clone().lerp(b, t);
const mat = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

// A deliberately handcrafted low-poly set: warm family restaurant surfaces against a cold security-office pool.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0d);
scene.fog = new THREE.FogExp2(0x101416, .038);
const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(57, 1, .1, 100);
const officePosition = new THREE.Vector3(0, 1.7, 5.2);
const lookTarget = new THREE.Vector3(0, 1.65, -3.2);
const ambient = new THREE.HemisphereLight(0x82919a, 0x14100b, 1.1); scene.add(ambient);
const moon = new THREE.DirectionalLight(0x93a3b4, 1.15); moon.position.set(-5, 8, 2); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); scene.add(moon);
const officeGlow = new THREE.PointLight(0xb78c56, 20, 12, 2); officeGlow.position.set(0, 3.2, 1.5); scene.add(officeGlow);
const hallWestGlow = new THREE.PointLight(0x6f8590, 8, 13, 2); hallWestGlow.position.set(-4.3, 2.4, -7); scene.add(hallWestGlow);
const hallEastGlow = new THREE.PointLight(0x7d7770, 7, 13, 2); hallEastGlow.position.set(4.3, 2.5, -7); scene.add(hallEastGlow);
const redSignLight = new THREE.PointLight(0xb23926, 3, 6, 2); redSignLight.position.set(0, 3.1, -8); scene.add(redSignLight);
const world = new THREE.Group(); scene.add(world);

function box(parent, name, size, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = options.castShadow !== false; mesh.receiveShadow = options.receiveShadow !== false;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  parent.add(mesh); return mesh;
}
function sphere(parent, name, radius, position, material, scale = [1, 1, 1], segments = 16) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(8, segments >> 1)), material);
  mesh.name = name; mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, name, rt, rb, h, position, material, radial = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, radial), material); mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
const floorMat = mat(0x252422, .94), wallMat = mat(0x403b34), plaster = mat(0x65594a), dark = mat(0x101315), trim = mat(0x17191a, .53), brass = mat(0x9b7750, .38, .56), red = mat(0x9e3024, .58), cream = mat(0xcabda2), tile = mat(0x665c4d), blue = mat(0x273b45), black = mat(0x090b0c, .45), eyeMat = new THREE.MeshStandardMaterial({ color:0xf2d89a, emissive:0xa87930, emissiveIntensity:1.6, roughness:.25 });

// Restaurant shell, faded tile floor, ceiling beams and a playable security office foreground.
box(world, 'restaurant floor', [24, .24, 35], [0, -.17, -8], floorMat);
for (let x = -11; x <= 11; x += 2) box(world, 'worn floor seam', [.018,.006,34], [x, -.04, -8], mat(0x49443a), {castShadow:false});
for (let z = -24; z <= 8; z += 2) box(world, 'worn floor seam', [23,.006,.018], [0,-.04,z], mat(0x49443a), {castShadow:false});
box(world, 'back wall', [24, 6, .35], [0, 2.8, -16], wallMat);
box(world, 'left restaurant wall', [.35, 6, 31], [-11.8, 2.8, -1], wallMat);
box(world, 'right restaurant wall', [.35, 6, 31], [11.8, 2.8, -1], wallMat);
box(world, 'ceiling', [24, .24, 34], [0, 5.85, -8], mat(0x242321), {castShadow:false});
for (let x = -10; x <= 10; x += 5) box(world, 'ceiling girder', [.18,.2,33], [x,5.68,-8], mat(0x332e27));
// Office side partitions, counter, old monitor, coffee cup and practical desk lamp.
box(world, 'office left partition', [.2,3.8,7.2], [-3.6,1.8,1.1], plaster);
box(world, 'office right partition', [.2,3.8,7.2], [3.6,1.8,1.1], plaster);
box(world, 'office rear wall', [7.2,3.8,.22], [0,1.8,4.5], plaster);
box(world, 'security counter', [5.9,.26,1.05], [0,1.02,2.1], mat(0x302a23));
box(world, 'counter front', [5.75,.85,.14], [0,.55,2.55], mat(0x4b4032));
box(world, 'desk surface', [5.98,.08,1.1], [0,1.19,2.1], mat(0x75624b));
box(world, 'monitor housing', [1.32,.82,.16], [0,1.82,1.72], black);
const monitorFace = new THREE.Mesh(new THREE.PlaneGeometry(1.19,.66), new THREE.MeshBasicMaterial({color:0x101b18})); monitorFace.position.set(0,1.83,1.625); world.add(monitorFace);
for (let i=0;i<5;i++) box(world,'monitor scanline',[1.1,.008,.003],[-.03,1.6+i*.11,1.61],mat(0x32473c),{castShadow:false});
box(world,'keyboard',[.86,.035,.28],[-.05,1.29,1.96],mat(0x131516));
cylinder(world,'coffee cup',.13,.11,.25,[1.45,1.35,1.96],mat(0x6a2c25),16); cylinder(world,'cup coffee',.095,.095,.006,[1.45,1.48,1.96],mat(0x160f0c),16);
box(world,'desk lamp base',[.28,.07,.28],[-1.42,1.29,1.93],brass); cylinder(world,'desk lamp neck',.025,.04,.48,[-1.42,1.55,1.93],brass,10); const shade=cylinder(world,'desk lamp shade',.2,.11,.22,[-1.42,1.85,1.93],mat(0x9c6a37),12); const lamp=new THREE.PointLight(0xe4a653,22,6,2);lamp.position.set(-1.42,1.78,1.86);world.add(lamp);
// Door portals with retracting steel shutters.
const doors = {};
for (const side of ['west','east']) {
  const x = side === 'west' ? -3.45 : 3.45;
  box(world,`${side} door frame side`,[.25,4.1,.45],[x+(side==='west'?.78:-.78),1.95,-1.7],trim);
  box(world,`${side} door lintel`,[1.82,.28,.48],[x,3.9,-1.7],trim);
  box(world,`${side} doorway`,[1.42,3.54,.08],[x,1.83,-1.7],mat(0x080a0b),{castShadow:false});
  const shutterGroup = new THREE.Group(); shutterGroup.position.set(x,0,-1.52); world.add(shutterGroup);
  const shutter = box(shutterGroup,`${side} security shutter`,[1.36,3.35,.2],[0,1.69,0],mat(0x555955,.58,.55));
  for(let n=0;n<9;n++) box(shutterGroup,'shutter ridges',[1.31,.025,.02],[0,.27+n*.35,.114],mat(0x2d3333,.44,.55),{castShadow:false});
  const button = box(world,`${side} button panel`,[.25,.48,.12],[x+(side==='west'?1.06:-1.06),1.45,-1.55],dark);
  sphere(world,`${side} button light`,.055,[x+(side==='west'?1.06:-1.06),1.54,-1.47],mat(0xd43f31),[1,1, .5]);
  const spotlight = new THREE.SpotLight(side==='west'?0xd4d8c6:0xd9c4a0,0,13,Math.PI/7,.4,1.5); spotlight.position.set(x,2.9,-.6); spotlight.target.position.set(x,1,-7); world.add(spotlight,spotlight.target); spotlight.castShadow=false;
  doors[side]={group:shutterGroup,light:spotlight,closed:false,lightOn:false};
}
// Dining tables, booths, party décor and the tiny far-away performance stage.
const tableMat=mat(0x6a3329), wood=mat(0x53402e), metal=mat(0x555552,.55,.55);
function table(x,z){cylinder(world,'round dining table',.72,.72,.13,[x,1.05,z],tableMat,20);cylinder(world,'table pedestal',.12,.15,.92,[x,.57,z],metal);for(const dx of [-.45,.45])for(const dz of [-.38,.38]){box(world,'chair seat',[.46,.12,.43],[x+dx,.61,z+dz],wood);box(world,'chair back',[.46,.58,.12],[x+dx,.94,z+dz+(dz>0?.16:-.16)],wood)}}
for(const p of [[-7,-9],[-3.9,-9],[3.9,-9],[7,-9],[-7,-13],[0,-13],[7,-13]]) table(...p);
for(let i=0;i<5;i++){box(world,'booth seat',[2,.55,.7],[-8, .68,-4-i*2.2],mat(0x5c2824));box(world,'booth back',[2,.88,.22],[-8,1.29,-4.42-i*2.2],tableMat)}
// Party bunting and hanging lamps.
for(let i=0;i<10;i++){let x=-9+i*2;const bulb=cylinder(world,'hanging pendant',.18,.18,.12,[x,4.7,-9],i%2?mat(0xb54b30):mat(0xb79752),12);const glow=new THREE.PointLight(i%2?0xa64e31:0xb38f53,3.3,5,2);glow.position.set(x,4.45,-9);world.add(glow)}
// Stage with curtain, marquee and crude hand-painted signs.
box(world,'stage riser',[8,.55,3.2],[0,.32,-14.1],mat(0x332b24));box(world,'stage carpet',[7.9,.04,2.9],[0,.62,-14.1],mat(0x63362d));
box(world,'stage back curtain',[9,4,.2],[0,2.7,-15.65],mat(0x652e27));
for(let x=-4;x<=4;x+=.32){box(world,'curtain fold',[.09,3.8,.08],[x,2.7,-15.48],mat(x%2?0x7a3a2f:0x51261f),{castShadow:false})}
box(world,'stage marquee',[7.8,.62,.3],[0,5.05,-15.25],mat(0x302119));
for(let i=0;i<19;i++){const bulb=sphere(world,'marquee bulb',.055,[-3.65+i*.405,5.04,-15.06],mat(0xe5bd67),[1,1,1],10);bulb.material.emissive=new THREE.Color(0x8c5420);bulb.material.emissiveIntensity=1}
function makeSign(text, x,y,z, width, color='#e8cc8c'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#182023';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#b48e50';ctx.lineWidth=7;ctx.strokeRect(8,8,496,112);ctx.font='bold 54px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,66);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.25),new THREE.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);world.add(m);return m;
}
makeSign('B A R N S L E Y',0,4.25,-15.42,5.4);makeSign('PIZZA • ARCADE • PARTIES',0,3.9,-15.4,4.5,'#df9771');
// Hallways recede behind each office door, with a readable vanishing-point stripe.
for(const side of ['west','east']){const x=side==='west'?-4.6:4.6;box(world,`${side} hall floor`,[2.7,.1,18],[x,-.02,-10],mat(0x383633));box(world,`${side} hall side wall`,[.18,3.8,18],[x+(side==='west'?-1.4:1.4),1.8,-10],mat(0x343b3c));box(world,`${side} hall far wall`,[2.7,3.8,.2],[x,1.8,-19],mat(0x282e2e));for(let i=0;i<6;i++){box(world,'hall ceiling light',[.45,.06,.7],[x,3.5,-3-i*2.6],mat(0x9d926e),{castShadow:false});const l=new THREE.PointLight(0x8d9989,i===0?2.2:.9,4,2);l.position.set(x,3.25,-3-i*2.6);world.add(l)}}
makeSign('STAFF ONLY',0,2.8,-1.68,1.25,'#d49c6a');
// Animatronic character builder; each silhouette uses layered shapes, glowing eyes and jointed limbs.
function makeAnimatronic(kind, palette){
 const group=new THREE.Group();group.name=kind;const fur=mat(palette.fur,.86), darker=mat(palette.dark,.92), muzzle=mat(palette.muzzle,.72), metalJoint=mat(0x393e3d,.6,.35), eye=new THREE.MeshStandardMaterial({color:0xffe6a3,emissive:0xffa634,emissiveIntensity:2.2,roughness:.22}), pupil=mat(0x100d0a,.3);
 const torso=sphere(group,'torso',.72,[0,1.52,0],fur,[.82,1.15,.59],20);const belly=sphere(group,'belly plate',.48,[0,1.43,-.47],muzzle,[.85,1,.22]);
 const hip=sphere(group,'hip joint',.44,[0,.82,0],darker,[1,.65,.85]);
 const head=new THREE.Group();head.position.set(0,2.58,-.06);group.add(head);
 sphere(head,'head',.69,[0,0,0],fur,[1,.92,.78],20);
 if(kind==='BARNABY'){
   sphere(head,'left ear',.24,[-.48,.63,0],fur,[.74,1.6,.68]);sphere(head,'right ear',.24,[.48,.63,0],fur,[.74,1.6,.68]);
   sphere(head,'hat brim',.53,[0,.56,-.03],darker,[1,.18,.8]);cylinder(head,'top hat',.29,.35,.47,[0,.78,-.03],darker,16);
   sphere(head,'snout',.37,[0,-.22,-.58],muzzle,[1.2,.72,.58]);sphere(head,'nose',.12,[0,-.1,-.94],darker,[1,.8,.65]);
 }else if(kind==='MAGS'){
   sphere(head,'left ear',.21,[-.52,.62,0],fur,[1,1.25,.6]);sphere(head,'right ear',.21,[.52,.62,0],fur,[1,1.25,.6]);
   sphere(head,'bow',.14,[-.2,.55,-.45],red,[1.2,1,.35]);sphere(head,'bow',.14,[.2,.55,-.45],red,[1.2,1,.35]);sphere(head,'bow knot',.09,[0,.55,-.49],brass);
   sphere(head,'snout',.32,[0,-.23,-.56],muzzle,[1.22,.72,.56]);sphere(head,'nose',.11,[0,-.13,-.91],mat(0x47302c),[1,.9,.6]);
 }else{
   sphere(head,'long ear',.2,[-.46,.64,0],fur,[.7,1.85,.65]).rotation.z=-.25;sphere(head,'torn ear',.2,[.46,.62,0],fur,[.8,1.5,.65]).rotation.z=.34;
   sphere(head,'jaw',.35,[0,-.3,-.48],muzzle,[1.16,.64,.65]);sphere(head,'snout',.29,[0,-.18,-.56],fur,[1.15,.58,.68]);sphere(head,'nose',.1,[0,-.1,-.88],darker);
 }
 for(const x of [-.26,.26]){sphere(head,'eye socket',.19,[x,.08,-.59],darker,[1,1,.4]);sphere(head,'glowing eye',.105,[x,.08,-.665],eye,[1,1,.55]);sphere(head,'pupil',.044,[x,.08,-.725],pupil,[1,1,.45]);}
 // Chest bib, seams and exposed rivets.
 if(kind==='MAGS')makeCharacterPlate(group,'LET’S EAT!',mat(0xf0dfbb),red);
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.64,2.04,0);group.add(arm);sphere(arm,'shoulder',.27,[0,0,0],darker);cylinder(arm,'upper arm',.2,.24,.68,[side*.02,-.39,0],fur,12);sphere(arm,'elbow',.19,[side*.02,-.76,0],metalJoint);cylinder(arm,'forearm',.17,.2,.68,[side*.03,-1.06,-.01],fur,12);sphere(arm,'hand',.22,[side*.03,-1.45,-.03],darker,[1.1,.85,1]);for(let f=0;f<3;f++)sphere(arm,'finger',.07,[side*.03+(f-1)*.12,-1.58,-.1],metalJoint,[.7,1.4,.7]);limbs.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.3,.84,0);group.add(leg);sphere(leg,'thigh',.3,[0,-.22,0],fur,[.8,1.15,.8]);cylinder(leg,'shin',.19,.23,.55,[0,-.64,0],darker,12);sphere(leg,'boot',.3,[0,-.98,-.1],darker,[1.15,.52,1.45]);limbs.push(leg);
 }
 group.userData={head,limbs,kind,baseY:0};return group;
}
function makeCharacterPlate(group,text,bg,fg){const c=document.createElement('canvas');c.width=256;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#efe4c9';cx.fillRect(0,0,256,128);cx.fillStyle='#852f27';cx.font='bold 40px Georgia';cx.textAlign='center';cx.fillText(text,128,78);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(.76,.38),new THREE.MeshBasicMaterial({map:texture}));p.position.set(0,1.75,-.53);group.add(p)}
const cast={
 barnaby:{model:makeAnimatronic('BARNABY',{fur:0x79593d,dark:0x463528,muzzle:0xbaa17a}),route:['stage','dining','west','westDoor'],side:'west',moveAt:19,aggression:.49},
 mags:{model:makeAnimatronic('MAGS',{fur:0x907c67,dark:0x3f3431,muzzle:0xc2ae91}),route:['stage','dining','arcade','east','eastDoor'],side:'east',moveAt:27,aggression:.43},
 stitch:{model:makeAnimatronic('STITCH',{fur:0x674a39,dark:0x322924,muzzle:0x80614a}),route:['stage','kitchen','west','westDoor'],side:'west',moveAt:48,aggression:.36},
};
for(const [id,a] of Object.entries(cast)){scene.add(a.model);a.node=0;a.target=new THREE.Vector3();a.model.visible=true;positionCharacter(id,a,0)}
function roomPosition(room,id){const side=cast[id].side;const sideX=side==='west'?-4.7:4.7;
 const positions={stage:[id==='mags'?-.9:id==='stitch'?1.2:0,0,-13.5],dining:[id==='barnaby'?-5:id==='mags'?5:0,0,-8],arcade:[-7,0,-4],kitchen:[8,0,-13],west:[-4.7,0,-3.3],east:[4.7,0,-3.3],westDoor:[-3.45,0,-1.88],eastDoor:[3.45,0,-1.88]};return new THREE.Vector3(...(positions[room]||[sideX,0,-9]));}
function positionCharacter(id,a,instant=1){const room=a.route[a.node];a.target.copy(roomPosition(room,id));a.room=room;if(instant){a.model.position.copy(a.target);a.model.rotation.y=room==='westDoor'?0:room==='eastDoor'?0:Math.PI;} }

const cameraSpots={stage:{position:[0,3.2,-6.8],target:[0,2,-13.8],name:'SHOW STAGE',number:'01'},dining:{position:[0,3.5,-4.9],target:[0,1.5,-10],name:'DINING ROOM',number:'02'},arcade:{position:[-8,2.7,-1.9],target:[-5,1.5,-7],name:'ARCADE',number:'03'},kitchen:{position:[8,3,-7],target:[7,1.5,-14],name:'KITCHEN',number:'04'},west:{position:[-3.7,2.2,-4],target:[-4.7,1.5,-13],name:'WEST HALL',number:'05'},east:{position:[3.7,2.2,-4],target:[4.7,1.5,-13],name:'EAST HALL',number:'06'}};
let selectedCam='stage', cameraUp=false, running=false, paused=false, ended=false, audioOn=true;
let elapsed=0, power=100, usage=1, lastFrame=performance.now(), moveEvents=0, survivalRecord=0, blackoutTime=0, noticeUntil=0, subtitleUntil=0, toastUntil=0, hearingLast=0, lookX=0, lookY=0;
let audioContext=null, masterGain=null, humOsc=null, humGain=null, staticNode=null, speechEnabled=true;
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function setView(){if(cameraUp){const c=cameraSpots[selectedCam];camera.position.set(...c.position);camera.lookAt(...c.target)}else{camera.position.copy(officePosition);camera.position.x+=lookX;camera.position.y+=lookY;camera.lookAt(lookX*.45,1.63+lookY*.3,-3.4)}}
function initAudio(){if(audioContext)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioContext=new AC();masterGain=audioContext.createGain();masterGain.gain.value=audioOn?.16:0;masterGain.connect(audioContext.destination);humOsc=audioContext.createOscillator();humOsc.type='sawtooth';humOsc.frequency.value=54;humGain=audioContext.createGain();humGain.gain.value=.18;humOsc.connect(humGain).connect(masterGain);humOsc.start();const osc2=audioContext.createOscillator();osc2.type='sine';osc2.frequency.value=108.5;const g2=audioContext.createGain();g2.gain.value=.045;osc2.connect(g2).connect(masterGain);osc2.start();}
function sound(type='tap',volume=.12){if(!audioContext||!audioOn)return;const now=audioContext.currentTime;const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type==='thud'?'sine':type==='alarm'?'sawtooth':'triangle';osc.frequency.setValueAtTime(type==='thud'?82:type==='alarm'?210:420,now);osc.frequency.exponentialRampToValueAtTime(type==='thud'?42:type==='alarm'?165:220,now+.18);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+.28);osc.connect(gain).connect(masterGain);osc.start();osc.stop(now+.3)}
function voice(text){if(!audioOn||!speechEnabled||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.9;u.pitch=.79;u.volume=.72;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/en/i.test(v.lang)&&/male|daniel|guy|alex|fred/i.test(v.name))||voices.find(v=>/en/i.test(v.lang))||null;speechSynthesis.speak(u)}catch(e){}}
function setSubtitle(text,duration=4200){ui.subtitle.textContent=`“${text}”`;ui.subtitle.classList.remove('hidden');subtitleUntil=performance.now()+duration;voice(text)}
function showToast(text,duration=2000){ui.toast.textContent=text;ui.toast.classList.remove('hidden');toastUntil=performance.now()+duration}
function showScreen(screen){for(const s of [ui.title,ui.intro,ui.pause,ui.end])s.classList.remove('visible');if(screen)screen.classList.add('visible')}
function startBriefing(){initAudio();sound('tap');showScreen(ui.intro);const lines=['Hey, new guy. If you’re hearing this, you made it through orientation. The old place has a few… quirks.','The mascots wander when the building gets quiet. Keep them out of this office. Doors work, but the generator doesn’t last forever.','Barnaby hates the cameras. Mags follows the music. And if you hear running… don’t wait to see what it is.'];let idx=0;function next(){if(idx>=lines.length)return;const text=lines[idx++];$('intro-caption').textContent=`“${text}”`;voice(text);if(idx<lines.length)setTimeout(next,5400)}next()}
function clockIn(){initAudio();if(audioContext?.state==='suspended')audioContext.resume();speechSynthesis?.cancel();sound('tap');elapsed=0;power=100;usage=1;moveEvents=0;blackoutTime=0;ended=false;paused=false;running=true;cameraUp=false;for(const [id,a]of Object.entries(cast)){a.node=0;a.moveAt=(id==='barnaby'?19:id==='mags'?27:48)+Math.random()*7;positionCharacter(id,a,1)}showScreen(null);ui.hud.classList.remove('hidden');setCameraUI(false);showToast('SHIFT STARTED · 12:00 AM',2500);setSubtitle('Doors lock in sixty seconds. Don’t leave your post.',4000);lastFrame=performance.now()}
function setCameraUI(on){cameraUp=on;ui.camera.classList.toggle('hidden',!on);ui.camName.classList.toggle('hidden',!on);$('monitor-button').classList.toggle('active',on);if(on){const c=cameraSpots[selectedCam];ui.feedLoc.textContent=c.name;$('feed-camera-number').textContent=`CAM ${c.number}`;ui.camName.textContent=`CAM ${c.number} · ${c.name}`;document.querySelectorAll('.cam-node').forEach(n=>n.classList.toggle('selected',n.dataset.cam===selectedCam));}setView()}
function toggleCamera(){if(!running||paused||ended||power<=0)return;setCameraUI(!cameraUp);sound(cameraUp?'tap':'thud',.08);if(cameraUp){usage=1+1+(doors.west.closed?1:0)+(doors.east.closed?1:0)+(doors.west.lightOn?1:0)+(doors.east.lightOn?1:0);showToast('CAMERA FEED ACTIVE',900)}else{showToast('SECURITY MONITOR LOWERED',900)}}
function toggleDoor(side){if(!running||paused||ended||power<=0)return;const d=doors[side];d.closed=!d.closed;$(`${side==='west'?'west':'east'}-door-state`).textContent=d.closed?'CLOSED':'OPEN';$(`${side==='west'?'left':'right'}-door-button`).classList.toggle('active',d.closed);sound(d.closed?'thud':'tap',.13);updateUsage();}
function toggleLight(side){if(!running||paused||ended||power<=0)return;const d=doors[side];d.lightOn=!d.lightOn;$(`${side}-light-state`).textContent=d.lightOn?'ON':'OFF';$(`${side==='west'?'left':'right'}-light-button`).classList.toggle('active',d.lightOn);sound('tap',.06);updateUsage();}
function updateUsage(){usage=1+(cameraUp?1:0)+(doors.west.closed?1:0)+(doors.east.closed?1:0)+(doors.west.lightOn?1:0)+(doors.east.lightOn?1:0);const bars=[...ui.usage.querySelectorAll('i')];bars.forEach((b,i)=>b.classList.toggle('on',i<usage));}
function moveEnemy(id,a){if(!running||paused||ended||power<=0)return;let chance=a.aggression+(elapsed/300)*.14;if(cameraUp&&selectedCam===a.room)chance*=.34;if(Math.random()>chance)return;
 if(a.room==='westDoor'||a.room==='eastDoor'){
  const side=a.room==='westDoor'?'west':'east';if(doors[side].closed){sound('thud',.3);a.node=Math.max(0,a.node-1);positionCharacter(id,a,0);a.moveAt=elapsed+12+Math.random()*10;showNotice(`${id==='barnaby'?'BARNABY':id==='mags'?'MAGS':'STITCH'} STRUCK THE ${side.toUpperCase()} DOOR`);return}triggerLoss(id,side);return;
 }
 a.node=Math.min(a.node+1,a.route.length-1);positionCharacter(id,a,0);a.moveAt=elapsed+10+Math.random()*14;moveEvents++;
 if(a.room==='west'||a.room==='east'){showNotice('MOTION DETECTED IN THE HALL');sound('alarm',.1);if(Math.random()<.54){const lines={barnaby:'Barnaby is getting closer. Keep watching the hall.',mags:'I can hear Mags singing. Check the east hall.',stitch:'That running… it’s Stitch. Shut the west door!'};setSubtitle(lines[id],3600)}}
}
function showNotice(text){ui.status.textContent=text;ui.warningText.textContent=text;ui.warning.classList.remove('hidden');noticeUntil=performance.now()+2600}
function triggerLoss(id,side){if(ended)return;ended=true;running=false;survivalRecord=Math.floor(elapsed);sound('alarm',.4);const model=cast[id].model;model.position.copy(officePosition).add(new THREE.Vector3(side==='west'?-1.4:1.4,-.9,-2));model.scale.setScalar(1.18);model.rotation.y=Math.PI;const title=id==='barnaby'?'BARNABY FOUND YOU':id==='mags'?'MAGS FOUND YOU':'STITCH FOUND YOU';endGame(false,title,`You reached ${formatTime()} AM before the office fell silent. Watch the hall lights, and close a door only when you have to.`)}
function endGame(won,title='YOU MADE IT.',copy='The sun is up. The dining room is quiet again.'){if(ended&&won)return;ended=true;running=false;paused=false;speechSynthesis?.cancel();showScreen(ui.end);$('end-title').textContent=title;$('end-copy').textContent=copy;$('end-kicker').textContent=won?'SHIFT REPORT // 06:00':'INCIDENT REPORT // SECURITY OFFICE';$('end-stats').innerHTML=`<span>TIME SURVIVED<b>${formatTime()} AM</b></span><span>GENERATOR LEFT<b>${Math.floor(power)}%</b></span><span>MOVEMENTS TRACKED<b>${moveEvents}</b></span>`;if(won){sound('tap',.18);setSubtitle('Shift complete. Thank you for choosing Barnsley Pizza.',5000)}else{voice('Welcome to the family.')} }
function formatTime(){const h=Math.floor(elapsed/50);return `${h===0?'12':h<12?h:h-12}:${String(Math.floor((elapsed%50)*60/50)).padStart(2,'0')}`}
function pauseGame(){if(!running||ended)return;paused=true;showScreen(ui.pause);sound('tap')}
function resumeGame(){if(!paused)return;paused=false;showScreen(null);lastFrame=performance.now();sound('tap')}
function restart(){speechSynthesis?.cancel();ui.hud.classList.add('hidden');showScreen(ui.title);ended=false;running=false;paused=false;cameraUp=false;setCameraUI(false)}

$('start-button').addEventListener('click',startBriefing);$('clock-in-button').addEventListener('click',clockIn);$('monitor-button').addEventListener('click',toggleCamera);$('left-door-button').addEventListener('click',()=>toggleDoor('west'));$('right-door-button').addEventListener('click',()=>toggleDoor('east'));$('left-light-button').addEventListener('click',()=>toggleLight('west'));$('right-light-button').addEventListener('click',()=>toggleLight('east'));$('pause-button').addEventListener('click',pauseGame);$('resume-button').addEventListener('click',resumeGame);$('restart-button').addEventListener('click',restart);$('again-button').addEventListener('click',restart);$('audio-button').addEventListener('click',()=>{audioOn=!audioOn;if(audioContext)masterGain.gain.setTargetAtTime(audioOn?.16:0,audioContext.currentTime,.08);$('audio-button').classList.toggle('active',!audioOn);if(!audioOn)speechSynthesis?.cancel();else initAudio()});
document.querySelectorAll('.cam-node').forEach(button=>button.addEventListener('click',()=>{selectedCam=button.dataset.cam;setCameraUI(true);sound('tap',.04)}));
window.addEventListener('keydown',e=>{if(['Space','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){paused?resumeGame():pauseGame();return}if(e.code==='Space'){toggleCamera();return}if(e.code==='KeyQ')toggleDoor('west');if(e.code==='KeyE')toggleDoor('east');if(e.code==='KeyA')toggleLight('west');if(e.code==='KeyD')toggleLight('east');if(e.code==='Digit1'){$('camera-map').querySelector('[data-cam="stage"]').click()}if(e.code==='Digit2'){$('camera-map').querySelector('[data-cam="dining"]').click()}if(e.code==='Digit3'){$('camera-map').querySelector('[data-cam="arcade"]').click()}if(e.code==='Digit4'){$('camera-map').querySelector('[data-cam="kitchen"]').click()}if(e.code==='Digit5'){$('camera-map').querySelector('[data-cam="west"]').click()}if(e.code==='Digit6'){$('camera-map').querySelector('[data-cam="east"]').click()}});
ui.canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||cameraUp)return;lookX=clamp((e.clientX/window.innerWidth-.5)*.45,-.23,.23);lookY=clamp((.5-e.clientY/window.innerHeight)*.22,-.12,.12)});
let touchStart=null;ui.canvas.addEventListener('touchstart',e=>{if(e.touches.length)touchStart=e.touches[0].clientX},{passive:true});ui.canvas.addEventListener('touchmove',e=>{if(e.touches.length&&touchStart!==null&&!cameraUp){lookX=clamp((e.touches[0].clientX/window.innerWidth-.5)*.5,-.25,.25)}},{passive:true});

function animateCharacters(dt,t){for(const [id,a]of Object.entries(cast)){if(!a.model.visible)continue;if(!ended){a.model.position.x=lerp(a.model.position.x,a.target.x,1-Math.exp(-dt*1.6));a.model.position.z=lerp(a.model.position.z,a.target.z,1-Math.exp(-dt*1.6));a.model.position.y=a.target.y+Math.sin(t*2.2+(id==='mags'?1:0))*.018;a.model.rotation.y=lerp(a.model.rotation.y,a.room==='westDoor'||a.room==='eastDoor'?0:Math.PI,Math.min(1,dt*2));const {head,limbs}=a.model.userData;head.rotation.y=Math.sin(t*.7+(id==='stitch'?1.4:0))*.045;limbs.forEach((limb,i)=>{limb.rotation.x=Math.sin(t*1.2+i*1.2+(id==='mags'?1:0))*.025});}}
}
function drawUI(t){const hour=Math.min(6,Math.floor(elapsed/50));ui.clock.textContent=`${hour===0?12:hour}:00`;ui.progress.style.width=`${Math.min(100,elapsed/300*100)}%`;ui.power.textContent=Math.max(0,Math.floor(power));ui.powerFill.style.width=`${Math.max(0,power)}%`;ui.powerFill.style.background=power<20?'#df4938':power<45?'#cf9e4e':'#d4be70';$('power-warning').classList.toggle('hidden',power>20);ui.warning.classList.toggle('hidden',t>noticeUntil);ui.subtitle.classList.toggle('hidden',t>subtitleUntil);ui.toast.classList.toggle('hidden',t>toastUntil);$('usage-bars').style.opacity=power<=0?'.25':'1';$('feed-timestamp').textContent=`REC ● 00:${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;
 for(const side of ['west','east']){const d=doors[side];d.group.position.y=lerp(d.group.position.y,d.closed?0:-3.6,.14);d.light.intensity=lerp(d.light.intensity,d.lightOn?30:0,.14);}
}
function step(now){requestAnimationFrame(step);const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;const t=now/1000;
 if(running&&!paused&&!ended){elapsed+=dt;if(elapsed>=300){elapsed=300;power=Math.max(0,power);drawUI(now);endGame(true);}
  if(!ended){const rate=.075*(1+(usage-1)*.72);power=Math.max(0,power-rate*dt);if(power<=0){blackoutTime+=dt;cameraUp=false;setCameraUI(false);doors.west.closed=doors.east.closed=false;doors.west.lightOn=doors.east.lightOn=false;usage=0;if(blackoutTime>10)triggerLoss('barnaby','west')}else blackoutTime=0;
   for(const[id,a]of Object.entries(cast))if(elapsed>=a.moveAt)moveEnemy(id,a);
   if(elapsed>0&&elapsed%70<dt&&elapsed-hearingLast>55){hearingLast=elapsed;if(Math.random()<.55){const lines=['You still there? Keep your eyes on the cameras.','There’s something by the arcade. I swear it wasn’t there before.','The kitchen has been disconnected since the incident. Don’t ask why.'];setSubtitle(lines[Math.floor(Math.random()*lines.length)],3400)}}
   if(Math.floor(elapsed)%35===0&&Math.floor(elapsed-dt)!==Math.floor(elapsed))for(const a of Object.values(cast))a.aggression=Math.min(.9,a.aggression+.012);
  }
 }
 updateUsage();drawUI(now);animateCharacters(dt,t);setView();renderer.render(scene,camera);
}
requestAnimationFrame(step);
ui.loading.classList.add('done');setTimeout(()=>ui.loading.remove(),800);

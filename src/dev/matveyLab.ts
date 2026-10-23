// Демо-страница Деда Матвея (только режим разработки: npm run dev → /?anim=matvey). В сборки продуктов не попадает.
// Матвей за столом домино: его кости, базар, цепочка; состояния, жесты партии, реакции и эмоции по кнопкам.
// ?anim=matvey&manual — время идёт только по window.matveyLab.step(ms): запись видео покадрово (tools/anim/record-matvey.mjs).
import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { MATVEY_MOTION } from '../characters/matvey/motions';
import { MATVEY_PUPPET } from '../characters/matvey/puppet';
import { renderJobs, type TextureJob } from '../characters/textures';
import { EMOTIONS, type Emotion } from '../characters/types';
import { BONE_BOX, boneBackSvg, boneFaceSvg } from '../games/dominoes/scene/boneArt';
import { BoneSprite } from '../games/dominoes/scene/boneSprite';
import { computeDominoLayout, fitChain, opponentBoneSlots } from '../layout/dominoes';
import { BG_DESIGN, FIGURE } from '../layout/layout';
import { PuppetRig } from '../puppet/rig';
import { puppetBank, puppetJobs } from '../puppet/textures';
import { cafeBackgroundSvg } from '../render/cafe';
import { drawCafeTable } from '../render/table';
import { easeInOutQuad, Tweener } from '../render/tween';

const UPRIGHT = Math.PI / 2;
// Пример цепочки: кости приставлены друг к другу (левое число — к левому концу).
const CHAIN: { hi: number; lo: number; left: number; right: number }[] = [
  { hi: 5, lo: 3, left: 3, right: 5 }, { hi: 5, lo: 5, left: 5, right: 5 }, { hi: 5, lo: 2, left: 5, right: 2 },
];
const NEXT: { hi: number; lo: number; left: number; right: number }[] = [
  { hi: 2, lo: 1, left: 2, right: 1 }, { hi: 6, lo: 1, left: 1, right: 6 }, { hi: 6, lo: 4, left: 6, right: 4 }, { hi: 4, lo: 0, left: 4, right: 0 },
];

export async function startMatveyLab(stageEl: HTMLElement, uiEl: HTMLElement): Promise<void> {
  const params = new URLSearchParams(location.search);
  const manual = params.has('manual');
  const app = new Application();
  await app.init({ resizeTo: stageEl, background: '#e8c796', antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
  stageEl.classList.remove('stage--hidden');
  stageEl.append(app.canvas);
  const rect = stageEl.getBoundingClientRect();
  const spec = computeDominoLayout({ width: rect.width || innerWidth, height: rect.height || innerHeight, pointer: 'fine' });
  const d = Math.min(window.devicePixelRatio || 1, 2);
  const figRes = Math.min(2.6, spec.character.scale * d);
  const boneRes = Math.min(4, ((spec.domino.handHalf * 2) / 96) * d * 1.1);
  const jobs: TextureJob[] = [...puppetJobs(MATVEY_PUPPET, figRes)];
  const faces = new Set([...CHAIN, ...NEXT].map((b) => `${b.hi}:${b.lo}`));
  for (const f of faces) {
    const [hi, lo] = f.split(':').map(Number) as [number, number];
    jobs.push({ key: `bone:${f}`, svg: boneFaceSvg(hi, lo), w: BONE_BOX.w * boneRes, h: BONE_BOX.h * boneRes });
  }
  jobs.push({ key: 'back', svg: boneBackSvg(), w: BONE_BOX.w * boneRes, h: BONE_BOX.h * boneRes });
  jobs.push({ key: 'bg', svg: cafeBackgroundSvg(), w: BG_DESIGN.width * Math.min(1, spec.background.scale * d), h: BG_DESIGN.height * Math.min(1, spec.background.scale * d) });
  const tex = await renderJobs(jobs);
  const back = tex.get('back')!;

  const root = new Container();
  app.stage.addChild(root);
  const bg = new Sprite(tex.get('bg')!);
  bg.position.set(spec.background.x, spec.background.y);
  bg.width = BG_DESIGN.width * spec.background.scale;
  bg.height = BG_DESIGN.height * spec.background.scale;
  const table = new Graphics();
  drawCafeTable(table, spec);
  const rig = new PuppetRig(MATVEY_MOTION, Number(params.get('seed') ?? 5));
  rig.setTextures(puppetBank(MATVEY_PUPPET, figRes, tex), null, back);
  const c = spec.character;
  const anchorY = c.crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
  rig.setTransform(c.x - FIGURE.centerX * c.scale, c.y - anchorY * c.scale, c.scale);
  const oppLayer = new Container();
  const bazaarLayer = new Container();
  const chainLayer = new Container();
  // Как в сцене домино (DominoScene): кости Матвея перед его руками, тянущаяся рука — над столом.
  root.addChild(bg, rig.back, table, rig.front, oppLayer, bazaarLayer, chainLayer, rig.overLayer);
  const tweens = new Tweener();

  // ---------- стол ----------
  let rowCount = 7;
  const chain = [...CHAIN];
  let nextIdx = 0;
  const layoutRow = () => {
    oppLayer.removeChildren().forEach((x) => x.destroy());
    for (const s of opponentBoneSlots(spec, rowCount)) {
      const b = new BoneSprite(null, null, back);
      b.setHalf(s.half);
      b.position.set(s.x, s.y);
      b.rotation = UPRIGHT;
      b.flip = 0;
      b.sync();
      oppLayer.addChild(b);
    }
  };
  const layoutBazaar = () => {
    const { x, y, half } = spec.domino.bazaar;
    for (let i = 0; i < 6; i++) {
      const b = new BoneSprite(null, null, back);
      b.setHalf(half);
      b.flip = 0;
      const col = i % 2, row = Math.floor(i / 2);
      b.position.set(x + (col - 0.5) * half * 0.5 + (row % 2) * 2, y + (row - 1) * half * 1.15);
      b.rotation = UPRIGHT;
      b.sync();
      bazaarLayer.addChild(b);
    }
  };
  const chainSprites: BoneSprite[] = [];
  const layoutChain = (instant: boolean) => {
    const plan = fitChain(chain, 0, spec);
    chain.forEach((bn, i) => {
      let sp = chainSprites[i];
      const pose = plan.poses[i]!;
      if (!sp) {
        sp = new BoneSprite(`${bn.hi}:${bn.lo}`, tex.get(`bone:${bn.hi}:${bn.lo}`)!, back);
        sp.position.set(pose.x, pose.y);
        sp.rotation = pose.rot;
        sp.setHalf(plan.half);
        chainSprites.push(sp);
        chainLayer.addChild(sp);
      }
      void tweens.to(sp, { x: pose.x, y: pose.y, rotation: pose.rot, flip: 1, half: plan.half }, instant ? 0 : 300 / rig.timeScale, { ease: easeInOutQuad });
    });
    return plan;
  };
  layoutRow();
  layoutBazaar();
  layoutChain(true);

  // Рука над столом — только когда кисть не перекрывает кости Матвея (как DominoScene.syncArmsLayer).
  const syncArms = () => {
    const want = rig.armsFront;
    const cur = rig.armOver;
    if (want === cur) return;
    const clear = (side: 'l' | 'r') => {
      const row = oppLayer.getBounds();
      return !rig.handBounds(side).some((h) => h.x < row.x + row.width && h.x + h.width > row.x && h.y < row.y + row.height && h.y + h.height > row.y);
    };
    if (cur && !clear(cur)) return;
    if (want && !clear(want)) {
      if (cur) rig.setArmOver(null);
      return;
    }
    rig.setArmOver(want);
  };

  // ---------- действия ----------
  let label = 'idle';
  const setState = (s: 'idle' | 'think') => {
    label = s;
    rig.setEmotion(s === 'think' ? 'think' : 'warm');
    rig.setPose(s);
  };
  const place = async () => {
    label = 'place';
    if (rowCount <= 1) {
      rowCount = 7;
      layoutRow();
    }
    const bn = NEXT[nextIdx++ % NEXT.length]!;
    chain.push(bn);
    const plan = fitChain(chain, 0, spec);
    const pose = plan.poses[chain.length - 1]!;
    const rel = await rig.throwCard(root.toGlobal(pose), () => {
      rowCount--;
      layoutRow();
    });
    const sp = new BoneSprite(`${bn.hi}:${bn.lo}`, tex.get(`bone:${bn.hi}:${bn.lo}`)!, back);
    const local = root.toLocal({ x: rel.x, y: rel.y });
    sp.position.set(local.x, local.y);
    sp.rotation = rel.rotation;
    sp.setHalf(rel.w > 0 ? rel.w / 2 : plan.half);
    sp.flip = 0;
    sp.zIndex = 3;
    chainSprites.push(sp);
    chainLayer.addChild(sp);
    (rig.armOver ? rig.overLayer : rig.releaseLayer).attach(sp);
    layoutChain(false);
    void tweens.wait(300 / rig.timeScale).then(() => sp.parentRenderLayer?.detach(sp));
    if (chain.length > 7) {
      chain.splice(3);
      chainSprites.splice(3).forEach((x) => x.destroy());
      void tweens.wait(1500 / rig.timeScale).then(() => layoutChain(false));
    }
  };
  const draw = async () => {
    label = 'draw';
    rig.setEmotion('think');
    rig.setPose('took', 1400);
    await rig.gesture('draw', root.toGlobal({ x: spec.domino.bazaar.x, y: spec.domino.bazaar.y }), 'release');
    rowCount = Math.min(12, rowCount + 1);
    layoutRow();
  };
  const knock = async () => {
    label = 'knock';
    rig.setEmotion('annoyed');
    await rig.gesture('knock', undefined, 'tap');
    for (const x of oppLayer.children) {
      const y = x.y;
      void tweens.to(x, { y: y - 4 }, 70).then(() => tweens.to(x, { y }, 110));
    }
  };
  const react = (gesture: string, emotion: Emotion) => {
    label = gesture;
    rig.setEmotion(emotion);
    void rig.gesture(gesture);
  };
  const victory = () => {
    label = 'victory';
    rig.setEmotion('laugh');
    rig.setPose('victory');
  };
  const reset = () => {
    label = 'idle';
    rig.setEmotion('warm');
    rig.setPose('idle');
  };
  let emoIndex = 0;
  const nextEmotion = (): Emotion => {
    emoIndex = (emoIndex + 1) % EMOTIONS.length;
    rig.setEmotion(EMOTIONS[emoIndex]!);
    return EMOTIONS[emoIndex]!;
  };
  // Проверка форм рта (без звука): уровень голоса меняется по слогам — для будущей озвучки владельцем.
  let mouthTest = 0;
  const mouthLevel = (ms: number): number => {
    if (mouthTest <= 0) return 0;
    mouthTest -= ms;
    const t = 3000 - mouthTest;
    const syl = Math.floor(t / 210);
    return mouthTest <= 0 || syl % 5 === 4 ? 0 : 0.25 + ((syl * 37) % 70) / 100;
  };

  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:8px 16px;border-radius:12px;background:rgba(40,24,16,.78);color:#fff8ec;font:700 22px system-ui,sans-serif;z-index:6;display:none';
  const perf = { frames: 0, ms: 0, max: 0 };
  const step = (ms: number) => {
    const t0 = performance.now();
    rig.setSpeaking(mouthLevel(ms * rig.timeScale));
    rig.update(ms);
    syncArms();
    const spent = performance.now() - t0;
    perf.frames++;
    perf.ms += spent;
    perf.max = Math.max(perf.max, spent);
    tweens.update(ms);
    for (const layer of [oppLayer, chainLayer]) for (const x of layer.children) if (x instanceof BoneSprite) x.sync();
  };
  const render = () => app.render();
  if (manual) app.ticker.stop();
  else app.ticker.add((tk) => step(tk.deltaMS));

  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;left:12px;top:12px;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100% - 24px);z-index:5;font:600 14px system-ui,sans-serif';
  const btn = (text: string, fn: () => void, id: string) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.id = id;
    b.style.cssText = 'padding:8px 12px;border-radius:10px;border:2px solid #3b2418;background:#fff8ec;cursor:pointer';
    b.addEventListener('click', fn);
    panel.append(b);
    return b;
  };
  btn('Ожидание', () => setState('idle'), 'lab-idle');
  btn('Раздумье', () => setState('think'), 'lab-think');
  btn('Кладёт кость', () => void place(), 'lab-place');
  btn('Из базара', () => void draw(), 'lab-draw');
  btn('Стучит', () => void knock(), 'lab-knock');
  btn('Ход соперника', () => react('watchPlay', 'think'), 'lab-watch');
  btn('Доволен', () => react('satisfied', 'sly'), 'lab-satisfied');
  btn('Ворчит', () => react('grumble', 'annoyed'), 'lab-grumble');
  btn('Удивлён', () => react('surprised', 'surprise'), 'lab-surprised');
  btn('Рука выиграна', () => react('handWin', 'laugh'), 'lab-handwin');
  btn('Рука проиграна', () => react('handLose', 'sad'), 'lab-handlose');
  btn('«Рыба!»', () => react('slap', 'azart'), 'lab-slap');
  btn('Ничья', () => react('shrug', 'surprise'), 'lab-shrug');
  btn('Победа', victory, 'lab-victory');
  btn('Поражение: кепка', () => react('capTip', 'warm'), 'lab-captip');
  btn('Сброс', reset, 'lab-reset');
  const emo = btn('Эмоция: warm', () => (emo.textContent = `Эмоция: ${nextEmotion()}`), 'lab-emotion');
  btn('Рот (без звука)', () => (mouthTest = 3000), 'lab-mouth');
  const speed = btn('Скорость 1×', () => {
    rig.timeScale = rig.timeScale === 1 ? 0.5 : rig.timeScale === 0.5 ? 0.25 : 1;
    speed.textContent = `Скорость ${rig.timeScale}×`;
  }, 'lab-speed');
  btn('Шарниры', () => (rig.showJoints = !rig.showJoints), 'lab-joints');
  uiEl.replaceChildren(...(manual ? [] : [panel]), caption);

  Object.defineProperty(window, 'matveyLab', {
    configurable: true,
    value: {
      step: (ms: number) => {
        step(ms);
        render();
      },
      setState,
      place,
      draw,
      knock,
      react,
      victory,
      reset,
      nextEmotion,
      mouth: () => (mouthTest = 3000),
      setSpeed: (k: number) => (rig.timeScale = k),
      setJoints: (v: boolean) => (rig.showJoints = v),
      freeze: (v: boolean) => {
        rig.reducedMotion = v;
        step(16);
        render();
      },
      state: () => ({ label, pose: rig.currentPose, emotion: rig.currentEmotion, gesture: rig.brain.gestureId, over: rig.armOver, want: rig.armsFront, blinks: rig.blinks, row: rowCount }),
      caption: (text: string) => {
        caption.textContent = text;
        caption.style.display = text ? 'block' : 'none';
      },
      perf: () => ({ updateAvgMs: perf.ms / Math.max(1, perf.frames), updateMaxMs: perf.max, frames: perf.frames, figRes }),
    },
  });
  render();
}

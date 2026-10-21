// Демо-страница анимаций персонажа (только режим разработки: npm run dev → /?anim). В сборки продуктов не попадает.
// Агата за столом кафе: ожидание, раздумье, бросок карты на стол; замедление, шарниры, сравнение со старым ригом.
// ?anim&manual — время идёт только по window.animLab.step(ms): запись видео покадрово, независимо от скорости машины.
import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { AGATA_ART } from '../characters/agata/art';
import { AGATA_MOTION } from '../characters/agata/motions';
import { AGATA_PUPPET } from '../characters/agata/puppet';
import { PuppetRig } from '../puppet/rig';
import { puppetBank, puppetJobs } from '../puppet/textures';
import { CharacterRig } from '../characters/rig';
import { characterBank, characterJobs, renderJobs, type TextureJob } from '../characters/textures';
import type { Emotion } from '../characters/types';
import { CARD_BOX, cardBackSvg, cardFaceSvg } from '../games/durak/scene/cardArt';
import { CardSprite } from '../games/durak/scene/cardSprite';
import { BG_DESIGN, computeLayout, FIGURE, pairSlot } from '../layout/layout';
import { cafeBackgroundSvg } from '../render/cafe';
import { drawCafeTable } from '../render/table';
import { easeInOutQuad, Tweener } from '../render/tween';

type Mode = 'idle' | 'think';

export async function startAnimLab(stageEl: HTMLElement, uiEl: HTMLElement): Promise<void> {
  const params = new URLSearchParams(location.search);
  const manual = params.has('manual');
  const app = new Application();
  await app.init({ resizeTo: stageEl, background: '#e8c796', antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
  stageEl.classList.remove('stage--hidden');
  stageEl.append(app.canvas);
  const rect = stageEl.getBoundingClientRect();
  const spec = computeLayout({ width: rect.width || innerWidth, height: rect.height || innerHeight, pointer: 'fine' });
  const d = Math.min(window.devicePixelRatio || 1, 2);
  const figRes = Math.min(2.6, spec.character.scale * d);
  const cardRes = Math.min(5, (spec.tableCard.w / 48) * d);
  // Текстуры: части марионетки, слои старого рига (для сравнения), две карты, фон.
  const jobs: TextureJob[] = [...puppetJobs(AGATA_PUPPET, figRes), ...characterJobs(AGATA_ART, figRes)];
  jobs.push({ key: 'card:QH', svg: cardFaceSvg('H', 12), w: CARD_BOX.w * cardRes, h: CARD_BOX.h * cardRes });
  jobs.push({ key: 'card:7S', svg: cardFaceSvg('S', 7), w: CARD_BOX.w * cardRes, h: CARD_BOX.h * cardRes });
  jobs.push({ key: 'back', svg: cardBackSvg(), w: CARD_BOX.w * cardRes, h: CARD_BOX.h * cardRes });
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
  const rig = new PuppetRig(AGATA_MOTION, Number(params.get('seed') ?? 7));
  rig.setTextures(puppetBank(AGATA_PUPPET, figRes, tex), back);
  const old = new CharacterRig();
  old.setTextures(characterBank(AGATA_ART, tex), back);
  const c = spec.character;
  const anchorY = c.crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
  for (const r of [rig, old]) r.setTransform(c.x - FIGURE.centerX * c.scale, c.y - anchorY * c.scale, c.scale);
  const cards = new Container();
  root.addChild(bg, rig.back, old.back, table, rig.front, old.front, cards);
  const tweens = new Tweener();
  let showOld = false;
  const syncWhich = () => {
    rig.back.visible = rig.front.visible = !showOld;
    old.back.visible = old.front.visible = showOld;
  };
  syncWhich();

  // ---------- действия ----------
  let mode: Mode = 'idle';
  let slot = 0;
  const setMode = (m: Mode) => {
    mode = m;
    const emotion: Emotion = m === 'think' ? 'think' : 'warm';
    for (const r of [rig, old]) {
      r.setEmotion(emotion);
      r.setPose(m === 'think' ? 'think' : 'idle');
    }
    render();
  };
  const throwCard = async () => {
    if (cards.children.length >= 4) cards.removeChildren().forEach((x) => x.destroy());
    const i = slot++ % 4;
    const target = root.toGlobal(pairSlot(spec, i, 4));
    const code = i % 2 ? '7S' : 'QH';
    if (showOld) {
      // Старый риг: поза броска и карта из точки веера одновременно — как в игре до прототипа.
      old.setEmotion('sly');
      old.setPose('throw', 1400);
      const f = old.fanPoint();
      launch(code, { x: f.x, y: f.y, rotation: 0 }, target);
      return;
    }
    rig.setEmotion('sly');
    const rel = await rig.throwCard(target);
    launch(code, rel, target);
    setTimeout(() => rig.setEmotion(mode === 'think' ? 'think' : 'warm'), 2200 / rig.timeScale);
  };
  const launch = (code: string, from: { x: number; y: number; rotation: number }, to: { x: number; y: number }) => {
    const sp = new CardSprite(code, tex.get(`card:${code}`)!, back);
    const local = root.toLocal(from);
    sp.position.set(local.x, local.y);
    sp.rotation = from.rotation;
    sp.flip = 0;
    sp.setCardSize(spec.tableCard.w * 0.82, spec.tableCard.h * 0.82);
    cards.addChild(sp);
    const dest = root.toLocal(to);
    // Полёт и переворот — как у карты на столе в игре (DurakScene.place: 280 мс).
    void tweens.to(sp, { x: dest.x, y: dest.y, rotation: ((i++ % 3) - 1) * 0.08, flip: 1 }, 300 / rig.timeScale, { ease: easeInOutQuad });
    void tweens.to(sp.scale, { x: spec.tableCard.w / (spec.tableCard.w * 0.82), y: spec.tableCard.h / (spec.tableCard.h * 0.82) }, 300 / rig.timeScale);
  };
  let i = 0;

  // Подпись для видеозаписи.
  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:8px 16px;border-radius:12px;background:rgba(40,24,16,.78);color:#fff8ec;font:700 22px system-ui,sans-serif;z-index:6;display:none';
  // ---------- время ----------
  const perf = { frames: 0, ms: 0, max: 0 };
  const step = (ms: number) => {
    const t0 = performance.now();
    rig.update(ms);
    const spent = performance.now() - t0;
    perf.frames++;
    perf.ms += spent;
    perf.max = Math.max(perf.max, spent);
    old.update(ms * rig.timeScale);
    tweens.update(ms);
    for (const x of cards.children) if (x instanceof CardSprite) x.sync();
  };
  const render = () => app.render();
  if (manual) app.ticker.stop();
  else app.ticker.add((tk) => step(tk.deltaMS));

  // ---------- панель ----------
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;left:12px;top:12px;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100% - 24px);z-index:5;font:600 14px system-ui,sans-serif';
  const btn = (label: string, fn: () => void, id: string) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.id = id;
    b.style.cssText = 'padding:8px 12px;border-radius:10px;border:2px solid #3b2418;background:#fff8ec;cursor:pointer';
    b.addEventListener('click', fn);
    panel.append(b);
    return b;
  };
  btn('Ожидание', () => setMode('idle'), 'lab-idle');
  btn('Раздумье', () => setMode('think'), 'lab-think');
  btn('Бросок карты', () => void throwCard(), 'lab-throw');
  const speed = btn('Скорость 1×', () => {
    rig.timeScale = rig.timeScale === 1 ? 0.5 : rig.timeScale === 0.5 ? 0.25 : 1;
    speed.textContent = `Скорость ${rig.timeScale}×`;
  }, 'lab-speed');
  const joints = btn('Шарниры', () => {
    rig.showJoints = !rig.showJoints;
    joints.style.background = rig.showJoints ? '#f4c542' : '#fff8ec';
  }, 'lab-joints');
  const was = btn('Было (старый риг)', () => {
    showOld = !showOld;
    was.style.background = showOld ? '#f4c542' : '#fff8ec';
    syncWhich();
  }, 'lab-old');
  // Покадровая запись — без панели.
  uiEl.replaceChildren(...(manual ? [] : [panel]), caption);

  // Управление для записи видео и сравнения с исходником (tools/anim/).
  Object.defineProperty(window, 'animLab', {
    configurable: true,
    value: {
      step: (ms: number) => {
        step(ms);
        render();
      },
      setMode,
      throwCard,
      setSpeed: (k: number) => (rig.timeScale = k),
      setJoints: (v: boolean) => (rig.showJoints = v),
      showOld: (v: boolean) => {
        showOld = v;
        syncWhich();
        render();
      },
      setEmotion: (e: Emotion) => {
        rig.setEmotion(e);
        old.setEmotion(e);
      },
      /** Нейтральная поза без блуждания, дыхания и моргания — для сравнения с исходным рисунком. */
      freeze: (v: boolean) => {
        rig.reducedMotion = v;
        old.reducedMotion = v;
        step(16);
        render();
      },
      characterBox: () => ({ x: c.x - FIGURE.centerX * c.scale, y: c.y - (anchorY - FIGURE.headTop) * c.scale - 20 * c.scale, w: FIGURE.width * c.scale, h: (anchorY - FIGURE.headTop + 60) * c.scale }),
      state: () => ({ mode, pose: rig.currentPose, emotion: rig.currentEmotion, blinks: rig.blinks, cards: cards.children.length }),
      caption: (text: string) => {
        caption.textContent = text;
        caption.style.display = text ? 'block' : 'none';
      },
      /** Время обновления рига на кадр, мс (средне и максимум), и объём текстур персонажа. */
      perf: () => {
        const texBytes = (keys: string[]) => keys.reduce((sum, k) => {
          const t = tex.get(k);
          return sum + (t ? t.source.pixelWidth * t.source.pixelHeight * 4 : 0);
        }, 0);
        const all = [...tex.keys()];
        return {
          updateAvgMs: perf.ms / Math.max(1, perf.frames),
          updateMaxMs: perf.max,
          frames: perf.frames,
          puppetTextureMB: texBytes(all.filter((k) => k.startsWith('agata:part:') || k.startsWith('agata:mouth:'))) / 1048576,
          oldRigTextureMB: texBytes(all.filter((k) => k.startsWith('agata:') && !k.startsWith('agata:part:') && !k.startsWith('agata:mouth:'))) / 1048576,
          figRes,
        };
      },
      clear: () => cards.removeChildren().forEach((x) => x.destroy()),
    },
  });
  render();
}

// Страница проверки анимаций персонажа (только режим разработки: npm run dev → /?life=agata|matvey|khariton|kostyan).
// Персонаж за краем стола; слева — кнопки на каждую его анимацию: особые сценки, сценки, привычки, жесты-реакции,
// базовые состояния, эмоции и «речь» (держит ключи waitSpeech). Вверху — переключатель персонажей.
// ?life=<id>&manual — время идёт только по window.lifeLab.step(ms): снимки и видео покадрово. В сборки не попадает.
import { Application, Graphics } from 'pixi.js';
import { AGATA_MOTION } from '../characters/agata/motions';
import { AGATA_PUPPET } from '../characters/agata/puppet';
import { KHARITON_MOTION } from '../characters/khariton/motions';
import { KHARITON_PUPPET } from '../characters/khariton/puppet';
import { KOSTYAN_MOTION } from '../characters/kostyan/motions';
import { KOSTYAN_PUPPET } from '../characters/kostyan/puppet';
import { MATVEY_MOTION } from '../characters/matvey/motions';
import { MATVEY_PUPPET } from '../characters/matvey/puppet';
import { renderJobs } from '../characters/textures';
import { EMOTIONS, type Emotion } from '../characters/types';
import type { PuppetArt } from '../puppet/art';
import { PuppetRig } from '../puppet/rig';
import { puppetBank, puppetJobs } from '../puppet/textures';
import type { MotionStyle } from '../puppet/types';

const CHARACTERS: Record<string, { art: PuppetArt; motion: MotionStyle; bg: string }> = {
  agata: { art: AGATA_PUPPET, motion: AGATA_MOTION, bg: '#f1dcc0' },
  matvey: { art: MATVEY_PUPPET, motion: MATVEY_MOTION, bg: '#e8c796' },
  khariton: { art: KHARITON_PUPPET, motion: KHARITON_MOTION, bg: '#5f7a5f' },
  kostyan: { art: KOSTYAN_PUPPET, motion: KOSTYAN_MOTION, bg: '#3a2f63' },
};

export async function startLifeLab(stageEl: HTMLElement, uiEl: HTMLElement, id: string): Promise<void> {
  const ch = CHARACTERS[id] ?? CHARACTERS.agata!;
  const manual = new URLSearchParams(location.search).has('manual');
  const app = new Application();
  await app.init({ resizeTo: stageEl, background: ch.bg, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
  stageEl.classList.remove('stage--hidden');
  stageEl.append(app.canvas);
  const W = stageEl.clientWidth || innerWidth, H = stageEl.clientHeight || innerHeight;
  // Слева — панель кнопок (кроме покадрового режима): персонаж стоит по центру оставшегося места.
  // На вертикальном экране (телефон) панель — внизу, персонаж — в верхней половине.
  const portrait = H > W;
  const panelW = manual || portrait ? 0 : Math.min(376, W * 0.46 + 16);
  const usableH = !manual && portrait ? H * 0.5 : H;
  const scale = Math.min((W - panelW) / 520, (usableH - 40) / 470);
  const tex = await renderJobs(puppetJobs(ch.art, Math.min(2.6, scale * 2)));
  const rig = new PuppetRig(ch.motion, 7);
  rig.setTextures(puppetBank(ch.art, Math.min(2.6, scale * 2), tex), null, null);
  rig.setTransform(panelW + (W - panelW) / 2 - 210 * scale, 20 + 30 * scale, scale);
  // Край стола — как в игре: корпус за столом, руки над ним.
  const table = new Graphics().rect(0, 20 + (30 + 392) * scale, W, H).fill(0x2b6e64).rect(0, 20 + (30 + 386) * scale, W, 10 * scale).fill(0x7a4a2a);
  app.stage.addChild(rig.back, table, rig.front);
  if (manual) app.ticker.stop();
  else app.ticker.add((tk) => rig.update(tk.deltaMS));

  let talkLeft = 0;
  const scenes = ch.motion.scenes ?? [];
  const log: string[] = [];
  const play = (sid: string): Promise<void> => {
    const sc = scenes.find((s) => s.id === sid);
    if (!sc) return Promise.resolve();
    if (sc.emotion) rig.setEmotion(sc.emotion);
    log.push(`start:${sid}`);
    return rig.playScene(sc.gesture, (name) => {
      log.push(`${name}:${sid}`);
      // «Реплика»: 2,5 с — как будто зазвучала запись; ключи waitSpeech ждут её конца.
      if (name === 'say') talkLeft = 2500;
    }).then(() => {
      log.push(`end:${sid}`);
      rig.setEmotion('warm');
    });
  };
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      talkLeft = Math.max(0, talkLeft - 16);
      rig.brain.talking = talkLeft > 0;
      rig.setSpeaking(talkLeft > 0 ? 0.35 + 0.3 * Math.abs(Math.sin(t / 90)) : 0);
      rig.update(16);
    }
    app.render();
  };
  if (!manual) app.ticker.add(() => {
    talkLeft = Math.max(0, talkLeft - app.ticker.deltaMS);
    rig.brain.talking = talkLeft > 0;
    rig.setSpeaking(talkLeft > 0 ? 0.5 : 0);
  });

  // ---------- панель: кнопка на каждую анимацию ----------
  const NAMES: Record<string, string> = { agata: 'Агата', matvey: 'Матвей', khariton: 'Харитон', kostyan: 'Костян' };
  const panel = document.createElement('div');
  panel.style.cssText = (portrait ? 'position:absolute;left:8px;right:8px;bottom:8px;height:calc(50% - 16px);' : 'position:absolute;left:8px;top:8px;bottom:8px;width:min(360px,46vw);')
    + 'overflow:auto;z-index:5;'
    + 'background:rgba(255,248,236,.93);border:2px solid #3b2418;border-radius:12px;padding:8px 10px;font:600 13px system-ui,sans-serif;color:#3b2418';
  const status = document.createElement('div');
  status.style.cssText = 'margin:2px 0 6px;font-weight:400;min-height:1.2em';
  const say = (t: string) => (status.textContent = t);
  const section = (title: string) => {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'margin:8px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;opacity:.75';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
    panel.append(h, row);
    return row;
  };
  const btn = (row: HTMLElement, label: string, fn: () => void, id: string) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.anim = id;
    b.style.cssText = 'padding:5px 8px;border-radius:8px;border:2px solid #3b2418;background:#fff;cursor:pointer;font:600 12px system-ui,sans-serif';
    b.onclick = () => {
      fn();
      say(`▶ ${label}`);
    };
    row.append(b);
    return b;
  };
  // Персонажи.
  const who = section('Персонаж');
  for (const [cid, name] of Object.entries(NAMES)) {
    const a = document.createElement('a');
    a.textContent = name;
    a.href = `?life=${cid}`;
    a.style.cssText = `padding:5px 8px;border-radius:8px;border:2px solid #3b2418;text-decoration:none;color:#3b2418;background:${cid === id ? '#f4c542' : '#fff'}`;
    who.append(a);
  }
  panel.append(status);
  // Сценки по уровням (MotionStyle.scenes): особые, обычные, привычки.
  const TIERS: [string, string][] = [['special', 'Особые сценки'], ['scene', 'Сценки'], ['habit', 'Привычки (без слов)']];
  for (const [tier, title] of TIERS) {
    const list = scenes.filter((x) => (x.tier ?? 'scene') === tier);
    if (list.length === 0) continue;
    const row = section(`${title} — ${list.length}`);
    for (const x of list) btn(row, x.id, () => void play(x.id), `scene:${x.id}`);
  }
  // Жесты-реакции и игровые жесты (MotionStyle.gestures).
  const gestures = Object.keys(ch.motion.gestures ?? {});
  if (gestures.length > 0) {
    const row = section(`Жесты — ${gestures.length}`);
    for (const g of gestures) btn(row, g, () => void rig.gesture(g), `gesture:${g}`);
  }
  // Базовые состояния (у каждого — свои мелкие действия и вход).
  const states = section('Состояния');
  for (const [st, label] of [['idle', 'Ожидание'], ['think', 'Раздумье'], ['took', 'Взял / неудача'], ['victory', 'Победа']] as const) {
    btn(states, label, () => {
      rig.brain.stopGesture();
      rig.setPose(st);
    }, `state:${st}`);
  }
  // Эмоции, речь, служебное.
  const emos = section('Эмоции');
  for (const e of EMOTIONS) btn(emos, e, () => rig.setEmotion(e), `emotion:${e}`);
  const misc = section('Речь и прочее');
  btn(misc, 'Речь 2,5 с', () => (talkLeft = 2500), 'speak');
  btn(misc, 'Стоп', () => {
    rig.brain.stopGesture();
    rig.setPose('idle');
    rig.setEmotion('warm');
  }, 'stop');
  uiEl.replaceChildren(...(manual ? [] : [panel]));

  Object.defineProperty(window, 'lifeLab', {
    configurable: true,
    value: {
      step,
      play,
      scenes: () => scenes.map((s) => ({ id: s.id, duration: s.gesture.duration, tier: s.tier ?? 'scene' })),
      emotion: (e: Emotion) => rig.setEmotion(e),
      /** Жесты-реакции персонажа (MotionStyle.gestures) и базовые состояния — для обзора всех анимаций. */
      gestures: () => Object.keys(ch.motion.gestures ?? {}),
      gesture: (gid: string) => rig.gesture(gid),
      setState: (st: 'idle' | 'think' | 'took' | 'victory') => rig.setPose(st),
      state: () => ({ gesture: rig.brain.gestureId, propL: rig.brain.propL, propR: rig.brain.propR, emotion: rig.currentEmotion, talking: rig.brain.talking }),
      log: () => [...log],
    },
  });
}

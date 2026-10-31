// Демо-страница «своей жизни» персонажей (только режим разработки: npm run dev → /?life=agata|matvey|khariton|kostyan).
// Персонаж за краем стола, кнопки — все его сценки (MotionStyle.scenes), эмоции, «речь» (держит ключи waitSpeech).
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
  const scale = Math.min(W / 520, (H - 40) / 470);
  const tex = await renderJobs(puppetJobs(ch.art, Math.min(2.6, scale * 2)));
  const rig = new PuppetRig(ch.motion, 7);
  rig.setTextures(puppetBank(ch.art, Math.min(2.6, scale * 2), tex), null, null);
  rig.setTransform(W / 2 - 210 * scale, 20 + 30 * scale, scale);
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

  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;left:8px;top:8px;display:flex;flex-wrap:wrap;gap:4px;max-width:96vw;z-index:5';
  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    panel.append(b);
    return b;
  };
  for (const s of scenes) btn(s.id, () => void play(s.id));
  let ei = 0;
  const emo = btn('Эмоция: warm', () => {
    ei = (ei + 1) % EMOTIONS.length;
    rig.setEmotion(EMOTIONS[ei]!);
    emo.textContent = `Эмоция: ${EMOTIONS[ei]}`;
  });
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

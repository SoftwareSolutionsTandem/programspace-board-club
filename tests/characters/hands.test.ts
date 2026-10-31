// Единый стандарт кистей (docs/ART_STYLE.md §5.7, D68) и реквизит, согласованный со взглядом.
import { describe, expect, it } from 'vitest';
import { handSvg } from '../../src/characters/hands';
import { HAND as AGATA_HAND } from '../../src/characters/agata/art';
import { HAND as MATVEY_HAND } from '../../src/characters/matvey/art';
import { HAND as KHARITON_HAND } from '../../src/characters/khariton/art';
import { HAND as KOSTYAN_HAND } from '../../src/characters/kostyan/art';
import { AGATA_PUPPET } from '../../src/characters/agata/puppet';
import { MATVEY_PUPPET } from '../../src/characters/matvey/puppet';
import { KHARITON_PUPPET } from '../../src/characters/khariton/puppet';
import { KOSTYAN_PUPPET } from '../../src/characters/kostyan/puppet';
import { KOSTYAN_MOTION } from '../../src/characters/kostyan/motions';
import { puppetJobs } from '../../src/puppet/textures';

const STYLES = { agata: AGATA_HAND, matvey: MATVEY_HAND, khariton: KHARITON_HAND, kostyan: KOSTYAN_HAND };
const PUPPETS = [AGATA_PUPPET, MATVEY_PUPPET, KHARITON_PUPPET, KOSTYAN_PUPPET];

describe('единый стандарт кистей', () => {
  it('у всех — одна конструкция и общие правила: контур, толщина линии, кисть и кулак', () => {
    for (const [id, s] of Object.entries(STYLES)) {
      expect(s.outline, id).toBe('#3B2418');
      expect(s.line, id).toBe(3.2);
      const open = handSvg(s), fist = handSvg(s, true);
      expect(open, id).toContain(s.skin);
      expect(open, id).toContain(s.skinSh);
      expect(fist, id).not.toBe(open);
      expect(open).not.toMatch(/NaN|undefined/);
      expect(fist).not.toMatch(/NaN|undefined/);
    }
  });
  it('характер — в параметрах: персонажи не копируют друг друга', () => {
    const keys = Object.values(STYLES).map((s) => JSON.stringify([s.palm, s.fingers, s.thumb, s.knuckles, s.ring ?? null]));
    expect(new Set(keys).size).toBe(4);
  });
  it('у каждой марионетки есть кисть и кулак; правая — зеркало левой; кисть помещается в свою область', () => {
    for (const p of PUPPETS) {
      expect(p.handFist, p.id).toBeDefined();
      expect(p.mirrorHandR, p.id).toBe(true);
      // Область кисти симметрична: центр спрайта (anchor 0.5) — точка кисти рига.
      expect(p.hand.box.x * 2 + p.hand.box.w, p.id).toBe(0);
      expect(p.hand.box.y * 2 + p.hand.box.h, p.id).toBe(0);
    }
  });
  it('Агата: кисть по предплечью (движения сделаны под круглую кисть), накладки шали на плечи — в текстурах', () => {
    expect(AGATA_PUPPET.handAlongArm?.limit).toBeGreaterThan(0);
    expect(AGATA_PUPPET.shoulderCaps).toHaveLength(2);
    const keys = puppetJobs(AGATA_PUPPET, 1).map((j) => j.key);
    for (const c of AGATA_PUPPET.shoulderCaps!) expect(keys).toContain(`agata:part:${c.key}`);
  });
});

describe('реквизит согласован со взглядом', () => {
  it('Костян смотрит в телефон — зрителю видна задняя крышка (phoneLook), экраном к зрителю телефон в сценках не появляется', () => {
    expect(KOSTYAN_PUPPET.props?.phoneLook).toBeDefined();
    const used = new Set<string>();
    for (const s of KOSTYAN_MOTION.scenes ?? []) for (const k of s.gesture.keys) for (const v of Object.values(k.props ?? {})) if (v) used.add(v);
    expect(used.has('phoneLook')).toBe(true);
    expect(used.has('phone')).toBe(false);
  });
});

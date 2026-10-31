// Кисти всех персонажей — «варежка» (docs/ART_STYLE.md §5.7, D70) — и реквизит, согласованный со взглядом.
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

describe('кисть-варежка у всех', () => {
  it('одна конструкция: овал ладони и большой палец (без пальцев), кулак отличается', () => {
    for (const [id, s] of Object.entries(STYLES)) {
      expect(s.outline, id).toBe('#3B2418');
      const open = handSvg(s), fist = handSvg(s, true);
      expect(open.match(/<ellipse/g)?.length, id).toBe(6);
      expect(fist.match(/<ellipse/g)?.length, id).toBe(6);
      expect(open, id).not.toBe(fist);
      expect(open + fist).not.toMatch(/NaN|undefined/);
    }
  });
  it('большой палец — за ладонью: в рисунке он раньше ладони (ладонь его перекрывает)', () => {
    for (const [id, s] of Object.entries(STYLES)) {
      for (const svg of [handSvg(s), handSvg(s, true)]) {
        const ellipses = [...svg.matchAll(/<ellipse cx="([^"]+)"/g)].map((m) => Number(m[1]));
        // Последняя пара заливок — ладонь (центр в 0), палец залит до неё.
        expect(ellipses.at(-1), id).toBeCloseTo(-1.2, 5);
        expect(ellipses.slice(0, 4).some((x) => x > 1), id).toBe(true);
      }
    }
  });
  it('характер — в цвете и размере: стили не совпадают', () => {
    expect(new Set(Object.values(STYLES).map((s) => JSON.stringify(s))).size).toBe(4);
  });
  it('у каждой марионетки есть кисть и кулак; правая — зеркало левой; кисть в центре своей области', () => {
    for (const p of PUPPETS) {
      expect(p.handFist, p.id).toBeDefined();
      expect(p.mirrorHandR, p.id).toBe(true);
      expect(p.hand.box.x * 2 + p.hand.box.w, p.id).toBe(0);
      expect(p.hand.box.y * 2 + p.hand.box.h, p.id).toBe(0);
    }
  });
  it('Агата: кисть по предплечью, накладки шали на плечи — в текстурах', () => {
    expect(AGATA_PUPPET.handAlongArm?.limit).toBeGreaterThan(0);
    expect(AGATA_PUPPET.shoulderCaps).toHaveLength(2);
    const keys = puppetJobs(AGATA_PUPPET, 1).map((j) => j.key);
    for (const c of AGATA_PUPPET.shoulderCaps!) expect(keys).toContain(`agata:part:${c.key}`);
  });
});

describe('предмет в руке — за кистью (D71)', () => {
  it('все предметы под кистью, включая записную книжку Харитона', () => {
    for (const p of PUPPETS) {
      for (const [k, prop] of Object.entries(p.props ?? {})) {
        expect(!!prop.above, `${p.id}:${k}`).toBe(false);
      }
    }
  });
  it('мелкие предметы увеличены — больше кисти и выглядывают из-за неё', () => {
    const small: [typeof AGATA_PUPPET, string][] = [[AGATA_PUPPET, 'candy'], [MATVEY_PUPPET, 'seed'], [MATVEY_PUPPET, 'sugar'], [KHARITON_PUPPET, 'cloth'], [KHARITON_PUPPET, 'knight']];
    for (const [p, k] of small) {
      const b = p.props![k]!.box;
      expect(Math.max(b.w, b.h), `${p.id}:${k}`).toBeGreaterThan(40);
      expect(p.props![k]!.svg()).toContain('scale(');
    }
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

import { describe, expect, it } from 'vitest';
import { createRng, shuffle, type RngState } from '../../../src/core/rng';
import { decide, MATVEY, NEUTRAL, type AiLevel, type Personality } from '../../../src/games/dominoes/ai';
import { boneCode, hasPip, otherSeat, type Bone, type Seat } from '../../../src/games/dominoes/rules/bones';
import { actor, apply, legalActions, nextHand } from '../../../src/games/dominoes/rules/engine';
import { startMatch } from '../../../src/games/dominoes/rules/setup';
import type { DominoState } from '../../../src/games/dominoes/rules/state';
import { sampleWorld, unseenBones } from '../../../src/games/dominoes/sim';
import { projectView } from '../../../src/games/dominoes/view';
import { midHand } from './helpers';

const LEVELS: AiLevel[] = ['easy', 'normal', 'hard'];

/** Другое «настоящее» состояние с той же проекцией для seat: рука соперника и базар перемешаны с учётом выводов §10. */
function reshuffleHidden(s: DominoState, seat: Seat, seed: number): DominoState {
  const opp = otherSeat(seat);
  const [pool] = shuffle(createRng(seed), [...s.hands[opp], ...s.bazaar]);
  const ok = (x: Bone) => !s.knowledge.missing[opp].some((n) => hasPip(x, n));
  const oppHand = pool.filter(ok).slice(0, s.hands[opp].length);
  const taken = new Set(oppHand.map(boneCode));
  const hands: [Bone[], Bone[]] = [[...s.hands[0]], [...s.hands[1]]];
  hands[opp] = oppHand;
  return { ...s, hands, bazaar: pool.filter((x) => !taken.has(boneCode(x))), rng: createRng(seed + 1) };
}

describe('PlayerView: честность (§10)', () => {
  it('в проекции нет костей соперника, порядка базара и ГСЧ', () => {
    for (let seed = 0; seed < 300; seed++) {
      const s = midHand(seed, seed % 25);
      for (const seat of [0, 1] as const) {
        const v = projectView(s, seat);
        const visible = new Set([...v.hand, ...v.chain.map((p) => p.bone)].map(boneCode));
        if (s.phase === 'play') for (const x of [...s.hands[otherSeat(seat)], ...s.bazaar]) expect(visible.has(boneCode(x))).toBe(false);
        for (const k of ['hands', 'bazaar', 'rng', 'drawBase', 'knowledge']) expect(Object.keys(v)).not.toContain(k);
        expect(v.opponentHandCount).toBe(s.hands[otherSeat(seat)].length);
        // Кости соперника открываются только после конца раздачи.
        if (s.phase === 'play') expect(v.opponentRevealed).toBeNull();
        else expect(v.opponentRevealed?.map(boneCode)).toEqual(s.hands[otherSeat(seat)].map(boneCode));
        expect(v.bazaarCount).toBe(s.bazaar.length);
        expect(unseenBones(v).length).toBe(s.hands[otherSeat(seat)].length + s.bazaar.length);
      }
    }
  });

  it('проекция не держит ссылок на объекты полного состояния', () => {
    const s = midHand(7, 6);
    const v = projectView(s, 0);
    expect(v.hand[0]).not.toBe(s.hands[0][0]);
    expect(v.chain[0]?.bone).not.toBe(s.chain[0]?.bone);
    expect(v.opponentMissing).not.toBe(s.knowledge.missing[1]);
  });

  it('другая раскладка скрытых костей даёт ту же проекцию и то же решение ИИ (1500 пар)', () => {
    for (let seed = 0; seed < 1500; seed++) {
      const s = midHand(seed, 3 + (seed % 20));
      const seat = actor(s);
      if (seat === null) continue;
      const alt = reshuffleHidden(s, seat, seed + 500);
      expect(projectView(alt, seat)).toEqual(projectView(s, seat));
      // Сильный уровень дороже — проверяем его на каждой пятой паре.
      for (const level of seed % 5 === 0 ? LEVELS : LEVELS.slice(0, 2)) {
        const rng = createRng(seed + 9);
        expect(decide(projectView(alt, seat), level, MATVEY, rng)).toEqual(decide(projectView(s, seat), level, MATVEY, rng));
      }
    }
  }, 60_000);

  it('гипотетический мир согласован с проекцией и выводами', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = midHand(seed, seed % 30);
      // Миры нужны ИИ только во время раздачи.
      if (s.phase !== 'play') continue;
      const seat = (seed % 2) as Seat;
      const v = projectView(s, seat);
      const [w] = sampleWorld(v, createRng(seed));
      const ws = w.__world;
      expect(projectView(ws, seat)).toEqual(v);
      const opp = ws.hands[otherSeat(seat)];
      for (const n of v.opponentMissing) expect(opp.some((x) => hasPip(x, n))).toBe(false);
      expect(new Set([...ws.hands[0], ...ws.hands[1], ...ws.bazaar, ...ws.chain.map((p) => p.bone)].map(boneCode)).size).toBe(28);
    }
  });
});

interface Side {
  readonly level: AiLevel;
  readonly personality: Personality;
}

/** Матч ИИ против ИИ; бросает при недопустимом действии. Возвращает победителя и число раздач. */
function aiMatch(seed: number, sides: readonly [Side, Side]): { winner: Seat; hands: number } {
  let s = startMatch(seed);
  const rngs: [RngState, RngState] = [createRng(seed * 2 + 1), createRng(seed * 2 + 2)];
  let steps = 0;
  while (s.phase !== 'matchOver') {
    if (s.phase === 'handOver') {
      const n = nextHand(s);
      if (!n.ok) throw new Error(n.error);
      s = n.state;
      continue;
    }
    const seat = actor(s)!;
    const side = sides[seat];
    const d = decide(projectView(s, seat), side.level, side.personality, rngs[seat]);
    rngs[seat] = d.rng;
    const legal = legalActions(s);
    if (!legal.some((a) => JSON.stringify(a) === JSON.stringify(d.action))) throw new Error(`ИИ выбрал недопустимое действие ${JSON.stringify(d.action)}`);
    const r = apply(s, d.action);
    if (!r.ok) throw new Error(`ИИ: ${r.error}`);
    s = r.state;
    if (++steps > 5000) throw new Error('матч не завершился');
  }
  return { winner: s.matchWinner!, hands: s.handNumber };
}

/** Доля побед стороны A, места чередуются. */
function winRate(a: Side, b: Side, matches: number, seed0: number): number {
  let wins = 0;
  for (let i = 0; i < matches; i++) {
    const aSeat = (i % 2) as Seat;
    const sides: [Side, Side] = aSeat === 0 ? [a, b] : [b, a];
    if (aiMatch(seed0 + i, sides).winner === aSeat) wins++;
  }
  return wins / matches;
}

const EASY: Side = { level: 'easy', personality: MATVEY };
const NORMAL: Side = { level: 'normal', personality: MATVEY };
const HARD: Side = { level: 'hard', personality: MATVEY };

describe('ИИ против ИИ', () => {
  it('10 000 матчей лёгкого и среднего уровней: только допустимые действия, все матчи завершаются', () => {
    const pairs: [Side, Side][] = [
      [EASY, EASY],
      [EASY, NORMAL],
      [NORMAL, EASY],
      [NORMAL, { level: 'normal', personality: NEUTRAL }],
    ];
    let hands = 0;
    for (let i = 0; i < 10_000; i++) hands += aiMatch(i, pairs[i % pairs.length]!).hands;
    // Ориентир §7: 3–6 раздач на матч.
    expect(hands / 10_000).toBeGreaterThan(2);
    expect(hands / 10_000).toBeLessThan(10);
  }, 120_000);

  // Замер на 300 матчах: средний против лёгкого ≈ 0.84, сильный против среднего ≈ 0.70, сильный против лёгкого ≈ 0.91.
  // Здесь меньшие выборки с порогами с запасом; каждый матч заодно проверяет допустимость действий сильного уровня.
  it('уровни упорядочены по силе', () => {
    expect(winRate(NORMAL, EASY, 300, 30_000)).toBeGreaterThan(0.7);
    expect(winRate(HARD, NORMAL, 60, 40_000)).toBeGreaterThan(0.55);
  }, 120_000);
});

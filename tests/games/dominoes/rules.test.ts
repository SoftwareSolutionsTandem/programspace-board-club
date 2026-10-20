import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { bone, boneCode, compareHeaviness, createSet, SET_SIZE } from '../../../src/games/dominoes/rules/bones';
import { apply, attach, chainEnds, fittingEnds, isFish, legalActions, nextHand } from '../../../src/games/dominoes/rules/engine';
import { dealHand, HAND_SIZE, openingByDouble, startMatch } from '../../../src/games/dominoes/rules/setup';
import { allBones, b, bs, chainOf, makeState, mustApply } from './helpers';

describe('набор и раздача (§2)', () => {
  it('28 костей без повторов, id «старшая:младшая»', () => {
    const set = createSet();
    expect(set.length).toBe(SET_SIZE);
    expect(new Set(set.map(boneCode)).size).toBe(28);
    for (const x of set) expect(x.hi).toBeGreaterThanOrEqual(x.lo);
    expect(boneCode(bone(2, 5))).toBe('5:2');
  });

  it('7 + 7 + 14 в базаре, детерминизм по seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      const s = startMatch(seed);
      expect(s.hands[0].length).toBe(HAND_SIZE);
      expect(s.hands[1].length).toBe(HAND_SIZE);
      expect(s.bazaar.length).toBe(14);
      expect(new Set(allBones(s)).size).toBe(28);
      expect(startMatch(seed)).toEqual(s);
    }
    expect(startMatch(1).hands).not.toEqual(startMatch(2).hands);
  });
});

describe('первый ход (§3)', () => {
  it('младший дубль по порядку 1:1 … 6:6, 0:0 последним', () => {
    const order = ['1:1', '2:2', '3:3', '4:4', '5:5', '6:6', '0:0'];
    for (let i = 0; i < order.length; i++) {
      const rest = order.slice(i);
      // Младший из оставшихся — у второго места, остальные дубли у первого.
      const o = openingByDouble([bs(rest.slice(1).join(' ') + ' 6:5'), bs(rest[0]! + ' 5:4')]);
      expect(o).toEqual({ kind: 'lowestDouble', seat: 1, bone: b(rest[0]!) });
    }
  });

  it('без дублей — самая тяжёлая кость: сумма, затем старшая, затем младшая половина', () => {
    expect(openingByDouble([bs('6:5 1:0'), bs('6:4 5:3')])).toEqual({ kind: 'heaviest', seat: 0, bone: b('6:5') });
    // Сумма 9: 6:3 тяжелее 5:4 по старшей половине.
    expect(openingByDouble([bs('5:4 1:0'), bs('6:3 2:1')])).toEqual({ kind: 'heaviest', seat: 1, bone: b('6:3') });
    // Младшая половина решает, когда сумма и старшая равны — в наборе так быть не может, проверяем сравнение напрямую.
    expect(compareHeaviness(b('6:3'), b('5:4'))).toBeGreaterThan(0);
    expect(compareHeaviness(b('4:1'), b('3:2'))).toBeGreaterThan(0);
    expect(compareHeaviness({ hi: 4, lo: 2 }, { hi: 4, lo: 1 })).toBeGreaterThan(0);
    expect(compareHeaviness(b('4:2'), b('4:2'))).toBe(0);
  });

  it('первый ход обязан быть этим дублём; ходит его владелец', () => {
    const s = startMatch(3);
    if (s.opening.kind === 'winner') throw new Error('первая раздача');
    expect(s.turn).toBe(s.opening.seat);
    const acts = legalActions(s);
    expect(acts.length).toBe(1);
    expect(acts[0]).toMatchObject({ type: 'play', bone: s.opening.bone });
    const other = s.hands[s.turn].find((x) => boneCode(x) !== boneCode(s.opening.kind === 'winner' ? x : s.opening.bone))!;
    expect(apply(s, { type: 'play', seat: s.turn, bone: other, end: 'left' })).toEqual({ ok: false, error: 'mustPlayOpening' });
  });

  it('победитель раздачи заходит любой костью; после ничейной «рыбы» — снова по дублю', () => {
    const won = dealHand(createRng(5), { kind: 'winner', seat: 1 }, { score: [0, 10], target: 101, handNumber: 2 });
    expect(won.turn).toBe(1);
    expect(legalActions(won).length).toBe(7);

    const fish = makeState({ hands: ['3:3', '2:1'], chain: '6:4', turn: 0 });
    const r = mustApply({ ...fish, hands: [bs('3:0'), bs('2:1')], chain: chainOf('6:4') }, { type: 'knock', seat: 0 });
    expect(r.state.handResult).toEqual({ kind: 'fishDraw', pips: [3, 3] });
    const n = nextHand(r.state);
    if (!n.ok) throw new Error(n.error);
    expect(n.state.opening.kind).not.toBe('winner');
    expect(n.state.handNumber).toBe(2);
  });
});

describe('цепочка (§1, §4)', () => {
  it('присоединение к обоим концам и ориентация', () => {
    let c = attach([], b('5:3'), 'left');
    expect(chainEnds(c)).toEqual([5, 3]);
    expect(fittingEnds(b('3:1'), c)).toEqual(['right']);
    expect(fittingEnds(b('5:3'), chainOf('5:6 6:3'))).toEqual(['left', 'right']);
    c = attach(c, b('3:1'), 'right');
    expect(c[c.length - 1]).toEqual({ bone: b('3:1'), left: 3, right: 1 });
    c = attach(c, b('6:5'), 'left');
    expect(c[0]).toEqual({ bone: b('6:5'), left: 6, right: 5 });
    expect(chainEnds(c)).toEqual([6, 1]);
  });

  it('дубль кладётся поперёк и новых концов не открывает', () => {
    const c = attach(chainOf('6:2'), b('2:2'), 'right');
    expect(chainEnds(c)).toEqual([6, 2]);
    expect(c[1]).toEqual({ bone: b('2:2'), left: 2, right: 2 });
  });

  it('кость не по концу отклоняется', () => {
    const s = makeState({ hands: ['5:1 4:4', '0:0'], chain: '6:2' });
    expect(apply(s, { type: 'play', seat: 0, bone: b('5:1'), end: 'left' })).toEqual({ ok: false, error: 'doesNotFit' });
    expect(apply(s, { type: 'play', seat: 0, bone: b('3:3'), end: 'left' })).toEqual({ ok: false, error: 'boneNotInHand' });
    expect(apply(s, { type: 'play', seat: 1, bone: b('0:0'), end: 'left' })).toEqual({ ok: false, error: 'wrongSeat' });
  });
});

describe('обязательный ход и базар (§4)', () => {
  it('при подходящей кости брать из базара и стучать нельзя', () => {
    const s = makeState({ hands: ['2:1 5:5', '0:0'], chain: '6:2', bazaar: '4:3' });
    expect(apply(s, { type: 'draw', seat: 0 })).toEqual({ ok: false, error: 'mustPlay' });
    expect(apply(s, { type: 'knock', seat: 0 })).toEqual({ ok: false, error: 'mustPlay' });
    expect(legalActions(s).every((a) => a.type === 'play')).toBe(true);
  });

  it('добор до первой подходящей; ход остаётся за тем же игроком', () => {
    let s = makeState({ hands: ['1:0', '0:0'], chain: '6:2', bazaar: '4:3 5:4 2:1 3:3' });
    s = mustApply(s, { type: 'draw', seat: 0 }).state;
    expect(s.turn).toBe(0);
    s = mustApply(s, { type: 'draw', seat: 0 }).state;
    expect(legalActions(s)).toEqual([{ type: 'draw', seat: 0 }]);
    const r = mustApply(s, { type: 'draw', seat: 0 });
    expect(r.events).toEqual([{ type: 'drew', seat: 0, bone: b('2:1'), drawnThisTurn: 3 }]);
    s = r.state;
    expect(s.drawnThisTurn).toBe(3);
    expect(apply(s, { type: 'draw', seat: 0 })).toEqual({ ok: false, error: 'mustPlay' });
    s = mustApply(s, { type: 'play', seat: 0, bone: b('2:1'), end: 'right' }).state;
    expect(s.turn).toBe(1);
    expect(s.drawnThisTurn).toBe(0);
    expect(s.bazaar).toEqual(bs('3:3'));
  });

  it('базар пуст и хода нет — стук; стучать при непустом базаре нельзя', () => {
    const s = makeState({ hands: ['1:0', '6:6 3:3'], chain: '6:2', bazaar: '4:3' });
    expect(apply(s, { type: 'knock', seat: 0 })).toEqual({ ok: false, error: 'mustDraw' });
    const e = makeState({ hands: ['1:0', '6:6 3:3'], chain: '6:2' });
    expect(legalActions(e)).toEqual([{ type: 'knock', seat: 0 }]);
    expect(apply(e, { type: 'draw', seat: 0 })).toEqual({ ok: false, error: 'bazaarEmpty' });
    const r = mustApply(e, { type: 'knock', seat: 0 });
    expect(r.events).toEqual([{ type: 'knocked', seat: 0 }]);
    expect(r.state.turn).toBe(1);
    expect(r.state.phase).toBe('play');
  });

  it('последняя кость из базара даёт событие bazaarEmpty', () => {
    const s = makeState({ hands: ['1:0', '0:0'], chain: '6:2', bazaar: '4:3' });
    expect(mustApply(s, { type: 'draw', seat: 0 }).events.map((e) => e.type)).toEqual(['drew', 'bazaarEmpty']);
  });
});

describe('«рыба» (§6.2)', () => {
  it('после выкладки, при концах разных чисел, в том же шаге', () => {
    const s = makeState({ hands: ['3:5 1:1', '2:2 4:0'], chain: '6:3' });
    const r = mustApply(s, { type: 'play', seat: 0, bone: b('5:3'), end: 'right' });
    expect(chainEnds(r.state.chain)).toEqual([6, 5]);
    expect(r.state.phase).toBe('handOver');
    expect(r.state.handResult).toEqual({ kind: 'fish', winner: 0, points: 8, pips: [2, 8] });
    expect(r.events.map((e) => e.type)).toEqual(['played', 'fish', 'handOver']);
    expect(r.state.score).toEqual([8, 0]);
  });

  it('после стука', () => {
    // Сосед стучит, а у первого хода тоже нет — «рыба» сразу после стука.
    const s = makeState({ hands: ['4:1 2:0', '3:3'], chain: '6:5', turn: 0 });
    expect(isFish(s)).toBe(true);
    const r = mustApply(s, { type: 'knock', seat: 0 });
    expect(r.state.handResult).toEqual({ kind: 'fish', winner: 1, points: 7, pips: [7, 6] });
    expect(r.events.map((e) => e.type)).toEqual(['knocked', 'fish', 'handOver']);
  });

  it('не наступает, пока в базаре есть кости или у кого-то есть ход', () => {
    const withBazaar = makeState({ hands: ['3:5 1:1', '2:2 4:0'], chain: '6:3', bazaar: '0:0' });
    expect(mustApply(withBazaar, { type: 'play', seat: 0, bone: b('5:3'), end: 'right' }).state.phase).toBe('play');
    const oppCan = makeState({ hands: ['3:5 1:1', '2:2 5:0'], chain: '6:3' });
    const r = mustApply(oppCan, { type: 'play', seat: 0, bone: b('5:3'), end: 'right' });
    expect(r.state.phase).toBe('play');
    // Стук одного, когда у другого есть ход, — не «рыба».
    const k = mustApply(makeState({ hands: ['1:1', '6:0'], chain: '6:5' }), { type: 'knock', seat: 0 });
    expect(k.state.phase).toBe('play');
  });

  it('равные суммы — ничья без очков', () => {
    const s = makeState({ hands: ['3:5 2:1', '2:0 1:0'], chain: '6:3', score: [40, 50] });
    const r = mustApply(s, { type: 'play', seat: 0, bone: b('5:3'), end: 'right' });
    expect(r.state.handResult).toEqual({ kind: 'fishDraw', pips: [3, 3] });
    expect(r.state.score).toEqual([40, 50]);
    expect(r.events.find((e) => e.type === 'fish')).toEqual({ type: 'fish', winner: null, points: 0, pips: [3, 3] });
  });
});

describe('очки, раздачи, матч (§6.1, §7)', () => {
  it('«домино»: победитель получает сумму очков в руке соперника', () => {
    const s = makeState({ hands: ['2:1', '6:6 5:0'], chain: '6:2', score: [10, 20] });
    const r = mustApply(s, { type: 'play', seat: 0, bone: b('2:1'), end: 'right' });
    expect(r.state.handResult).toEqual({ kind: 'domino', winner: 0, points: 17 });
    expect(r.state.score).toEqual([27, 20]);
    expect(r.state.phase).toBe('handOver');
    expect(apply(r.state, { type: 'knock', seat: 1 })).toEqual({ ok: false, error: 'handOver' });
    const n = nextHand(r.state);
    if (!n.ok) throw new Error(n.error);
    expect(n.state.opening).toEqual({ kind: 'winner', seat: 0 });
    expect(n.state.score).toEqual([27, 20]);
    expect(n.state.handNumber).toBe(2);
    expect(new Set(allBones(n.state)).size).toBe(28);
  });

  it('конец матча на 101', () => {
    const s = makeState({ hands: ['2:1', '6:6 5:0'], chain: '6:2', score: [84, 20] });
    const r = mustApply(s, { type: 'play', seat: 0, bone: b('2:1'), end: 'right' });
    expect(r.state.score).toEqual([101, 20]);
    expect(r.state.phase).toBe('matchOver');
    expect(r.state.matchWinner).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: 'matchOver', winner: 0, score: [101, 20] });
    expect(nextHand(r.state)).toEqual({ ok: false, error: 'matchOver' });
    expect(apply(r.state, { type: 'knock', seat: 1 })).toEqual({ ok: false, error: 'matchOver' });
  });

  it('100 очков — матч продолжается; nextHand во время раздачи отклоняется', () => {
    const s = makeState({ hands: ['2:1', '6:6 5:0'], chain: '6:2', score: [83, 20] });
    const r = mustApply(s, { type: 'play', seat: 0, bone: b('2:1'), end: 'right' });
    expect(r.state.phase).toBe('handOver');
    expect(nextHand(s)).toEqual({ ok: false, error: 'notHandOver' });
  });
});

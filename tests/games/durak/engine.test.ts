import { describe, expect, it } from 'vitest';
import { cardCode, parseCard, parseCards, type Card } from '../../../src/games/durak/rules/cards';
import { actor, apply, beats, boutLimit, legalActions, validate, type ApplyResult, type DurakAction } from '../../../src/games/durak/rules/engine';
import type { DurakState } from '../../../src/games/durak/rules/state';
import { makeState } from './helpers';

const c = parseCard;
const cs = parseCards;
const codes = (cards: readonly Card[]) => cards.map(cardCode);
function ok(r: ApplyResult): Extract<ApplyResult, { ok: true }> {
  if (!r.ok) throw new Error(`ожидался успех, получено ${r.error}`);
  return r;
}
const run = (s: DurakState, ...actions: DurakAction[]) => actions.reduce((st, a) => ok(apply(st, a)).state, s);

describe('старшинство карт (§4.2)', () => {
  it('та же масть — только старшая', () => {
    expect(beats(c('9S'), c('10S'), 'H')).toBe(true);
    expect(beats(c('9S'), c('8S'), 'H')).toBe(false);
    expect(beats(c('9S'), c('9S'), 'H')).toBe(false);
  });
  it('другая некозырная масть не бьёт', () => expect(beats(c('9S'), c('AC'), 'H')).toBe(false));
  it('любой козырь бьёт некозырную', () => expect(beats(c('AS'), c('6H'), 'H')).toBe(true));
  it('козырь бьётся только старшим козырем', () => {
    expect(beats(c('9H'), c('10H'), 'H')).toBe(true);
    expect(beats(c('9H'), c('8H'), 'H')).toBe(false);
    expect(beats(c('6H'), c('AS'), 'H')).toBe(false);
  });
});

describe('атака (§4.1)', () => {
  const s = makeState({ hands: ['9S 9C 9D KH 6C', '7S 8S AH QD JC 10D'], trump: 'H', deck: '6D', firstBout: true });
  it('одной картой и несколькими одного достоинства', () => {
    expect(validate(s, { type: 'attack', seat: 0, cards: cs('9S') })).toBeNull();
    expect(validate(s, { type: 'attack', seat: 0, cards: cs('9S 9C 9D') })).toBeNull();
  });
  it('отказы', () => {
    expect(validate(s, { type: 'attack', seat: 0, cards: cs('9S KH') })).toBe('mixedRanks');
    expect(validate(s, { type: 'attack', seat: 0, cards: cs('AS') })).toBe('cardNotInHand');
    expect(validate(s, { type: 'attack', seat: 0, cards: [] })).toBe('noCards');
    expect(validate(s, { type: 'attack', seat: 0, cards: cs('9S 9S') })).toBe('duplicateCards');
    expect(validate(s, { type: 'attack', seat: 1, cards: cs('7S') })).toBe('wrongSeat');
    expect(validate(s, { type: 'defend', seat: 1, attackIndex: 0, card: c('8S') })).toBe('wrongPhase');
    expect(validate(s, { type: 'pass', seat: 0 })).toBe('wrongPhase');
  });
  it('лимит по руке защитника', () => {
    const small = makeState({ hands: ['9S 9C 9D', 'AH KH'], trump: 'H' });
    expect(boutLimit(small)).toBe(2);
    expect(validate(small, { type: 'attack', seat: 0, cards: cs('9S 9C 9D') })).toBe('limitExceeded');
    expect(validate(small, { type: 'attack', seat: 0, cards: cs('9S 9C') })).toBeNull();
  });
  it('атака переводит в защиту, карты уходят из руки на стол', () => {
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S 9C') });
    expect(n.phase).toBe('defend');
    expect(codes(n.hands[0])).toEqual(['9D', 'KH', '6C']);
    expect(n.table.map((p) => cardCode(p.attack))).toEqual(['9S', '9C']);
    expect(actor(n)).toBe(1);
  });
});

describe('защита (§4.2)', () => {
  const s = makeState({ hands: ['6D', '10S AS 6H KC'], trump: 'H', table: [['9S', null], ['9C', null]], deck: '7D' });
  it('отбивает в любом порядке', () => {
    const n = run(s, { type: 'defend', seat: 1, attackIndex: 1, card: c('KC') }, { type: 'defend', seat: 1, attackIndex: 0, card: c('10S') });
    expect(n.table.every((p) => p.defense)).toBe(true);
    expect(actor(n)).toBe(0);
  });
  it('отказы', () => {
    expect(validate(s, { type: 'defend', seat: 1, attackIndex: 0, card: c('KC') })).toBe('cannotBeat');
    expect(validate(s, { type: 'defend', seat: 1, attackIndex: 5, card: c('AS') })).toBe('badAttackIndex');
    expect(validate(s, { type: 'defend', seat: 1, attackIndex: 0, card: c('QS') })).toBe('cardNotInHand');
    expect(validate(s, { type: 'defend', seat: 0, attackIndex: 0, card: c('6D') })).toBe('wrongSeat');
    const beaten = run(s, { type: 'defend', seat: 1, attackIndex: 0, card: c('6H') });
    expect(validate(beaten, { type: 'defend', seat: 1, attackIndex: 0, card: c('AS') })).toBe('alreadyBeaten');
  });
  it('нельзя «бито» при непобитых картах; брать — только если есть непобитые', () => {
    expect(validate(s, { type: 'pass', seat: 0 })).toBe('unbeatenCards');
    const all = run(s, { type: 'defend', seat: 1, attackIndex: 0, card: c('10S') }, { type: 'defend', seat: 1, attackIndex: 1, card: c('KC') });
    expect(validate(all, { type: 'take', seat: 1 })).toBe('nothingToTake');
  });
});

describe('подкидывание (§4.3–4.4)', () => {
  it('только достоинства со стола — атакующих и отбивающих карт', () => {
    const s = makeState({ hands: ['10S 9H QD', 'AC KD 7C'], trump: 'H', table: [['9S', '10C']], deck: '6D' });
    expect(validate(s, { type: 'throwIn', seat: 0, cards: cs('9H') })).toBeNull();
    expect(validate(s, { type: 'throwIn', seat: 0, cards: cs('10S') })).toBeNull();
    expect(validate(s, { type: 'throwIn', seat: 0, cards: cs('9H 10S') })).toBeNull();
    expect(validate(s, { type: 'throwIn', seat: 0, cards: cs('QD') })).toBe('rankNotOnTable');
    expect(validate(s, { type: 'throwIn', seat: 1, cards: cs('7C') })).toBe('wrongSeat');
  });
  it('в первом отбое — не больше 5 карт', () => {
    const s = makeState({ hands: ['9C 6S', 'AC KD 7C AD AS QH'], trump: 'H', table: [['9S', null], ['9D', null], ['9H', null], ['6C', null], ['6D', null]], firstBout: true, boutDefenderHand: 6 });
    expect(boutLimit(s)).toBe(5);
    expect(validate(s, { type: 'throwIn', seat: 0, cards: cs('9C') })).toBe('limitExceeded');
    const later = { ...s, firstBout: false };
    expect(validate(later, { type: 'throwIn', seat: 0, cards: cs('9C') })).toBeNull();
    expect(validate(later, { type: 'throwIn', seat: 0, cards: cs('9C 6S') })).toBe('limitExceeded');
  });
  it('не больше, чем было карт у защитника в начале отбоя (две формулировки совпадают)', () => {
    // В начале отбоя у защитника 2 карты: одна побита, одна непобита — третью подкинуть нельзя.
    const s = makeState({ hands: ['9C 9D', 'AS'], trump: 'H', table: [['9S', '10S'], ['9H', null]], boutDefenderHand: 2 });
    expect(validate(s, { type: 'throwIn', seat: 0, cards: cs('9C') })).toBe('limitExceeded');
    // «Непобитых не больше, чем карт сейчас у защитника»: 1 ≤ 1, а добавить вторую — 2 > 1.
    expect(s.table.filter((p) => !p.defense).length).toBeLessThanOrEqual(s.hands[1].length);
  });
});

describe('бито и добор (§4.5, §5)', () => {
  it('бито: карты в отбой, защитник становится атакующим, добирает сначала атаковавший', () => {
    const s = makeState({ hands: ['7D', 'QD'], trump: 'H', table: [['9S', '10S']], deck: '6S 6C 6D 6H', firstBout: true });
    const r = ok(apply(s, { type: 'pass', seat: 0 }));
    expect(codes(r.state.discard)).toEqual(['9S', '10S']);
    expect(r.state.attacker).toBe(1);
    expect(r.state.phase).toBe('attack');
    expect(r.state.firstBout).toBe(false);
    expect(codes(r.state.hands[0])).toEqual(['7D', '6S', '6C', '6D', '6H']);
    expect(codes(r.state.hands[1])).toEqual(['QD']);
    expect(r.events.map((e) => e.type)).toEqual(['bito', 'drew', 'deckEmpty', 'boutStarted']);
  });
  it('нехватка колоды: первый берёт сколько может, второму не достаётся', () => {
    const s = makeState({ hands: ['7D 8D 9D 10D', '6C 7C 8C 9C'], trump: 'H', table: [['6S', '7S']], deck: 'AS KS' });
    const n = run(s, { type: 'pass', seat: 0 });
    expect(n.hands[0]).toHaveLength(6);
    expect(n.hands[1]).toHaveLength(4);
    expect(n.deck).toHaveLength(0);
  });
  it('открытый козырь берётся последним и становится известным', () => {
    const s = makeState({ hands: ['7D 8D 9D 10D JD QD', '6C 7C 8C 9C 10C'], trump: 'H', table: [['6S', '7S']], deck: 'AS 6H', trumpCard: '6H' });
    const r = ok(apply(s, { type: 'pass', seat: 0 }));
    expect(codes(r.state.hands[0])).toEqual(['7D', '8D', '9D', '10D', 'JD', 'QD']);
    expect(codes(r.state.hands[1])).toEqual(['6C', '7C', '8C', '9C', '10C', 'AS']);
    // Козырь не достался: 6H ещё в колоде.
    expect(codes(r.state.deck)).toEqual(['6H']);
    const s2 = makeState({ hands: ['7D 8D 9D 10D', '6C 7C 8C 9C 10C JC'], trump: 'H', table: [['6S', '7S']], deck: 'AS 6H', trumpCard: '6H' });
    const r2 = ok(apply(s2, { type: 'pass', seat: 0 }));
    expect(codes(r2.state.hands[0]).slice(-2)).toEqual(['AS', '6H']);
    expect(codes(r2.state.knowledge.knownInHand[0])).toEqual(['6H']);
    expect(r2.events.find((e) => e.type === 'drew')).toMatchObject({ trumpTaken: true });
  });
});

describe('взятие (§4.5)', () => {
  it('после «Беру» атакующий подкидывает вдогонку, затем защитник забирает всё и пропускает ход', () => {
    const s = makeState({ hands: ['9C 9D QS', 'AC 7C KH'], trump: 'H', table: [['9S', null]], deck: '6S 6C 6D 6H 7S 7D 7H' });
    let n = run(s, { type: 'take', seat: 1 });
    expect(n.phase).toBe('throwInAfterTake');
    expect(actor(n)).toBe(0);
    expect(validate(n, { type: 'defend', seat: 1, attackIndex: 0, card: c('KH') })).toBe('wrongPhase');
    n = run(n, { type: 'throwIn', seat: 0, cards: cs('9C 9D') });
    const r = ok(apply(n, { type: 'doneThrowing', seat: 0 }));
    expect(codes(r.state.hands[1]).slice(0, 6)).toEqual(['AC', '7C', 'KH', '9S', '9C', '9D']);
    expect(r.state.attacker).toBe(0);
    expect(codes(r.state.knowledge.knownInHand[1])).toEqual(['9S', '9C', '9D']);
    // Добор: сначала атакующий (до 6), защитнику уже не нужно.
    expect(r.state.hands[0]).toHaveLength(6);
    expect(r.state.hands[1]).toHaveLength(6);
    expect(r.events.map((e) => e.type)).toEqual(['took', 'drew', 'boutStarted']);
  });
  it('если подкинуть нечего, карты забираются сразу', () => {
    const s = makeState({ hands: ['QS', 'AC 7C'], trump: 'H', table: [['9S', null]], deck: '6S 6C 6D 6H 7S 7D' });
    const r = ok(apply(s, { type: 'take', seat: 1 }));
    expect(r.state.phase).toBe('attack');
    expect(r.events.map((e) => e.type)).toEqual(['takeDeclared', 'took', 'drew', 'drew', 'deckEmpty', 'boutStarted']);
  });
  it('лимит вдогонку тоже действует', () => {
    const s = makeState({ hands: ['9C 9D', 'AC'], trump: 'H', table: [['9S', null]], boutDefenderHand: 2, deck: '6S' });
    const n = run(s, { type: 'take', seat: 1 });
    expect(validate(n, { type: 'throwIn', seat: 0, cards: cs('9C 9D') })).toBe('limitExceeded');
    expect(validate(n, { type: 'throwIn', seat: 0, cards: cs('9C') })).toBeNull();
  });
  it('сыгранная известная карта перестаёт быть известной в руке', () => {
    const s = { ...makeState({ hands: ['9C', '9S AC'], trump: 'H', deck: '6S' }), knowledge: { knownInHand: [[], cs('9S')] as [Card[], Card[]] } };
    const n = run({ ...s, attacker: 1 as const, boutDefenderHand: 1 }, { type: 'attack', seat: 1, cards: cs('9S') });
    expect(n.knowledge.knownInHand[1]).toEqual([]);
  });
});

describe('конец партии при пустой колоде (§6.1)', () => {
  it('атакующий выложил последнюю, защитник побил и у него остались карты → защитник дурак', () => {
    const s = makeState({ hands: ['9S', '10S AC'], trump: 'H' });
    const r = ok(apply(run(s, { type: 'attack', seat: 0, cards: cs('9S') }, { type: 'defend', seat: 1, attackIndex: 0, card: c('10S') }), { type: 'pass', seat: 0 }));
    expect(r.state.result).toEqual({ winner: 0 });
    expect(r.state.phase).toBe('gameOver');
    expect(r.events.at(-1)).toEqual({ type: 'gameOver', result: { winner: 0 } });
  });
  it('защитник побил последнюю последней картой → ничья', () => {
    const s = makeState({ hands: ['9S', '10S'], trump: 'H' });
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S') }, { type: 'defend', seat: 1, attackIndex: 0, card: c('10S') }, { type: 'pass', seat: 0 });
    expect(n.result).toEqual({ draw: true });
  });
  it('атакующий выложил последнюю, защитник взял → защитник дурак', () => {
    const s = makeState({ hands: ['9S', '6C'], trump: 'H' });
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S') }, { type: 'take', seat: 1 });
    expect(n.result).toEqual({ winner: 0 });
  });
  it('защитник побил последней картой, у атакующего остались → атакующий дурак, подкинуть нельзя', () => {
    const s = makeState({ hands: ['9S 9C', '10S'], trump: 'H' });
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S') }, { type: 'defend', seat: 1, attackIndex: 0, card: c('10S') });
    expect(validate(n, { type: 'throwIn', seat: 0, cards: cs('9C') })).toBe('limitExceeded');
    expect(legalActions(n, 0)).toEqual([{ type: 'pass', seat: 0 }]);
    expect(run(n, { type: 'pass', seat: 0 }).result).toEqual({ winner: 1 });
  });
  it('у атакующего кончились карты посреди отбоя — защитник обязан побить или взять', () => {
    const s = makeState({ hands: ['9S', '10S 6C'], trump: 'H' });
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S') });
    expect(n.result).toBeNull();
    expect(actor(n)).toBe(1);
    expect(legalActions(n, 1).map((a) => a.type).sort()).toEqual(['defend', 'take']);
  });
  it('пока в колоде есть карты, игрок без карт просто добирает', () => {
    const s = makeState({ hands: ['9S', '10S 6C'], trump: 'H', deck: '7D 8D' });
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S') }, { type: 'defend', seat: 1, attackIndex: 0, card: c('10S') }, { type: 'pass', seat: 0 });
    expect(n.result).toBeNull();
    expect(codes(n.hands[0])).toEqual(['7D', '8D']);
  });
  it('после конца партии любое действие отклоняется', () => {
    const s = makeState({ hands: ['9S', '6C'], trump: 'H' });
    const n = run(s, { type: 'attack', seat: 0, cards: cs('9S') }, { type: 'take', seat: 1 });
    expect(validate(n, { type: 'attack', seat: 1, cards: cs('6C') })).toBe('gameOver');
    expect(legalActions(n, 0)).toEqual([]);
    expect(actor(n)).toBeNull();
  });
});

describe('недопустимое действие не меняет состояние', () => {
  it('apply возвращает ошибку и исходное состояние нетронуто', () => {
    const s = makeState({ hands: ['9S', '6C'], trump: 'H' });
    const before = JSON.stringify(s);
    expect(apply(s, { type: 'attack', seat: 0, cards: cs('AS') })).toEqual({ ok: false, error: 'cardNotInHand' });
    expect(JSON.stringify(s)).toBe(before);
  });
});

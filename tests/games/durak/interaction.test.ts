import { describe, expect, it } from 'vitest';
import { drop, highlights, modeOf, tapCard, tapPair, tapTable, targetsFor } from '../../../src/games/durak/interaction';
import { parseCards } from '../../../src/games/durak/rules/cards';
import { legalActions } from '../../../src/games/durak/rules/engine';
import { projectView } from '../../../src/games/durak/view';
import { makeState } from './helpers';

const ctx = (spec: Parameters<typeof makeState>[0], seat: 0 | 1 = 0) => {
  const s = makeState(spec);
  return { view: projectView(s, seat), legal: legalActions(s, seat) };
};

describe('выбор и розыгрыш карт', () => {
  it('атака: первое касание выбирает, второе — ходит; одинаковые достоинства собираются вместе', () => {
    const { view, legal } = ctx({ hands: ['9S 9C KD', 'AH AS 6C 7C 8C 10C'], trump: 'H', deck: '6D' });
    expect(modeOf(view, legal)).toBe('attack');
    let o = tapCard(view, legal, [], '9S');
    expect(o).toEqual({ selected: ['9S'] });
    o = tapCard(view, legal, o.selected, '9C');
    expect(o.selected).toEqual(['9S', '9C']);
    o = tapCard(view, legal, o.selected, '9C');
    expect(o.action).toEqual({ type: 'attack', seat: 0, cards: parseCards('9S 9C') });
    expect(tapCard(view, legal, ['9S'], 'KD')).toEqual({ selected: ['KD'] });
    expect(tapTable(view, legal, ['KD']).action).toEqual({ type: 'attack', seat: 0, cards: parseCards('KD') });
    expect(tapTable(view, legal, []).hint).toBe('selectCardFirst');
  });
  it('атака: нельзя собрать больше лимита', () => {
    const { view, legal } = ctx({ hands: ['9S 9C 9D', 'AH'], trump: 'H' });
    expect(tapCard(view, legal, ['9S'], '9C').hint).toBe('limitExceeded');
  });
  it('защита: единственная цель — ход сразу; несколько целей — выбор цели; не бьёт — подсказка', () => {
    const one = ctx({ hands: ['6D', '10S AS 6H'], trump: 'H', attacker: 0, table: [['9S', null]], deck: '7D' }, 1);
    expect(tapCard(one.view, one.legal, [], '10S').action).toEqual({ type: 'defend', seat: 1, attackIndex: 0, card: parseCards('10S')[0] });
    expect(tapCard(one.view, one.legal, [], '6H').action?.type).toBe('defend');
    const many = ctx({ hands: ['6D', 'AH 7C'], trump: 'H', table: [['9S', null], ['9C', null]], deck: '7D' }, 1);
    expect(targetsFor(many.view, 'AH')).toEqual([0, 1]);
    const sel = tapCard(many.view, many.legal, [], 'AH');
    expect(sel).toEqual({ selected: ['AH'], hint: 'pickTarget' });
    expect(highlights(many.view, many.legal, sel.selected).targets).toEqual(new Set([0, 1]));
    expect(tapPair(many.view, many.legal, sel.selected, 1).action).toMatchObject({ type: 'defend', attackIndex: 1 });
    expect(tapCard(many.view, many.legal, [], '7C').hint).toBe('cannotBeatAny');
    expect(tapPair(many.view, many.legal, [], 0).hint).toBe('selectCardFirst');
  });
  it('подкидывание: подходящая карта — сразу, неподходящая — объяснение', () => {
    const { view, legal } = ctx({ hands: ['9H QD', '7C'], trump: 'H', table: [['9S', '10S']], deck: '6D' });
    expect(modeOf(view, legal)).toBe('throwIn');
    expect(tapCard(view, legal, [], '9H').action).toEqual({ type: 'throwIn', seat: 0, cards: parseCards('9H') });
    expect(tapCard(view, legal, [], 'QD').hint).toBe('rankNotOnTable');
  });
  it('чужой ход — подсказка, без действия', () => {
    const { view, legal } = ctx({ hands: ['9H', '7C'], trump: 'H', attacker: 1 });
    expect(modeOf(view, legal)).toBe('wait');
    expect(tapCard(view, legal, [], '9H')).toEqual({ selected: [], hint: 'notYourTurn' });
  });
  it('перетаскивание: на атакующую карту — защита, на стол — атака, мимо — отмена', () => {
    const d = ctx({ hands: ['6D', 'AH'], trump: 'H', table: [['9S', null]], deck: '7D' }, 1);
    expect(drop(d.view, d.legal, 'AH', { kind: 'pair', index: 0 }).action?.type).toBe('defend');
    expect(drop(d.view, d.legal, 'AH', null)).toEqual({ selected: [] });
    const a = ctx({ hands: ['9S KD', 'AH'], trump: 'H', deck: '6D' });
    expect(drop(a.view, a.legal, 'KD', { kind: 'table' }).action).toEqual({ type: 'attack', seat: 0, cards: parseCards('KD') });
  });
  it('подсветка: в атаку можно любой картой', () => {
    const { view, legal } = ctx({ hands: ['9S KD', 'AH'], trump: 'H', deck: '6D' });
    expect(highlights(view, legal, []).playable).toEqual(new Set(['9S', 'KD']));
  });
});

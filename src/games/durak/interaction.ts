// Выбор и розыгрыш карт игроком: касание, перетаскивание и клавиши → действие партии или подсказка.
// Чистые функции поверх PlayerView и списка допустимых действий: интерфейс не решает правил сам.
import { beats, cardCode, type Card } from './rules/cards';
import type { DurakAction, PlayerView } from './view';

export type HintCode =
  | 'notYourTurn' | 'cannotBeatAny' | 'cannotBeat' | 'rankNotOnTable' | 'limitExceeded' | 'mixedRanks'
  | 'selectCardFirst' | 'pickTarget' | 'alreadyBeaten';

export interface Outcome {
  readonly selected: readonly string[];
  readonly action?: DurakAction;
  readonly hint?: HintCode;
}

const find = (view: PlayerView, code: string): Card | undefined => view.hand.find((c) => cardCode(c) === code);
const unbeaten = (view: PlayerView) => view.table.map((p, i) => ({ p, i })).filter((x) => x.p.defense === null);

export type Mode = 'attack' | 'defend' | 'throwIn' | 'wait';

export function modeOf(view: PlayerView, legal: readonly DurakAction[]): Mode {
  if (legal.some((a) => a.type === 'attack')) return 'attack';
  if (legal.some((a) => a.type === 'defend' || a.type === 'take')) return 'defend';
  if (legal.some((a) => a.type === 'throwIn' || a.type === 'pass' || a.type === 'doneThrowing')) return 'throwIn';
  void view;
  return 'wait';
}

/**
 * Какую из возможных карт бить при ходе одним касанием: сначала карту своей масти (козырь не тратится на то,
 * что бьётся мастью), среди них — старшую (младшие проще отбить потом). Перетаскиванием цель выбирается вручную.
 */
export function autoTarget(view: PlayerView, card: Card, targets: readonly number[]): number {
  const score = (i: number) => {
    const a = view.table[i]!.attack;
    return (a.suit === card.suit ? 100 : 0) + a.rank;
  };
  return [...targets].sort((x, y) => score(y) - score(x) || x - y)[0]!;
}

/** Пары, которые выбранная карта может побить. */
export function targetsFor(view: PlayerView, code: string): number[] {
  const card = find(view, code);
  if (!card) return [];
  return unbeaten(view).filter((x) => beats(x.p.attack, card, view.trumpSuit)).map((x) => x.i);
}

export function tapCard(view: PlayerView, legal: readonly DurakAction[], selected: readonly string[], code: string): Outcome {
  const mode = modeOf(view, legal);
  const card = find(view, code);
  if (!card) return { selected };
  const seat = view.seat;
  switch (mode) {
    case 'wait':
      return { selected: [], hint: 'notYourTurn' };
    // Одно касание — один ход (D34): атака картой сразу; ещё карты того же достоинства подкидываются следом.
    case 'attack':
      return { selected: [], action: { type: 'attack', seat, cards: [card] } };
    case 'defend': {
      const targets = targetsFor(view, code);
      if (targets.length === 0) return { selected: [], hint: 'cannotBeatAny' };
      return { selected: [], action: { type: 'defend', seat, attackIndex: autoTarget(view, card, targets), card } };
    }
    case 'throwIn': {
      const ok = legal.some((a) => a.type === 'throwIn' && cardCode(a.cards[0]!) === code);
      if (ok) return { selected: [], action: { type: 'throwIn', seat, cards: [card] } };
      const ranks = new Set(view.table.flatMap((p) => (p.defense ? [p.attack.rank, p.defense.rank] : [p.attack.rank])));
      return { selected: [], hint: ranks.has(card.rank) ? 'limitExceeded' : 'rankNotOnTable' };
    }
  }
}

export function tapPair(view: PlayerView, legal: readonly DurakAction[], selected: readonly string[], index: number): Outcome {
  const mode = modeOf(view, legal);
  if (mode === 'wait') return { selected: [], hint: 'notYourTurn' };
  if (mode !== 'defend') return tapTable(view, legal, selected);
  const pair = view.table[index];
  if (!pair) return { selected };
  if (pair.defense) return { selected, hint: 'alreadyBeaten' };
  const code = selected[0];
  if (!code) return { selected, hint: 'selectCardFirst' };
  const card = find(view, code)!;
  if (!beats(pair.attack, card, view.trumpSuit)) return { selected, hint: 'cannotBeat' };
  return { selected: [], action: { type: 'defend', seat: view.seat, attackIndex: index, card } };
}

export function tapTable(view: PlayerView, legal: readonly DurakAction[], selected: readonly string[]): Outcome {
  const mode = modeOf(view, legal);
  if (mode === 'attack' && selected.length) {
    const cards = selected.map((c) => find(view, c)).filter((c): c is Card => !!c);
    return { selected: [], action: { type: 'attack', seat: view.seat, cards } };
  }
  if (mode === 'attack') return { selected, hint: 'selectCardFirst' };
  return { selected };
}

export function drop(view: PlayerView, legal: readonly DurakAction[], code: string, target: { kind: 'pair'; index: number } | { kind: 'table' } | null): Outcome {
  if (!target) return { selected: [] };
  const mode = modeOf(view, legal);
  if (mode === 'wait') return { selected: [], hint: 'notYourTurn' };
  if (mode === 'defend') {
    // Брошена на конкретную карту — бьём её; просто на стол — как касание (цель выбирается сама).
    if (target.kind === 'pair') return tapPair(view, legal, [code], target.index);
    return tapCard(view, legal, [], code);
  }
  if (mode === 'attack') return { selected: [], action: { type: 'attack', seat: view.seat, cards: [find(view, code)!] } };
  return tapCard(view, legal, [], code);
}

export interface HighlightSets {
  readonly selected: Set<string>;
  readonly playable: Set<string>;
  readonly targets: Set<number>;
}

/** Что подсветить: выбранные карты, карты, которыми можно сейчас ходить, и цели для выбранной карты. */
export function highlights(view: PlayerView, legal: readonly DurakAction[], selected: readonly string[]): HighlightSets {
  const playable = new Set<string>();
  for (const a of legal) {
    if (a.type === 'attack' && a.cards.length === 1) playable.add(cardCode(a.cards[0]!));
    if (a.type === 'throwIn') playable.add(cardCode(a.cards[0]!));
    if (a.type === 'defend') playable.add(cardCode(a.card));
  }
  const targets = new Set<number>(selected.length === 1 && modeOf(view, legal) === 'defend' ? targetsFor(view, selected[0]!) : []);
  return { selected: new Set(selected), playable, targets };
}

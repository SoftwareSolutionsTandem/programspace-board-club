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
    case 'attack': {
      if (selected.includes(code)) {
        const cards = selected.map((c) => find(view, c)).filter((c): c is Card => !!c);
        return { selected: [], action: { type: 'attack', seat, cards } };
      }
      const first = selected[0] ? find(view, selected[0]) : undefined;
      // Карты одного достоинства собираются в одну атаку; другое достоинство — новый выбор.
      if (first && first.rank === card.rank) {
        const limitOk = legal.some((a) => a.type === 'attack' && a.cards.length >= selected.length + 1);
        if (!limitOk) return { selected, hint: 'limitExceeded' };
        return { selected: [...selected, code] };
      }
      return { selected: [code] };
    }
    case 'defend': {
      const targets = targetsFor(view, code);
      if (targets.length === 0) return { selected: [], hint: 'cannotBeatAny' };
      if (targets.length === 1) return { selected: [], action: { type: 'defend', seat, attackIndex: targets[0]!, card } };
      if (selected[0] === code) return { selected, hint: 'pickTarget' };
      return { selected: [code], hint: 'pickTarget' };
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
    if (target.kind === 'pair') return tapPair(view, legal, [code], target.index);
    const t = targetsFor(view, code);
    if (t.length === 1) return tapPair(view, legal, [code], t[0]!);
    return { selected: [code], hint: t.length ? 'pickTarget' : 'cannotBeatAny' };
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

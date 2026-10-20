import { describe, expect, it } from 'vitest';
import { DominoMatch, HUMAN, OPPONENT } from '../../../src/games/dominoes/match';
import { dropBone, playableCodes, sortBones, tapBone, tapEnd } from '../../../src/games/dominoes/interaction';
import { reactionFor } from '../../../src/games/dominoes/reactions';
import { legalActions } from '../../../src/games/dominoes/rules/engine';
import { TutorialCoach } from '../../../src/games/dominoes/tutorial';
import { projectView } from '../../../src/games/dominoes/view';
import { b, bs, makeState, mustApply } from './helpers';

describe('ввод: касание и перетаскивание кости', () => {
  it('подходит к одному концу — ход сразу; к обоим (разные числа) — выбор конца', () => {
    const s = makeState({ hands: ['2:1 6:2 4:4', '0:0'], chain: '6:2' });
    const v = projectView(s, 0);
    const legal = legalActions(s);
    expect(tapBone(v, legal, '2:1')).toEqual({ action: { type: 'play', seat: 0, bone: b('2:1'), end: 'right' } });
    const pick = tapBone(v, legal, '6:2');
    expect(pick.pick).toEqual({ code: '6:2', ends: ['left', 'right'] });
    expect(tapEnd(legal, '6:2', 'left')).toEqual({ action: { type: 'play', seat: 0, bone: b('6:2'), end: 'left' } });
    expect(tapBone(v, legal, '4:4')).toEqual({ hint: 'doesNotFit' });
  });

  it('одинаковые числа на концах — без вопроса', () => {
    const s = makeState({ hands: ['3:1', '0:0'], chain: '3:5 5:3' });
    const v = projectView(s, 0);
    expect(tapBone(v, legalActions(s), '3:1').action).toMatchObject({ type: 'play', end: 'right' });
  });

  it('первый ход: только объявленный дубль; не свой ход; хода нет', () => {
    const s = { ...makeState({ hands: ['3:3 6:5', '1:1'] }), opening: { kind: 'lowestDouble' as const, seat: 0 as const, bone: b('3:3') } };
    const v = projectView(s, 0);
    expect(tapBone(v, legalActions(s), '6:5')).toEqual({ hint: 'mustPlayOpening' });
    expect(tapBone(v, legalActions(s), '3:3').action).toMatchObject({ bone: b('3:3') });
    const opp = makeState({ hands: ['3:3', '1:1'], chain: '6:2', turn: 1 });
    expect(tapBone(projectView(opp, 0), [], '3:3')).toEqual({ hint: 'notYourTurn' });
    const none = makeState({ hands: ['1:0', '0:0'], chain: '6:2', bazaar: '4:4' });
    expect(tapBone(projectView(none, 0), legalActions(none), '1:0')).toEqual({ hint: 'noMove' });
  });

  it('перетаскивание к концу выбирает этот конец; мимо конца — как касание', () => {
    const s = makeState({ hands: ['6:2', '0:0'], chain: '6:2' });
    const v = projectView(s, 0);
    const legal = legalActions(s);
    expect(dropBone(v, legal, '6:2', 'left').action).toMatchObject({ end: 'left' });
    expect(dropBone(v, legal, '6:2', null).pick?.ends).toEqual(['left', 'right']);
  });

  it('подсветка и порядок руки', () => {
    const s = makeState({ hands: ['2:1 6:2 4:4', '0:0'], chain: '6:2' });
    expect([...playableCodes(legalActions(s))].sort()).toEqual(['2:1', '6:2']);
    expect(sortBones(bs('6:2 1:0 4:4 2:1 6:0')).map((x) => `${x.hi}:${x.lo}`)).toEqual(['1:0', '2:1', '4:4', '6:0', '6:2']);
  });
});

describe('контроллер матча', () => {
  it('вынужденный добор и стук выполняются за игрока; выкладка — никогда', () => {
    for (let seed = 0; seed < 60; seed++) {
      const m = new DominoMatch({ seed, level: 'easy' });
      for (let i = 0; i < 300 && !m.over; i++) {
        if (m.phase === 'handOver') {
          m.nextHand();
          continue;
        }
        if (m.turn() === OPPONENT) {
          expect(m.opponentStep()?.ok).toBe(true);
          continue;
        }
        const auto = m.autoHumanAction();
        const legal = m.humanActions();
        if (auto) {
          expect(legal).toEqual([auto]);
          expect(auto.type).not.toBe('play');
        }
        expect(m.act(auto ?? legal[0]!).ok).toBe(true);
      }
    }
  });

  it('ход за соперника отклоняется; новый матч — счёт с нуля, победы считаются', () => {
    const m = new DominoMatch({ seed: 3, level: 'normal' });
    expect(m.act({ type: 'knock', seat: OPPONENT }).ok).toBe(false);
    let guard = 0;
    while (!m.over && guard++ < 3000) {
      if (m.phase === 'handOver') m.nextHand();
      else if (m.turn() === OPPONENT) m.opponentStep();
      else m.act(m.humanActions()[0]!);
    }
    expect(m.over).toBe(true);
    expect(m.matchWins[0] + m.matchWins[1]).toBe(1);
    m.newMatch();
    expect(m.view().score).toEqual([0, 0]);
    expect(m.view().handNumber).toBe(1);
    expect(m.phase).toBe('play');
  });
});

describe('реакции Матвея', () => {
  it('рыба, домино, итог матча, стук, последняя кость', () => {
    const fish = makeState({ hands: ['1:1', '3:5 2:2'], chain: '6:3', turn: 1 });
    const r = mustApply(fish, { type: 'play', seat: 1, bone: b('5:3'), end: 'right' });
    expect(reactionFor(r.events, OPPONENT, projectView(r.state, HUMAN))?.category).toBe('fish');
    const dom = makeState({ hands: ['6:6', '2:1'], chain: '6:2', turn: 1 });
    const d = mustApply(dom, { type: 'play', seat: 1, bone: b('2:1'), end: 'right' });
    expect(reactionFor(d.events, OPPONENT, projectView(d.state, HUMAN))?.category).toBe('handWin');
    const win = { ...dom, score: [0, 100] as [number, number] };
    const w = mustApply(win, { type: 'play', seat: 1, bone: b('2:1'), end: 'right' });
    expect(reactionFor(w.events, OPPONENT, projectView(w.state, HUMAN))).toMatchObject({ category: 'win', priority: 'result' });
    const knock = makeState({ hands: ['1:1', '6:6 3:3'], chain: '6:5', turn: 0 });
    const k = mustApply(knock, { type: 'knock', seat: 0 });
    expect(reactionFor(k.events, OPPONENT, projectView(k.state, HUMAN))?.category).toBe('playerKnock');
    const last = makeState({ hands: ['6:6', '2:1 3:3'], chain: '6:2', turn: 1 });
    const l = mustApply(last, { type: 'play', seat: 1, bone: b('2:1'), end: 'right' });
    expect(reactionFor(l.events, OPPONENT, projectView(l.state, HUMAN))?.category).toBe('lastBone');
  });

  it('«закрыл число» — только по открытым выводам о руке игрока', () => {
    // Цепочка 6:3, Матвей ставит 3:2 → концы 6 и 2; у игрока, по выводам, нет ни шестёрок, ни двоек.
    const s = makeState({ hands: ['0:0 4:4', '3:2 5:5 1:0'], chain: '6:3', bazaar: '1:1', turn: 1 });
    const known = { ...s, knowledge: { missing: [[2, 6], []] as [readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[], readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[]] } };
    const r = mustApply(known, { type: 'play', seat: 1, bone: b('3:2'), end: 'right' });
    expect(reactionFor(r.events, OPPONENT, projectView(r.state, HUMAN))?.category).toBe('block');
    // Без выводов — обычная выкладка.
    const r2 = mustApply(s, { type: 'play', seat: 1, bone: b('3:2'), end: 'right' });
    expect(reactionFor(r2.events, OPPONENT, projectView(r2.state, HUMAN))?.category).toBe('play');
  });
});

describe('обучение', () => {
  it('подсказки по ситуации, каждая один раз; итог раздачи — «done»', () => {
    const c = new TutorialCoach();
    const s = makeState({ hands: ['2:1 6:2', '0:0'], chain: '6:2' });
    const v = projectView(s, 0);
    expect(c.next(v, legalActions(s))).toBe('intro');
    expect(c.next(v, legalActions(s))).toBe('match');
    expect(c.next(v, legalActions(s), true)).toBe('ends');
    expect(c.next(v, legalActions(s))).toBeNull();
    const draw = makeState({ hands: ['1:0', '0:0'], chain: '6:2', bazaar: '4:4' });
    expect(c.next(projectView(draw, 0), legalActions(draw))).toBe('bazaar');
    const knock = makeState({ hands: ['1:0', '0:0'], chain: '6:2' });
    expect(c.next(projectView(knock, 0), legalActions(knock))).toBe('knock');
    const over = mustApply(makeState({ hands: ['2:1', '6:6'], chain: '6:2' }), { type: 'play', seat: 0, bone: b('2:1'), end: 'right' }).state;
    expect(c.next(projectView(over, 0), [])).toBe('done');
  });
});

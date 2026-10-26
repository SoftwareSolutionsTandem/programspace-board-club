import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { AGATA_LINES } from '../../src/characters/agata/lines';
import { MATVEY_LINES } from '../../src/characters/matvey/lines';
import { Director, type Trigger } from '../../src/characters/director';
import { EMOTIONS } from '../../src/characters/types';

const always = (category: Trigger['category'], priority: Trigger['priority'] = 'reaction'): Trigger => ({ category, emotion: 'warm', priority, chance: 1 });
const make = (available: (id: string) => boolean = () => true, minGapMs = 0, lineCooldownMs = 0) =>
  new Director({ lines: AGATA_LINES, minGapMs, lineCooldownMs, available }, createRng(1));

describe('каталог реплик Агаты', () => {
  it('уникальные id, известные эмоции, непустые тексты и пометки', () => {
    expect(new Set(AGATA_LINES.map((l) => l.id)).size).toBe(AGATA_LINES.length);
    for (const l of AGATA_LINES) {
      expect(EMOTIONS).toContain(l.emotion);
      expect(l.text.trim()).not.toBe('');
      expect(l.direction.trim()).not.toBe('');
      expect(l.id).toMatch(/^agata_[a-z0-9_]+$/);
    }
  });
  it('демо-набор AUDIO.md §3 целиком в каталоге', () => {
    const ids = AGATA_LINES.map((l) => l.id);
    for (const id of ['agata_greet_first_01', 'agata_attack_sly_01', 'agata_trump_azart_01', 'agata_player_took_laugh_01', 'agata_took_annoyed_01', 'agata_surprise_01', 'agata_win_01', 'agata_lose_01', 'agata_rematch_01', 'agata_nv_giggle_01', 'agata_nv_hmm_01', 'agata_nv_sigh_01']) expect(ids).toContain(id);
  });
  // Агата обращается к игроку в мужском роде («внучек», «милок») — решение владельца D48; правило D15 — для остальных.
  it('у Агаты обращения по-бабушкиному: «внучек», «милок», без «солнышко» и «золотце»', () => {
    const all = AGATA_LINES.map((l) => l.text).join(' ');
    expect(all).toMatch(GENDERED);
    expect(all).not.toMatch(/(?<!\p{L})(солнышко|золотце)(?!\p{L})/iu);
  });
});

// Обращения и формы, выдающие пол игрока. Граница слова — по буквам Юникода: \b в JS не видит кириллицу.
const GENDERED = /(?<!\p{L})(милок|голубчик|внучек|внучка|видал|обыграл|набрал|молодчина-парень)(?!\p{L})/iu;

describe('каталог реплик Матвея', () => {
  it('обращения нейтральны к полу игрока (D15)', () => {
    for (const l of MATVEY_LINES) expect(l.text, l.id).not.toMatch(GENDERED);
  });
});

describe('режиссёр реакций', () => {
  it('реплика выбирается из нужной категории', () => {
    const cue = make().react(always('win', 'result'), 0);
    expect(cue.line?.id).toMatch(/^agata_win_/);
    expect(cue.line?.priority).toBe('result');
  });
  it('без повторов: категория проходит полный круг, прежде чем реплика повторится', () => {
    const d = make();
    const ids = [1, 2, 3, 4].map((i) => d.react(always('win', 'result'), i * 1000).line!.id);
    expect(new Set(ids).size).toBe(4);
    const next = d.react(always('win', 'result'), 9000).line!.id;
    expect(next).not.toBe(ids[3]);
  });
  it('лимит болтовни: некритичная реплика не чаще minGap, результат — всегда', () => {
    const d = make(() => true, 6000);
    expect(d.react(always('attack'), 0).line).toBeDefined();
    expect(d.react(always('attack'), 1000).line).toBeUndefined();
    expect(d.react(always('lose', 'result'), 1500).line).toBeDefined();
    expect(d.react(always('attack'), 9000).line).toBeDefined();
  });
  it('кулдаун реплики: нет повтора раньше срока', () => {
    const d = make(() => true, 0, 60_000);
    const used = new Set<string>();
    for (let i = 0; i < 4; i++) used.add(d.react(always('took'), i).line!.id);
    expect(d.react(always('took'), 10).line).toBeUndefined();
    expect(used.size).toBe(4);
  });
  it('реплики без аудиофайла не выбираются; эмоция и поза всё равно отыгрываются', () => {
    const cue = make(() => false).react({ category: 'took', emotion: 'annoyed', pose: 'took', priority: 'reaction', chance: 1 }, 0);
    expect(cue.line).toBeUndefined();
    expect(cue).toEqual({ emotion: 'annoyed', pose: 'took' });
  });
  it('вероятность: при chance 0 некритичные реплики не звучат', () => {
    const d = make();
    for (let i = 0; i < 20; i++) expect(d.react({ ...always('attack'), chance: 0 }, i * 10_000).line).toBeUndefined();
  });
  it('детерминирован при одинаковом ГСЧ', () => {
    const run = () => { const d = make(); return [0, 1, 2].map((i) => d.react(always('attack'), i * 10_000).line?.id); };
    expect(run()).toEqual(run());
  });
});

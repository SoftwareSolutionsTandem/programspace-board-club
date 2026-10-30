// «Своя жизнь» персонажа за столом (docs/ART_STYLE.md §5.6): персонаж почти всё время чем-то занят. Уровни:
// мелкие движения (дыхание, взгляд, моргание, мелкие действия состояния) — «мозг» марионетки, всегда; привычки —
// короткие жесты без слов в любую паузу; сценки — законченные бытовые действия с реквизитом и репликой, пока игрок
// думает; особые — редкие и длинные, когда игрок думает долго; сценки-ответы — на то, что персонаж заметил в игре.
// Планировщик — чистая логика (без Pixi, свой ГСЧ из сеанса); драйвер — запуск в риге, реплика и возврат к игре.
import { nextFloat, type RngState } from '../core/rng';
import type { LifeTag, LifeTier, Mood, SceneDef } from '../puppet/types';
import type { Emotion, LineCategory } from './types';

/** Что сейчас за столом. */
export interface LifeContext {
  readonly now: number;
  /** Партия идёт: не пауза, не обучение, не итог. Привычки — в любую такую паузу. */
  readonly active: boolean;
  /** Игрок думает над ходом (персонаж ждёт): сценки — только тогда. */
  readonly waiting: boolean;
  /** Сколько игрок уже думает над этим ходом, мс. */
  readonly waitMs: number;
  readonly mood: Mood;
  /** Персонаж свободен: не идёт жест партии и не звучит реплика. */
  readonly free: boolean;
  /** Сколько мс персонаж уже молчит (Director.quietMs) — сценка с репликой не встаёт сразу за другой фразой. */
  readonly quietMs: number;
  /** Что персонаж заметил в игре (игрок спешит, долго думает, партия затянулась). */
  readonly tags: readonly LifeTag[];
}

interface TierRule {
  /** Первая — через (мс) после начала. */
  readonly first: readonly [number, number];
  /** Пауза после конца предыдущей того же уровня (мс). */
  readonly gap: readonly [number, number];
  /** Повтор той же — не раньше (мс), если у неё не задано своё. */
  readonly cooldown: number;
  /** Доля подходящих моментов, когда персонаж всё же ничего не начинает. */
  readonly skip: number;
}

export interface LifeOptions {
  readonly habit: TierRule;
  readonly scene: TierRule;
  readonly special: TierRule;
  /** Сценка — когда игрок думает хотя бы столько (мс). */
  readonly sceneWaitMs: number;
  /** Особая — когда игрок думает хотя бы столько (мс), если у неё не задано своё. */
  readonly specialWaitMs: number;
  /** Сколько молчания нужно перед сценкой с репликой (мс). */
  readonly quietMs: number;
  /** После игрового события: сценка и привычка подождут (мс). */
  readonly afterEventMs: { readonly scene: number; readonly habit: number };
}

/**
 * Ритм «своей жизни» (D65): привычка — каждые 5–10 с, сценка — через 10–18 с после предыдущей, пока игрок думает,
 * особая — не чаще раза в 45–70 с при долгом раздумье. Так персонаж почти всё время чем-то занят, но не мельтешит:
 * одновременно идёт одно действие, а мелкие движения (дыхание, взгляд, моргание) «мозг» марионетки ведёт всегда.
 */
export const LIFE_DEFAULTS: LifeOptions = {
  habit: { first: [2500, 5000], gap: [5000, 10_000], cooldown: 40_000, skip: 0.15 },
  scene: { first: [5000, 8000], gap: [10_000, 18_000], cooldown: 150_000, skip: 0.05 },
  special: { first: [30_000, 40_000], gap: [45_000, 70_000], cooldown: 300_000, skip: 0 },
  sceneWaitMs: 2000,
  specialWaitMs: 15_000,
  quietMs: 4000,
  afterEventMs: { scene: 2500, habit: 1500 },
};

/** Настроение по перевесу персонажа (lead > 0 — он впереди) и порогу «заметного» перевеса. */
export const moodOf = (lead: number, notice: number): Mood => (lead >= notice ? 'ahead' : lead <= -notice ? 'behind' : 'even');

/** Категория реплики сценки. */
export const sceneCategory = (id: string): LineCategory => `scene_${id}`;

/** Уровень сценки (по умолчанию — сценка). */
export const tierOf = (s: SceneDef): LifeTier => s.tier ?? 'scene';

export class LifePlanner {
  private rng: RngState;
  private readonly nextAt: Record<LifeTier, number>;
  private readonly lastUsed = new Map<string, number>();
  private lastId: string | null = null;

  constructor(private readonly scenes: readonly SceneDef[], rng: RngState, start: number, private readonly opts: LifeOptions = LIFE_DEFAULTS) {
    this.rng = rng;
    this.nextAt = { habit: 0, scene: 0, special: 0 };
    this.restart(start);
  }

  private rand(): number {
    const [v, next] = nextFloat(this.rng);
    this.rng = next;
    return v;
  }

  private between([lo, hi]: readonly [number, number]): number {
    return lo + (hi - lo) * this.rand();
  }

  /** Игровое событие (реакция на ход, реплика партии): сценка и привычка подождут, чтобы не перебивать игру. */
  event(now: number): void {
    this.nextAt.scene = Math.max(this.nextAt.scene, now + this.opts.afterEventMs.scene);
    this.nextAt.special = Math.max(this.nextAt.special, now + this.opts.afterEventMs.scene);
    this.nextAt.habit = Math.max(this.nextAt.habit, now + this.opts.afterEventMs.habit);
  }

  /** Новая партия: ритм сначала, но без повторов только что сыгранного. */
  restart(now: number): void {
    for (const t of ['habit', 'scene', 'special'] as const) this.nextAt[t] = now + this.between(this.opts[t].first);
  }

  private cooldown(s: SceneDef): number {
    return s.cooldownMs ?? this.opts[tierOf(s)].cooldown;
  }

  /** Сценки уровня tier, уместные прямо сейчас (для тестов и демо). */
  candidates(ctx: LifeContext, tier: LifeTier): SceneDef[] {
    const minWait = tier === 'special' ? this.opts.specialWaitMs : tier === 'scene' ? this.opts.sceneWaitMs : 0;
    return this.scenes.filter((s) =>
      tierOf(s) === tier
      && s.id !== this.lastId
      && (tier === 'habit' || ctx.waitMs >= Math.max(minWait, s.minWaitMs ?? 0))
      && (!s.tag || ctx.tags.includes(s.tag))
      && (!s.moods || s.moods.includes(ctx.mood))
      && ctx.now - (this.lastUsed.get(s.id) ?? -Infinity) >= this.cooldown(s));
  }

  private pick(pool: readonly SceneDef[], ctx: LifeContext): SceneDef {
    // Ответ на то, что персонаж заметил, — вперёд; «скучающие» сценки вероятнее, когда игрок думает долго.
    const weight = (s: SceneDef) => (s.weight ?? 1) * (s.tag ? 4 : 1) * (s.minWaitMs && ctx.waitMs >= s.minWaitMs ? 1.6 : 1);
    const total = pool.reduce((a, s) => a + weight(s), 0);
    let roll = this.rand() * total;
    for (const s of pool) {
      roll -= weight(s);
      if (roll <= 0) return s;
    }
    return pool[pool.length - 1]!;
  }

  /** Что начать сейчас, или null. Начатое учитывается сразу: таймеры уровней сдвигаются за его конец. */
  decide(ctx: LifeContext): SceneDef | null {
    if (!ctx.active || !ctx.free) return null;
    // Особая и обычная сценки — пока игрок думает и персонаж помолчал; иначе — короткая привычка.
    const order: LifeTier[] = ctx.waiting && ctx.quietMs >= this.opts.quietMs ? ['special', 'scene', 'habit'] : ['habit'];
    for (const tier of order) {
      // Заметил что-то в игре — сценка-ответ может начаться раньше обычного ритма.
      const early = tier === 'scene' && ctx.tags.length > 0 ? 6000 : 0;
      if (ctx.now < this.nextAt[tier] - early) continue;
      const pool = this.candidates(ctx, tier);
      if (pool.length === 0) continue;
      if (this.rand() < this.opts[tier].skip) {
        this.nextAt[tier] = ctx.now + this.between(this.opts[tier].gap) * 0.5;
        continue;
      }
      const s = this.pick(pool, ctx);
      this.lastUsed.set(s.id, ctx.now);
      this.lastId = s.id;
      const end = ctx.now + s.gesture.duration;
      this.nextAt[tier] = end + this.between(this.opts[tier].gap);
      // Пока идёт действие, другое не начнётся; после сценки привычка — не сразу.
      if (tier !== 'habit') this.nextAt.habit = Math.max(this.nextAt.habit, end + this.between(this.opts.habit.gap) * 0.6);
      if (tier === 'special') this.nextAt.scene = Math.max(this.nextAt.scene, end + this.between(this.opts.scene.gap) * 0.6);
      return s;
    }
    return null;
  }
}

/**
 * Темп игрока для сценок-ответов: игрок ходит быстро (три хода подряд — каждый быстрее 3,5 с), думает очень долго
 * (25 с и дольше), партия затянулась (5 минут и дольше).
 */
export class PlayTempo {
  private waits: number[] = [];
  private start: number;

  constructor(now: number) {
    this.start = now;
  }

  /** Новая партия. */
  reset(now: number): void {
    this.start = now;
    this.waits = [];
  }

  /** Игрок сходил, подумав waitMs. */
  moved(waitMs: number): void {
    this.waits.push(waitMs);
    if (this.waits.length > 3) this.waits.shift();
  }

  tags(now: number, waitMs: number): LifeTag[] {
    const out: LifeTag[] = [];
    if (this.waits.length >= 3 && this.waits.every((w) => w < 3500)) out.push('playerFast');
    if (waitMs >= 25_000) out.push('playerSlow');
    if (now - this.start >= 300_000) out.push('longGame');
    return out;
  }
}

/** Что драйверу нужно от рига (PuppetRig) — без Pixi в тестах. */
export interface LifeRig {
  playScene(def: SceneDef['gesture'], onMarker: (name: string) => void): Promise<void>;
  readonly brain: { readonly busy: boolean; talking: boolean; stopGesture(): void };
  readonly currentEmotion: Emotion;
  setEmotion(e: Emotion): void;
  readonly reducedMotion: boolean;
}

/**
 * Драйвер сеанса: каждый кадр спрашивает планировщик, запускает сценку в риге, на маркере say просит реплику
 * `scene_<id>` (голосовой канал и режиссёр решают, прозвучит ли — без записи сценка идёт молча), после сценки
 * возвращает приветливое лицо, если игра за это время его не сменила.
 */
export class CharacterLife {
  private readonly planner: LifePlanner;
  private active: SceneDef | null = null;
  private interrupted = false;
  private disposed = false;

  constructor(
    private readonly rig: LifeRig,
    scenes: readonly SceneDef[],
    rng: RngState,
    start: number,
    /** Попросить реплику категории; true — реплика зазвучала. */
    private readonly say: (category: LineCategory, emotion: Emotion) => boolean,
    opts?: LifeOptions,
  ) {
    this.planner = new LifePlanner(scenes, rng, start, opts);
  }

  /** Сейчас идёт сценка (id) — для отладки и e2e. */
  get playing(): string | null {
    return this.active?.id ?? null;
  }

  /** Уровень идущего действия (для отладки и e2e). */
  get playingTier(): LifeTier | null {
    return this.active ? tierOf(this.active) : null;
  }

  tick(ctx: LifeContext): void {
    if (this.disposed || this.active || this.rig.reducedMotion) return;
    const scene = this.planner.decide(ctx);
    if (scene) this.play(scene);
  }

  /** Запустить сценку сразу (демо-страница, e2e). */
  play(scene: SceneDef): Promise<void> {
    this.active = scene;
    this.interrupted = false;
    const emotion = scene.emotion;
    if (emotion) this.rig.setEmotion(emotion);
    return this.rig.playScene(scene.gesture, (name) => {
      if (name !== 'say' || this.disposed) return;
      if (this.say(sceneCategory(scene.id), emotion ?? this.rig.currentEmotion)) this.rig.brain.talking = true;
    }).then(() => {
      const was = this.active;
      this.active = null;
      // Сценка кончилась сама — лицо снова приветливое; если её прервала игра, лицо уже задано реакцией.
      if (was === scene && !this.interrupted && !this.disposed) this.rig.setEmotion('warm');
    });
  }

  /** Игровое событие: сценка подождёт; идущая — уступает место реакции (риг прерывает её новым жестом сам). */
  event(now: number): void {
    this.planner.event(now);
    if (this.active) this.interrupted = true;
  }

  restart(now: number): void {
    this.stop();
    this.planner.restart(now);
  }

  /** Прервать идущую сценку (итог партии, новая партия): поза итога не ждёт её конца. */
  stop(): void {
    if (!this.active) return;
    this.interrupted = true;
    this.rig.brain.stopGesture();
  }

  dispose(): void {
    this.disposed = true;
  }
}

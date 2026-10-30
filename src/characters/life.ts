// «Своя жизнь» персонажа за столом (docs/ART_STYLE.md §5.6): в паузах, пока игрок думает, персонаж иногда разыгрывает
// бытовую сценку — достаёт платочек, смотрит на часы, листает телефон — и говорит к месту. Планировщик — чистая
// логика (без Pixi, свой ГСЧ из сеанса): когда и какую сценку; драйвер — запуск в риге, реплика и возврат к игре.
// Мелкие действия ожидания (поправить очки, погладить усы) по-прежнему ведёт «мозг» марионетки; сценки — редкие и крупные.
import { nextFloat, type RngState } from '../core/rng';
import type { Mood, SceneDef } from '../puppet/types';
import type { Emotion, LineCategory } from './types';

/** Что сейчас за столом: ход игрока (персонаж ждёт) или нет — свой ход, анимация, итог, пауза, обучение. */
export interface LifeContext {
  readonly now: number;
  /** Игрок думает над ходом, и ничто не мешает (не пауза, не обучение, не итог). */
  readonly waiting: boolean;
  /** Сколько игрок уже думает над этим ходом, мс. */
  readonly waitMs: number;
  readonly mood: Mood;
  /** Персонаж свободен: не идёт жест партии и не звучит реплика. */
  readonly free: boolean;
  /** Сколько мс персонаж уже молчит (Director.quietMs) — сценка с репликой не встаёт сразу за другой фразой. */
  readonly quietMs: number;
}

export interface LifeOptions {
  /** Первая сценка — не раньше чем через (мс) после начала сеанса. */
  readonly firstMs: number;
  /** Пауза между сценками (мс), случайная в пределах. */
  readonly gapMs: readonly [number, number];
  /** После игрового события (реакции) сценка не начинается раньше чем через (мс). */
  readonly afterEventMs: number;
  /** Игрок должен думать хотя бы столько, чтобы персонаж «заскучал» (мс). */
  readonly minWaitMs: number;
  /** Сколько молчания нужно перед сценкой с репликой (мс). */
  readonly quietMs: number;
  /** Иногда персонаж просто ничего не делает: доля пропущенных подходящих моментов. */
  readonly skip: number;
}

export const LIFE_DEFAULTS: LifeOptions = { firstMs: 12_000, gapMs: [26_000, 48_000], afterEventMs: 5_000, minWaitMs: 4_500, quietMs: 7_000, skip: 0.25 };
const DEFAULT_COOLDOWN = 240_000;

/** Настроение по перевесу персонажа (lead > 0 — он впереди) и порогу «заметного» перевеса. */
export const moodOf = (lead: number, notice: number): Mood => (lead >= notice ? 'ahead' : lead <= -notice ? 'behind' : 'even');

/** Категория реплики сценки. */
export const sceneCategory = (id: string): LineCategory => `scene_${id}`;

export class LifePlanner {
  private rng: RngState;
  private nextAt: number;
  private readonly lastUsed = new Map<string, number>();
  private lastId: string | null = null;

  constructor(private readonly scenes: readonly SceneDef[], rng: RngState, start: number, private readonly opts: LifeOptions = LIFE_DEFAULTS) {
    this.rng = rng;
    this.nextAt = start + opts.firstMs + this.rand() * 6000;
  }

  private rand(): number {
    const [v, next] = nextFloat(this.rng);
    this.rng = next;
    return v;
  }

  private gap(): number {
    const [lo, hi] = this.opts.gapMs;
    return lo + (hi - lo) * this.rand();
  }

  /** Игровое событие (реакция на ход, реплика партии): сценка подождёт, чтобы не перебивать игру. */
  event(now: number): void {
    this.nextAt = Math.max(this.nextAt, now + this.opts.afterEventMs);
  }

  /** Новая партия: всё сначала, но без повторов только что сыгранных сценок. */
  restart(now: number): void {
    this.nextAt = now + this.opts.firstMs + this.rand() * 6000;
  }

  /** Сценки, уместные прямо сейчас (для тестов и демо). */
  candidates(ctx: LifeContext): SceneDef[] {
    return this.scenes.filter((s) =>
      s.id !== this.lastId
      && ctx.waitMs >= Math.max(this.opts.minWaitMs, s.minWaitMs ?? 0)
      && (!s.moods || s.moods.includes(ctx.mood))
      && ctx.now - (this.lastUsed.get(s.id) ?? -Infinity) >= (s.cooldownMs ?? DEFAULT_COOLDOWN));
  }

  /** Сценка, которую стоит начать сейчас, или null. Начатая сценка учитывается сразу. */
  decide(ctx: LifeContext): SceneDef | null {
    if (!ctx.waiting || !ctx.free || ctx.now < this.nextAt || ctx.quietMs < this.opts.quietMs) return null;
    const pool = this.candidates(ctx);
    if (pool.length === 0) {
      // Подходящей сценки нет (игрок думает недолго, всё недавно было) — заглянем позже.
      this.nextAt = ctx.now + 3000;
      return null;
    }
    // Иногда персонаж просто сидит: тишина тоже часть характера.
    if (this.rand() < this.opts.skip) {
      this.nextAt = ctx.now + this.gap() * 0.5;
      return null;
    }
    // Долго думает игрок — «скучающие» сценки (с порогом ожидания) вероятнее.
    const weight = (s: SceneDef) => (s.weight ?? 1) * (s.minWaitMs && ctx.waitMs >= s.minWaitMs ? 1.6 : 1);
    const total = pool.reduce((a, s) => a + weight(s), 0);
    let roll = this.rand() * total;
    let pick = pool[pool.length - 1]!;
    for (const s of pool) {
      roll -= weight(s);
      if (roll <= 0) {
        pick = s;
        break;
      }
    }
    this.lastUsed.set(pick.id, ctx.now);
    this.lastId = pick.id;
    this.nextAt = ctx.now + pick.gesture.duration + this.gap();
    return pick;
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

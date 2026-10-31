// Режиссёр реакций персонажа (docs/AUDIO.md §8.4): триггер → эмоция, поза и, возможно, реплика.
// Без DOM и звука: решает только «что показать и что сказать»; воспроизводит голосовой канал.
import { nextFloat, shuffle, type RngState } from '../core/rng';
import { PRIORITY_RANK, type Emotion, type LineCategory, type Pose, type VoiceLine, type VoicePriority } from './types';

export interface Trigger {
  readonly category: LineCategory;
  readonly emotion: Emotion;
  readonly pose?: Pose;
  /** Жест реакции персонажа по имени (MotionStyle.gestures), если есть. */
  readonly gesture?: string;
  readonly priority: VoicePriority;
  /** Вероятность высказаться (0…1); результат и приветствие — всегда 1. */
  readonly chance: number;
  /**
   * Запасная категория: если у основной нет ни одной доступной записи (реплики ждут записи или все на кулдауне),
   * звучит реплика отсюда. Так новая, ещё не записанная ситуация не отнимает голос у уже записанной.
   */
  readonly fallback?: LineCategory;
  /**
   * Продолжение только что сказанного (например, «раздаю» сразу после приветствия): не ждёт minGap,
   * но шанс бросается как обычно. Сеанс вызывает его, когда голос уже замолчал.
   */
  readonly followUp?: boolean;
  /**
   * Сказать обязательно, даже если все записи категории на кулдауне (тогда — самая давняя). Только для приветствия
   * при посадке: память реплик общая на страницу (voiceMemory), и без этого быстрая пересадка оставила бы персонажа немым.
   */
  readonly mustSpeak?: boolean;
}

export interface Cue {
  readonly emotion: Emotion;
  readonly pose?: Pose;
  readonly gesture?: string;
  readonly line?: { readonly id: string; readonly priority: VoicePriority; readonly text: string };
}

export interface DirectorOptions {
  readonly lines: readonly VoiceLine[];
  /** Минимальный интервал между некритичными репликами, мс (характер: у Агаты 6–8 с). */
  readonly minGapMs: number;
  /** Повтор одной и той же реплики не раньше чем через, мс. */
  readonly lineCooldownMs: number;
  /** Есть ли у реплики настоящий аудиофайл. Реплики без файла не выбираются. */
  readonly available: (id: string) => boolean;
  /**
   * Рутинные реакции (шанс реплики меньше ROUTINE — «соперник походил», «я походил») показывают жест не каждый раз:
   * не чаще чем раз в gestureGapMs и через раз, — иначе персонаж повторяет одно движение на каждом ходу.
   * 0 — жест каждый раз (как раньше).
   */
  readonly gestureGapMs?: number;
  /**
   * Общая память «реплика → когда звучала» (часы — те же, что у now). Передаётся одна на персонажа на всю страницу,
   * чтобы новая посадка за стол (новый сеанс) не повторяла только что сказанное: кулдаун переживает сеанс.
   */
  readonly memory?: Map<string, number>;
}

const MEMORIES = new Map<string, Map<string, number>>();
/** Память реплик персонажа на всю страницу (DirectorOptions.memory): одна на персонажа, переживает смену сеансов. */
export function voiceMemory(character: string): Map<string, number> {
  let m = MEMORIES.get(character);
  if (!m) MEMORIES.set(character, (m = new Map()));
  return m;
}

/** Реакция с шансом реплики ниже этого — рутинная (обычный ход, не событие). */
export const ROUTINE = 0.25;

export class Director {
  private rng: RngState;
  private lastSpokeAt = -Infinity;
  private lastGestureAt = -Infinity;
  private readonly lastUsed: Map<string, number>;
  private readonly bags = new Map<LineCategory, string[]>();
  private lastId: string | null = null;

  constructor(private readonly opts: DirectorOptions, rng: RngState) {
    this.rng = rng;
    this.lastUsed = opts.memory ?? new Map<string, number>();
  }

  /** Сколько мс персонаж молчит (с последней выбранной реплики). */
  quietMs(now: number): number {
    return now - this.lastSpokeAt;
  }

  react(trigger: Trigger, now: number): Cue {
    const urgent = PRIORITY_RANK[trigger.priority] >= PRIORITY_RANK.greeting;
    let gesture = trigger.gesture;
    const gap = this.opts.gestureGapMs ?? 0;
    if (gesture && gap > 0 && !urgent && trigger.chance < ROUTINE) {
      const [roll, next] = nextFloat(this.rng);
      this.rng = next;
      if (now - this.lastGestureAt < gap || roll < 0.5) gesture = undefined;
    }
    if (gesture) this.lastGestureAt = now;
    const base: Cue = { emotion: trigger.emotion, ...(trigger.pose ? { pose: trigger.pose } : {}), ...(gesture ? { gesture } : {}) };
    if (!urgent && !trigger.followUp && now - this.lastSpokeAt < this.opts.minGapMs) return base;
    const [roll, next] = nextFloat(this.rng);
    this.rng = next;
    if (!urgent && roll >= trigger.chance) return base;
    // Приветствие при посадке не молчит из-за кулдауна: если все его записи недавно звучали — самая давняя.
    const line = this.pick(trigger.category, now) ?? (trigger.fallback ? this.pick(trigger.fallback, now) : null) ?? (trigger.mustSpeak ? this.oldest(trigger.category) : null);
    if (!line) return base;
    this.lastSpokeAt = now;
    this.lastUsed.set(line.id, now);
    this.lastId = line.id;
    return { ...base, emotion: line.emotion, line: { id: line.id, priority: trigger.priority, text: line.text } };
  }

  /** Доступная реплика категории, звучавшая давнее всех (не та, что последней). */
  private oldest(category: LineCategory): VoiceLine | null {
    const pool = this.opts.lines.filter((l) => l.category === category && this.opts.available(l.id));
    const fresh = pool.length > 1 ? pool.filter((l) => l.id !== this.lastId) : pool;
    return [...fresh].sort((a, b) => (this.lastUsed.get(a.id) ?? -Infinity) - (this.lastUsed.get(b.id) ?? -Infinity))[0] ?? null;
  }

  /** «Мешок без повторов»: реплики категории идут по кругу в случайном порядке, с кулдауном. */
  private pick(category: LineCategory, now: number): VoiceLine | null {
    const pool = this.opts.lines.filter((l) => l.category === category && this.opts.available(l.id));
    if (pool.length === 0) return null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let bag = this.bags.get(category) ?? [];
      bag = bag.filter((id) => pool.some((l) => l.id === id));
      if (bag.length === 0) {
        const [order, next] = shuffle(this.rng, pool.map((l) => l.id));
        this.rng = next;
        // Не начинать новый круг той же репликой, что прозвучала последней.
        if (order.length > 1 && order[0] === this.lastId) order.push(order.shift() as string);
        bag = order;
      }
      const index = bag.findIndex((id) => now - (this.lastUsed.get(id) ?? -Infinity) >= this.opts.lineCooldownMs);
      if (index >= 0) {
        const [id] = bag.splice(index, 1);
        this.bags.set(category, bag);
        return pool.find((l) => l.id === id) ?? null;
      }
      this.bags.set(category, []);
      if (pool.every((l) => now - (this.lastUsed.get(l.id) ?? -Infinity) < this.opts.lineCooldownMs)) return null;
    }
    return null;
  }
}

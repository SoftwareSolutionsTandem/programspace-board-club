// Режиссёр реакций персонажа (docs/AUDIO.md §8.4): триггер → эмоция, поза и, возможно, реплика.
// Без DOM и звука: решает только «что показать и что сказать»; воспроизводит голосовой канал.
import { nextFloat, shuffle, type RngState } from '../core/rng';
import { PRIORITY_RANK, type Emotion, type LineCategory, type Pose, type VoiceLine, type VoicePriority } from './types';

export interface Trigger {
  readonly category: LineCategory;
  readonly emotion: Emotion;
  readonly pose?: Pose;
  readonly priority: VoicePriority;
  /** Вероятность высказаться (0…1); результат и приветствие — всегда 1. */
  readonly chance: number;
}

export interface Cue {
  readonly emotion: Emotion;
  readonly pose?: Pose;
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
}

export class Director {
  private rng: RngState;
  private lastSpokeAt = -Infinity;
  private readonly lastUsed = new Map<string, number>();
  private readonly bags = new Map<LineCategory, string[]>();
  private lastId: string | null = null;

  constructor(private readonly opts: DirectorOptions, rng: RngState) {
    this.rng = rng;
  }

  react(trigger: Trigger, now: number): Cue {
    const base: Cue = trigger.pose ? { emotion: trigger.emotion, pose: trigger.pose } : { emotion: trigger.emotion };
    const urgent = PRIORITY_RANK[trigger.priority] >= PRIORITY_RANK.greeting;
    if (!urgent && now - this.lastSpokeAt < this.opts.minGapMs) return base;
    const [roll, next] = nextFloat(this.rng);
    this.rng = next;
    if (!urgent && roll >= trigger.chance) return base;
    const line = this.pick(trigger.category, now);
    if (!line) return base;
    this.lastSpokeAt = now;
    this.lastUsed.set(line.id, now);
    this.lastId = line.id;
    return { ...base, emotion: line.emotion, line: { id: line.id, priority: trigger.priority, text: line.text } };
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

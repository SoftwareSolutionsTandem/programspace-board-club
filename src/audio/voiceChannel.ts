// Голосовой канал персонажа (docs/AUDIO.md §8.5): одновременно звучит одна реплика.
// Более важная прерывает менее важную; равная или менее важная ждёт не дольше TTL, иначе выбрасывается.
import { PRIORITY_RANK, type VoicePriority } from '../characters/types';

export interface VoiceHandle {
  stop(fadeMs: number): void;
}

export interface VoicePlayer {
  /** Начать реплику; onEnd вызывается по окончании или остановке. null — файла нет или он не декодируется. */
  play(id: string, onEnd: () => void): VoiceHandle | null;
}

export type RequestOutcome = 'played' | 'queued' | 'dropped' | 'muted' | 'unavailable';

interface Pending {
  readonly id: string;
  readonly priority: VoicePriority;
  readonly expiresAt: number;
}

export class VoiceChannel {
  private current: { id: string; priority: VoicePriority; handle: VoiceHandle; token: number } | null = null;
  private queue: Pending[] = [];
  private token = 0;
  private enabled = true;
  private readonly unavailable = new Set<string>();

  constructor(
    private readonly player: VoicePlayer,
    private readonly now: () => number,
    private readonly opts: { ttlMs: number; fadeMs: number } = { ttlMs: 1500, fadeMs: 120 },
  ) {}

  get speaking(): string | null {
    return this.current?.id ?? null;
  }

  isUnavailable(id: string): boolean {
    return this.unavailable.has(id);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  request(id: string, priority: VoicePriority): RequestOutcome {
    if (!this.enabled) return 'muted';
    if (this.unavailable.has(id)) return 'unavailable';
    const cur = this.current;
    if (!cur) return this.start(id, priority);
    if (PRIORITY_RANK[priority] > PRIORITY_RANK[cur.priority]) {
      this.stopCurrent();
      return this.start(id, priority);
    }
    // Не копим очередь: место одно, свежая заявка вытесняет устаревшую равного или меньшего приоритета.
    this.queue = this.queue.filter((p) => PRIORITY_RANK[p.priority] > PRIORITY_RANK[priority]);
    if (this.queue.length > 0) return 'dropped';
    this.queue.push({ id, priority, expiresAt: this.now() + this.opts.ttlMs });
    return 'queued';
  }

  stopAll(): void {
    this.queue = [];
    this.stopCurrent();
  }

  private stopCurrent(): void {
    const cur = this.current;
    this.current = null;
    cur?.handle.stop(this.opts.fadeMs);
  }

  private start(id: string, priority: VoicePriority): RequestOutcome {
    this.endedTokens.clear();
    const token = ++this.token;
    const handle = this.player.play(id, () => this.ended(token));
    if (!handle) {
      // Файл недоступен — реплика пропускается, игра идёт дальше без ожидания.
      this.unavailable.add(id);
      return 'unavailable';
    }
    // Плеер мог завершить реплику синхронно (нулевая длина) — тогда current уже не наш.
    if (this.endedTokens.delete(token)) return 'played';
    this.current = { id, priority, handle, token };
    return 'played';
  }

  private readonly endedTokens = new Set<number>();

  private ended(token: number): void {
    if (this.current?.token !== token) {
      // Синхронное завершение внутри play(): отметим, чтобы start() не считал реплику звучащей.
      if (token === this.token) this.endedTokens.add(token);
      return;
    }
    this.current = null;
    const now = this.now();
    this.queue = this.queue.filter((p) => p.expiresAt >= now);
    const next = this.queue.shift();
    if (next) this.start(next.id, next.priority);
  }
}

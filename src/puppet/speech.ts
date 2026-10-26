// Рот при речи: по уровню голоса выбирает форму рта. Без Pixi — проверяется тестами.
// Форма держится не меньше holdMs (рот не дрожит от кадра к кадру), ступень меняется с запасом (гистерезис),
// в коротких паузах между слогами губы смыкаются, в долгой паузе рот возвращается к выражению эмоции.

export interface SpeechShapes {
  /** Губы сомкнуты (между слогами). */
  readonly closed: string;
  /** Ступени раскрытия от малой к большой; в ступени — варианты, они чередуются. */
  readonly levels: readonly (readonly string[])[];
}

export interface SpeechTiming {
  /** Минимальное время одной формы, мс. */
  readonly holdMs: number;
  /** Сколько пауза считается паузой между слогами (губы сомкнуты), мс; дольше — рот эмоции. */
  readonly gapMs: number;
  /** Порог тишины по уровню голоса. */
  readonly silence: number;
  /** Запас при смене ступени (доля шкалы). */
  readonly hysteresis: number;
}

export const SPEECH_TIMING: SpeechTiming = { holdMs: 70, gapMs: 220, silence: 0.07, hysteresis: 0.06 };

export class SpeechMouth {
  private shape: string | null = null;
  private level = -1;
  private held = 0;
  private quiet = Infinity;
  private variant = 0;

  constructor(private readonly shapes: SpeechShapes, private readonly timing: SpeechTiming = SPEECH_TIMING) {}

  /**
   * Форма рта для уровня голоса 0…1; null — не говорит (рот эмоции).
   * maxLevel ограничивает раскрытие: в досаде и грусти рот не растягивается в смеющийся.
   */
  step(level: number, dtMs: number, maxLevel = this.shapes.levels.length - 1): string | null {
    const t = this.timing;
    this.held += dtMs;
    if (level < t.silence) {
      this.quiet += dtMs;
      if (this.quiet > t.gapMs) return this.set(null, -1);
      // Пауза между слогами: губы смыкаются, но не раньше, чем отыграла прежняя форма.
      return this.held < t.holdMs && this.shape ? this.shape : this.set(this.shapes.closed, -1);
    }
    this.quiet = 0;
    const n = Math.min(this.shapes.levels.length, maxLevel + 1);
    const scaled = (level - t.silence) / (1 - t.silence);
    let want = Math.min(n - 1, Math.floor(scaled * n));
    // Гистерезис: уровень у границы ступени не перебрасывает рот туда-сюда.
    if (this.level >= 0 && want !== this.level) {
      const edge = want > this.level ? want / n : (want + 1) / n;
      if (Math.abs(scaled - edge) < t.hysteresis) want = this.level;
    }
    want = Math.min(want, n - 1);
    if (want === this.level && this.shape) return this.shape;
    if (this.held < t.holdMs && this.shape) return this.shape;
    const options = this.shapes.levels[want]!;
    const next = options[this.variant++ % options.length]!;
    return this.set(next, want);
  }

  private set(shape: string | null, level: number): string | null {
    if (shape !== this.shape) this.held = 0;
    this.shape = shape;
    this.level = level;
    return shape;
  }
}

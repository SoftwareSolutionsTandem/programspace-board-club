// «Мозг» марионетки: из состояния, эмоции, жеста и времени получает значения каналов. Без DOM и Pixi —
// детерминирован (свой ГСЧ), проверяется тестами; отрисовку делает rig.ts.
// Слои: нейтральная поза → базовое состояние (ожидание, раздумье…) → лицо эмоции → блуждание, взгляд и речь →
// жест (перекрывает свои каналы) → пружины → моргание, дыхание и инерционные детали поверх.
import { createRng } from '../core/rng';
import type { Emotion } from '../characters/types';
import { clamp, lerp, MotionRng, Spring, Wander, type SpringParams } from './motion';
import { CHANNELS, groupOf, type BaseState, type Channel, type EyeStyle, type GestureDef, type MotionStyle, type Pose } from './types';

interface ActiveGesture {
  readonly def: GestureDef;
  t: number;
  fired: Set<string>;
  readonly onMarker?: (name: string) => void;
  /** Жест входа в состояние: прерванный другим жестом, он доигрывается после него. */
  readonly enter?: boolean;
  /** Мелкое действие (его можно прервать в любой момент). */
  readonly fidget?: boolean;
  /** Сколько последних ключей уже отыграно (разовые события ключа — смена эмоции). */
  keysDone: number;
  /** Сколько жест простоял, дожидаясь конца реплики (waitSpeech). */
  heldMs: number;
}

/** Дольше этого жест не ждёт реплику (запись потерялась, канал завис): сценка не застревает. */
const MAX_SPEECH_HOLD = 9000;

export class PuppetBrain {
  private readonly rng: MotionRng;
  private readonly springs = new Map<Channel, Spring>();
  private readonly springParams = new Map<Channel, SpringParams>();
  readonly values = {} as Record<Channel, number>;
  /** Нейтральная поза по всем каналам (недостающие в стиле — ноль). */
  readonly rest = {} as Record<Channel, number>;
  /** Без движения: пружины и блуждание выключены, жесты сразу отдают свои события. */
  reduced = false;
  private state: BaseState = 'idle';
  private stateUntil = 0;
  private emotion: Emotion = 'warm';
  private gesture: ActiveGesture | null = null;
  private time = 0;
  private speech = 0;
  // Взгляд.
  private look = { x: 0, y: 0.15 };
  private lookTimer = 0;
  private micro = { x: 0, y: 0 };
  private microTimer = 0;
  // Моргание.
  private blinkT = -1;
  private blinkTimer = 2500;
  private blinkAgain = false;
  /** 0 — веки открыты, 1 — закрыты. */
  blink = 0;
  /** Сколько раз моргнула (для e2e и демо). */
  blinks = 0;
  // Дыхание.
  private breathPhase = 0;
  private breathPeriod = 3.8;
  private breathAmp = 1;
  /** Подъём корпуса при вдохе, 0…depth. */
  breath = 0;
  // Блуждание и смена веса.
  private readonly wHeadRot: Wander;
  private readonly wHeadX: Wander;
  private readonly wHeadY: Wander;
  private shift = { rot: 0, x: 0 };
  private shiftTimer = 4000;
  // Мелкие действия.
  private fidgetTimer = 5000;
  private lastFidget = '';
  // Инерционные детали (углы в градусах относительно головы).
  private readonly bunSpring: Spring;
  private readonly earSprings: [Spring, Spring];
  private readonly bangsSpring: Spring;
  private readonly bangsYSpring: Spring;
  private readonly fringeSpring: Spring;
  private prevTotal = 0;
  private prevHeadX = 0;
  bun = 0;
  earL = 0;
  earR = 0;
  /** Чёлка: поворот (градусы) и сдвиг по вертикали относительно головы — запаздывает за движением головы. */
  bangsRot = 0;
  bangsY = 0;
  /** Бахрома шали: отклонение прядей, градусы (корпус качнулся — пряди догоняют). */
  fringe = 0;
  // Форма глаз меняется не подменой картинки: глаза прикрываются (или дуги сплющиваются), форма меняется,
  // новая раскрывается с лёгким перелётом.
  /** Показанная форма глаз. */
  eyes: EyeStyle = 'ball';
  private eyesTarget: EyeStyle = 'ball';
  private eyePhase: 'none' | 'close' | 'open' = 'none';
  private eyeT = 0;
  private readonly eyeSX: Spring;
  private readonly eyeSY: Spring;
  /** Дополнительное прикрытие век при смене формы (0…1), складывается с морганием. */
  eyeClose = 0;
  /** Масштаб глаз при смене формы (1 — как на рисунке). */
  eyeScaleX = 1;
  eyeScaleY = 1;
  holdCard = false;
  /** В какой руке предмет. */
  holdHand: 'l' | 'r' = 'r';
  /** Какая рука над предметами на столе (ключ жеста front). */
  armsFront: 'l' | 'r' | null = null;
  /** Жест входа в состояние ждёт конца текущего жеста. */
  private pendingEnter: GestureDef | null = null;
  /** Реквизит в кистях (имена PuppetArt.props) — по ключам текущего жеста. */
  propL: string | null = null;
  propR: string | null = null;
  /** Рот поверх эмоции (ключ жеста mouth), когда персонаж молчит. */
  mouthOverride: string | null = null;
  /** Форма глаз поверх эмоции (ключ жеста eyes). */
  private eyesOverride: EyeStyle | null = null;
  /** Персонаж сейчас говорит (сеанс ставит по голосовому каналу): ключ waitSpeech держит жест. */
  talking = false;

  constructor(private readonly style: MotionStyle, seed: number) {
    this.rng = new MotionRng(createRng(seed));
    for (const c of CHANNELS) {
      const v = (this.rest[c] = style.rest[c] ?? 0);
      this.values[c] = v;
      const p = style.springs[groupOf(c)];
      this.springs.set(c, new Spring(v, p));
      this.springParams.set(c, p);
    }
    this.wHeadRot = new Wander(this.rng, 2.6);
    this.wHeadX = new Wander(this.rng, 3.4);
    this.wHeadY = new Wander(this.rng, 2.1);
    this.bunSpring = new Spring(0, style.secondary.bun);
    this.earSprings = [new Spring(0, style.secondary.earrings), new Spring(0, style.secondary.earrings)];
    this.bangsSpring = new Spring(0, style.secondary.bangs);
    this.bangsYSpring = new Spring(0, style.secondary.bangs);
    this.fringeSpring = new Spring(0, style.secondary.fringe);
    this.eyeSX = new Spring(1, style.eyeSwap.pop);
    this.eyeSY = new Spring(1, style.eyeSwap.pop);
    this.applyFace(true);
    this.breathPeriod = this.rng.range(style.breath.period[0], style.breath.period[1]);
  }

  get currentState(): BaseState {
    return this.state;
  }

  get currentEmotion(): Emotion {
    return this.emotion;
  }

  get gestureId(): string | null {
    return this.gesture?.def.id ?? null;
  }

  /** Идёт жест, который не стоит прерывать (не мелкое действие): ход, реакция, вход в состояние. */
  get busy(): boolean {
    return !!this.gesture && !this.gesture.fidget;
  }

  /** Базовое состояние на holdMs (0 — до следующей смены); по истечении — ожидание. */
  setState(s: BaseState, holdMs = 0): void {
    this.stateUntil = holdMs > 0 ? this.time + holdMs : 0;
    if (s === this.state) return;
    this.state = s;
    this.lookTimer = 0;
    this.fidgetTimer = this.rng.range(...this.style.states[s].fidgetEvery);
    const enter = this.style.states[s].enter;
    // Жест входа не обрывает идущий жест (бросок должен отпустить карту в свой момент) — ждёт его конца.
    if (!enter) this.pendingEnter = null;
    else if (this.gesture && this.gesture.def.markers?.length) this.pendingEnter = enter;
    else this.play(enter);
  }

  setEmotion(e: Emotion): void {
    if (e === this.emotion) return;
    this.emotion = e;
    this.applyFace(false);
  }

  /** Уровень голоса 0…1: голова и брови оживают в такт речи. */
  setSpeech(level: number): void {
    this.speech = level;
  }

  /**
   * Сыграть жест. Новый жест прерывает текущий: его несработавшие события (например, release) срабатывают сразу,
   * чтобы зависящий от них ход (полёт карты) не ждал вечно; пружины продолжают движение с текущей скорости.
   */
  play(def: GestureDef, onMarker?: (name: string) => void): void {
    const cur = this.gesture;
    if (cur?.enter && def !== cur.def && this.style.states[this.state].enter === cur.def) this.pendingEnter = cur.def;
    this.flushGesture();
    if (this.reduced) {
      for (const m of def.markers ?? []) onMarker?.(m.name);
      return;
    }
    this.gesture = { def, t: 0, fired: new Set(), onMarker, enter: def === this.style.states[this.state].enter, keysDone: 0, heldMs: 0 };
  }

  /** Прервать текущий жест (сценку) — пружины вернут каналы к базовому состоянию. */
  stopGesture(): void {
    this.flushGesture();
  }

  private flushGesture(): void {
    const g = this.gesture;
    this.gesture = null;
    this.holdCard = false;
    this.armsFront = null;
    this.propL = this.propR = null;
    this.mouthOverride = null;
    this.setEyesOverride(null);
    if (!g) return;
    for (const m of g.def.markers ?? []) {
      if (!g.fired.has(m.name)) {
        g.fired.add(m.name);
        g.onMarker?.(m.name);
      }
    }
  }

  private setEyesOverride(e: EyeStyle | null): void {
    if (e === this.eyesOverride) return;
    this.eyesOverride = e;
    this.applyFace(false);
  }

  private applyFace(instant: boolean): void {
    const f = this.style.faces[this.emotion];
    this.eyesTarget = this.eyesOverride ?? f.eyes;
    if (instant || this.reduced) {
      this.eyes = this.eyesTarget;
      this.eyePhase = 'none';
      this.eyeClose = 0;
      return;
    }
    // Во время раскрытия новой формы пришла ещё одна — снова прикрыть, начиная с текущего положения век.
    if (this.eyesTarget !== this.eyes && this.eyePhase !== 'close') {
      this.eyePhase = 'close';
      this.eyeT = this.eyeClose * this.style.eyeSwap.close;
    }
  }

  /** Есть ли у формы веки (белки со зрачками) или это нарисованные дуги. */
  private static lidded(e: EyeStyle): boolean {
    return e === 'ball' || e === 'wide' || e === 'star';
  }

  private stepEyes(dtMs: number): void {
    const sw = this.style.eyeSwap;
    const dt = dtMs / 1000;
    if (this.reduced) {
      this.eyes = this.eyesTarget;
      this.eyePhase = 'none';
      this.eyeClose = 0;
      this.eyeSX.snap(1);
      this.eyeSY.snap(1);
    }
    if (this.eyePhase === 'close') {
      this.eyeT += dtMs;
      const u = Math.min(1, this.eyeT / sw.close);
      if (PuppetBrain.lidded(this.eyes)) this.eyeClose = u;
      else this.eyeSY.snap(1 - 0.8 * u);
      if (u >= 1) {
        const from = this.eyes;
        this.eyes = this.eyesTarget;
        this.eyePhase = 'open';
        this.eyeT = 0;
        // Новая форма раскрывается от размера прежней (белки) или из сплющенной дуги.
        const a = sw.size[from], b = sw.size[this.eyes];
        if (PuppetBrain.lidded(this.eyes)) {
          this.eyeClose = 1;
          this.eyeSX.snap(PuppetBrain.lidded(from) ? a[0] / b[0] : 0.9);
          this.eyeSY.snap(PuppetBrain.lidded(from) ? a[1] / b[1] : 0.85);
        } else {
          this.eyeClose = 0;
          this.eyeSX.snap(0.9);
          this.eyeSY.snap(0.25);
        }
      }
    } else if (this.eyePhase === 'open') {
      this.eyeT += dtMs;
      this.eyeClose = PuppetBrain.lidded(this.eyes) ? Math.max(0, 1 - this.eyeT / sw.open) : 0;
      if (this.eyeT >= sw.open * 3) this.eyePhase = 'none';
    }
    this.eyeScaleX = this.eyePhase === 'close' ? this.eyeSX.y : this.eyeSX.step(1, dt);
    this.eyeScaleY = this.eyePhase === 'close' ? this.eyeSY.y : this.eyeSY.step(1, dt);
    if (this.eyePhase === 'none') this.eyeClose = 0;
  }

  // ---------- шаг ----------

  step(dtMs: number): void {
    const dt = Math.min(dtMs, 100) / 1000;
    this.time += dtMs;
    if (this.stateUntil > 0 && this.time >= this.stateUntil) {
      this.stateUntil = 0;
      this.setState('idle');
    }
    const st = this.style.states[this.state];
    const face = this.style.faces[this.emotion];
    const live = !this.reduced;
    this.stepEyes(dtMs);

    // Цели: нейтральная поза → состояние → лицо.
    const target = { ...this.rest };
    Object.assign(target, st.pose, face.pose);

    // Взгляд: переводы взгляда по точкам интереса состояния и мелкие подрагивания.
    if (live) {
      this.lookTimer -= dtMs;
      if (this.lookTimer <= 0) {
        const prev = this.look;
        const next = this.rng.pick(st.looks, (l) => (Math.hypot(l.x - prev.x, l.y - prev.y) < 0.15 ? l.weight * 0.15 : l.weight));
        this.look = { x: next.x + this.rng.range(-0.08, 0.08), y: next.y + this.rng.range(-0.06, 0.06) };
        this.lookTimer = this.rng.range(st.saccade[0], st.saccade[1]);
        // Большой перевод взгляда часто сопровождается морганием.
        if (Math.hypot(this.look.x - prev.x, this.look.y - prev.y) > 0.7 && this.blinkT < 0 && this.rng.next() < 0.4) this.startBlink();
      }
      this.microTimer -= dtMs;
      if (this.microTimer <= 0) {
        this.micro = { x: this.rng.range(-0.035, 0.035), y: this.rng.range(-0.03, 0.03) };
        this.microTimer = this.rng.range(250, 700);
      }
    }
    // Без движения взгляд — прямо на игрока, как на утверждённом рисунке.
    target.gazeX = live ? this.look.x + this.micro.x : 0;
    target.gazeY = live ? this.look.y + this.micro.y : 0;

    // Жест перекрывает свои каналы.
    const g = this.gesture;
    const gesturePose: Pose = {};
    const springOverride: Partial<Record<string, SpringParams>> = {};
    if (g) {
      // Ключ «ждать речь»: пока персонаж говорит, время жеста стоит на этом ключе (не дольше MAX_SPEECH_HOLD).
      const cur = g.def.keys.reduce<(typeof g.def.keys)[number] | null>((a, k) => (k.at <= g.t ? k : a), null);
      if (cur?.waitSpeech && this.talking && g.heldMs < MAX_SPEECH_HOLD && !this.reduced) g.heldMs += dtMs;
      else g.t += dtMs;
      let hold = false, hand: 'l' | 'r' = 'r', front: 'l' | 'r' | false = false;
      let propL: string | null = null, propR: string | null = null, mouth: string | null = null, eyes: EyeStyle | null = null;
      let done = 0;
      for (const k of g.def.keys) {
        if (k.at > g.t) break;
        Object.assign(gesturePose, k.pose);
        if (k.spring) Object.assign(springOverride, k.spring);
        hold = k.holdCard ?? hold;
        hand = k.holdHand ?? hand;
        front = k.front ?? front;
        if (k.props && 'l' in k.props) propL = k.props.l ?? null;
        if (k.props && 'r' in k.props) propR = k.props.r ?? null;
        if (k.mouth !== undefined) mouth = k.mouth;
        if (k.eyes !== undefined) eyes = k.eyes;
        // Разовое событие ключа — только когда до него дошли впервые.
        if (++done > g.keysDone && k.emotion) this.setEmotion(k.emotion);
      }
      g.keysDone = Math.max(g.keysDone, done);
      this.holdCard = hold;
      this.holdHand = hand;
      this.armsFront = front || null;
      this.propL = propL;
      this.propR = propR;
      this.mouthOverride = mouth;
      this.setEyesOverride(eyes);
      for (const m of g.def.markers ?? []) {
        if (m.at <= g.t && !g.fired.has(m.name)) {
          g.fired.add(m.name);
          g.onMarker?.(m.name);
        }
      }
      if (g.t >= g.def.duration) this.flushGesture();
    }
    Object.assign(target, gesturePose);

    // Голова следует за взглядом; блуждание и смена веса — только без жеста на этих каналах.
    const wanderK = live ? st.wander * (g ? 0.35 : 1) : 0;
    const w = this.style.wander;
    if (live) {
      this.shiftTimer -= dtMs;
      if (this.shiftTimer <= 0) {
        this.shift = { rot: this.rng.range(-w.torsoRot, w.torsoRot), x: this.rng.range(-w.torsoX, w.torsoX) };
        this.shiftTimer = this.rng.range(w.shiftEvery[0], w.shiftEvery[1]);
      }
    }
    const headFree = !('headRot' in gesturePose);
    if (!('torsoRot' in gesturePose)) target.torsoRot += this.shift.rot * wanderK;
    if (!('torsoX' in gesturePose)) target.torsoX += this.shift.x * wanderK;
    const wr = live ? this.wHeadRot.step(dt) : 0;
    const wx = live ? this.wHeadX.step(dt) : 0;
    const wy = live ? this.wHeadY.step(dt) : 0;
    target.headRot += wr * w.headRot * wanderK - (headFree ? this.shift.rot * 0.45 * wanderK : 0) + (headFree ? target.gazeX * this.style.gazeHead.rot : 0);
    target.headX += wx * w.headX * wanderK;
    target.headY += wy * w.headY * wanderK + (headFree ? target.gazeY * this.style.gazeHead.y : 0) + this.speech * 1.6;
    // Взгляд вверх поднимает брови; речь тоже слегка оживляет брови.
    const browLift = Math.max(0, -target.gazeY) * 3 + this.speech * 2;
    for (const c of ['browLI', 'browLO', 'browLM', 'browRI', 'browRO', 'browRM'] as const) target[c] -= browLift;

    // Отложенный жест входа в состояние — как только закончился текущий.
    if (!this.gesture && this.pendingEnter) {
      const e = this.pendingEnter;
      this.pendingEnter = null;
      if (e === st.enter) this.play(e);
    }
    // Мелкие действия — только в своём состоянии и без другого жеста.
    if (live && !this.gesture && st.fidgets.length) {
      this.fidgetTimer -= dtMs;
      if (this.fidgetTimer <= 0) {
        const choices = st.fidgets.length > 1 ? st.fidgets.filter((f) => f.id !== this.lastFidget) : st.fidgets;
        const f = this.rng.pick(choices);
        this.lastFidget = f.id;
        this.gesture = { def: f, t: 0, fired: new Set(), fidget: true, keysDone: 0, heldMs: 0 };
        this.fidgetTimer = this.rng.range(st.fidgetEvery[0], st.fidgetEvery[1]);
      }
    }

    // Пружины.
    for (const c of CHANNELS) {
      const s = this.springs.get(c)!;
      if (!live) {
        s.snap(target[c]);
        this.values[c] = target[c];
        continue;
      }
      const p = springOverride[groupOf(c)] ?? this.style.springs[groupOf(c)];
      if (this.springParams.get(c) !== p) {
        s.set(p);
        this.springParams.set(c, p);
      }
      this.values[c] = s.step(target[c], dt);
    }
    // Зрачки не выходят за белок.
    this.values.gazeX = clamp(this.values.gazeX, -1, 1);
    this.values.gazeY = clamp(this.values.gazeY, -1, 1);

    this.stepBlink(dtMs);
    this.stepBreath(dt, live);
    this.stepSecondary(dt, live);
  }

  private startBlink(): void {
    this.blinkT = 0;
    this.blinks++;
  }

  private stepBlink(dtMs: number): void {
    const b = this.style.blink;
    if (this.blinkT < 0) {
      this.blinkTimer -= dtMs;
      if (this.blinkTimer <= 0) {
        this.startBlink();
        this.blinkAgain = this.rng.next() < b.double;
        this.blinkTimer = this.rng.range(b.every[0], b.every[1]);
      }
      this.blink = 0;
      return;
    }
    this.blinkT += dtMs;
    const u = this.blinkT / b.ms;
    // Веко падает быстрее, чем поднимается: закрытие 35 %, пауза 15 %, открытие 50 %.
    this.blink = u < 0.35 ? u / 0.35 : u < 0.5 ? 1 : u < 1 ? 1 - (u - 0.5) / 0.5 : 0;
    if (this.reduced) this.blink = u < 0.5 ? 1 : 0;
    if (u >= 1) {
      this.blinkT = -1;
      if (this.blinkAgain) {
        this.blinkAgain = false;
        this.blinkTimer = 90;
      }
    }
  }

  private stepBreath(dt: number, live: boolean): void {
    if (!live) {
      this.breath = 0;
      return;
    }
    this.breathPhase += dt / this.breathPeriod;
    if (this.breathPhase >= 1) {
      this.breathPhase -= 1;
      this.breathPeriod = this.rng.range(this.style.breath.period[0], this.style.breath.period[1]);
      this.breathAmp = this.rng.range(0.7, 1.2);
    }
    // Вдох (45 %) мягче выдоха; глубина каждого вдоха своя.
    const p = this.breathPhase;
    const v = p < 0.45 ? 0.5 - 0.5 * Math.cos((Math.PI * p) / 0.45) : 0.5 + 0.5 * Math.cos((Math.PI * (p - 0.45)) / 0.55);
    this.breath = v * this.breathAmp * this.style.breath.depth;
  }

  private stepSecondary(dt: number, live: boolean): void {
    const total = this.values.torsoRot + this.values.headRot;
    const dTotal = total - this.prevTotal;
    const dX = this.values.headX + this.values.torsoX - this.prevHeadX;
    this.prevTotal = total;
    this.prevHeadX = this.values.headX + this.values.torsoX;
    const fringeIn = this.values.torsoRot + this.values.torsoX * 0.6;
    const headLift = this.values.headY + this.values.torsoY;
    if (!live) {
      this.bun = 0;
      this.earL = -total;
      this.earR = -total;
      this.bangsRot = this.bangsY = this.fringe = 0;
      this.bangsSpring.snap(total);
      this.bangsYSpring.snap(headLift);
      this.fringeSpring.snap(fringeIn);
      return;
    }
    const sec = this.style.secondary;
    // Пучок догоняет голову с запаздыванием и лёгким перелётом.
    this.bun = (this.bunSpring.step(total, dt) - total) * sec.bunGain;
    // Серьги — маятники: голова тянет их за собой, пружина возвращает к отвесу.
    const ears = [this.earSprings[0], this.earSprings[1]];
    for (const s of ears) {
      s.y += dTotal * 0.85 - dX * sec.earGain;
      s.step(0, dt);
    }
    this.earL = ears[0]!.y - total;
    this.earR = ears[1]!.y - total;
    // Чёлка лёгкая и короткая: запаздывает чуть-чуть, сильно не болтается.
    this.bangsRot = clamp((this.bangsSpring.step(total, dt) - total) * sec.bangsGain, -sec.bangsMax, sec.bangsMax);
    this.bangsY = clamp((this.bangsYSpring.step(headLift, dt) - headLift) * sec.bangsLift, -1.5, 1.5);
    // Бахрома шали — на мягкой пружине с перелётом: корпус качнулся — пряди догоняют и покачиваются.
    this.fringe = clamp((this.fringeSpring.step(fringeIn, dt) - fringeIn) * sec.fringeGain, -sec.fringeMax, sec.fringeMax);
  }

  /** Доля закрытия век с учётом моргания для веки: lerp(цель, закрыто, blink). */
  lid(value: number, closed: number): number {
    return lerp(value, closed, Math.max(this.blink, this.eyeClose));
  }
}

// Игровой сеанс партии на доске (шахматы, шашки) против персонажа: связывает контроллер партии, сцену доски,
// реакции, голос и HTML-интерфейс. Игру описывает адаптер BoardGameSpec; сеанс не знает правил — ходы
// приходят списком «путей» (поле за полем), выбор игрока — касания полей, проверка — в движке игры.
import type { Container } from 'pixi.js';
import { button, el, iconButton, ICONS, placeChalk } from '../app/dom';
import type { GameAssets, GameSession, SessionHost, SessionOptions } from '../app/game';
import type { SfxName } from '../audio/engine';
import { VoiceChannel } from '../audio/voiceChannel';
import { CharacterLife, moodOf, PlayTempo } from '../characters/life';
import { Director, type Cue, type Trigger } from '../characters/director';
import type { LineCategory, VoiceLine } from '../characters/types';
import { createRng, nextInt, type RngState } from '../core/rng';
import { t } from '../i18n';
import type { BoardLayout } from '../layout/board';
import { cellOfSquare, squareOfCell } from '../layout/iso';
import type { LayoutSpec } from '../layout/layout';
import { BG_BOARD } from '../render/cafe';
import { Tweener } from '../render/tween';
import type { MotionStyle } from '../puppet/types';
import type { Settings } from '../storage/settings';
import type { BoardMatch, Side } from './match';
import { BoardScene, NO_MARKS, type BoardBank, type BoardSkin, type MoveAnim } from './scene';
import { systemReducedMotion } from '../render/ambient';

/** Ход как путь по полям: шахматы — [откуда, куда] (+ фигура превращения), шашки — все поля прыжков. */
export interface MovePath<A> {
  readonly action: A;
  readonly path: readonly number[];
  /** Поля фигур, которые ход снимает. */
  readonly captures: readonly number[];
  /** Фигура превращения (шахматы): q, r, b, n. */
  readonly promotion?: string;
}

export interface Lead {
  /** Перевес персонажа по материалу (у шахмат — в пешках, у шашек — в шашках; дамка — за несколько). */
  readonly value: number;
}

/** Контекст реакции на ход. */
export interface ReactionContext<E, V> {
  readonly events: readonly E[];
  /** Кто ходил: игрок или персонаж. */
  readonly mover: 'human' | 'opponent';
  readonly before: V;
  readonly after: V;
  /** Перевес персонажа до хода и после. */
  readonly leadBefore: number;
  readonly leadAfter: number;
  /** Сколько полуходов сделано в партии с учётом этого хода (первый ход партии — 1). */
  readonly ply: number;
}

export interface TutorialContext<V, A> {
  readonly view: V;
  readonly paths: readonly MovePath<A>[];
  readonly humanMoves: number;
  readonly inCheck: boolean;
}

/** Шаг обучения: ключ текста (`<prefix>.tut.<id>`) и категория реплики. */
export interface TutorialStepDef<V, A> {
  readonly id: string;
  readonly line: LineCategory;
  when(ctx: TutorialContext<V, A>): boolean;
}

export interface BoardGameSpec<S, A extends { readonly type: string; readonly color: Side }, E, V, Err, L> {
  readonly id: 'chess' | 'checkers';
  /** Префикс строк: chess.*, chk.* */
  readonly prefix: string;
  readonly lines: readonly VoiceLine[];
  readonly metKey: 'metKhariton' | 'metKostyan';
  readonly tutorialKey: 'chessTutorialDone' | 'checkersTutorialDone';
  readonly motion: MotionStyle;
  readonly skin: BoardSkin;
  /** Жесты итога партии. */
  readonly gestures: { readonly win: string; readonly lose: string; readonly draw: string; readonly praise: string };
  match(opts: { seed: number; level: L }): BoardMatch<S, A, E, V, Err, L>;
  /** Ключи текстур фигур по полям (с точки зрения доски, a1 = 0). */
  pieces(v: V): (string | null)[];
  paths(actions: readonly A[], v: V): MovePath<A>[];
  /** Анимация хода по событиям; v — позиция до хода. */
  anim(events: readonly E[], v: V, capturer: 'human' | 'opponent'): MoveAnim | null;
  lastMove(v: V): readonly number[];
  /** Поле короля под шахом (шахматы) или null. */
  check(v: V): number | null;
  /** Взятые фигуры: что взял игрок (фигуры соперника) и что взял персонаж. */
  trays(v: V, human: Side): { human: string[]; opponent: string[] };
  /** Перевес стороны side по материалу. */
  lead(v: V, side: Side): number;
  reaction(ctx: ReactionContext<E, V>): Trigger | null;
  /** Итог: ключ причины (`<prefix>.result.<reason>`) или null — партия идёт. */
  reason(v: V): string | null;
  /** Шашки: взятие обязательно — подсветить, кто может бить, и сказать об этом. */
  readonly mandatoryCapture: boolean;
  readonly tutorial: readonly TutorialStepDef<V, A>[];
  /** Персонаж высказывается о собственной позиции не чаще… (мс). */
  readonly minGapMs: number;
}

const PROMOTION_ORDER = ['q', 'r', 'b', 'n'];

/**
 * Чьими словами персонаж встречает итог: победа игрока — поражение персонажа (`lose`), и наоборот. Пат — свои
 * слова («Пат… Какая ирония»): при ничьей повторением или по 50 ходам они были бы неправдой. Сдачу игрока
 * озвучивает `playerResign`, здесь она не встречается.
 */
export function resultCategory(humanWon: boolean, draw: boolean, reason: string | null): LineCategory {
  if (draw) return reason === 'stalemate' ? 'stalemate' : 'draw';
  return humanWon ? 'lose' : 'win';
}

export class BoardSession<S, A extends { readonly type: string; readonly color: Side }, E, V, Err, L> implements GameSession {
  readonly scene: BoardScene;
  readonly match: BoardMatch<S, A, E, V, Err, L>;
  readonly overlay = el('div', 'game');
  private readonly tweens = new Tweener();
  private readonly voice: VoiceChannel;
  private readonly life: CharacterLife;
  /** С какого момента игрок думает над ходом (null — сейчас не его ход). */
  private waitSince: number | null = null;
  /** Темп игрока и длительность партии — для сценок-ответов. */
  private readonly tempo: PlayTempo;
  private readonly voiceLog: { id: string; outcome: string }[] = [];
  private readonly director: Director;
  private layout: BoardLayout | null = null;
  /** Выбранные поля пути (первое — фигура). */
  private prefix: number[] = [];
  /** Ход с превращением ждёт выбора фигуры. */
  private promoting: MovePath<A>[] | null = null;
  private cursor: number | null = null;
  /** Курсор виден, только пока игрок ходит с клавиатуры. */
  private keyboard = false;
  private busy = true;
  private disposed = false;
  private paused = false;
  private tutorial: Set<string> | null;
  private humanMoves = 0;
  /** До этого момента текущую подсказку обучения не сменять: её нужно успеть прочитать. */
  private coachUntil = 0;
  /** Сделано полуходов в текущей партии (для отладки и e2e). */
  private plies = 0;
  private pending: { fn: () => void; ms: number } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private emotionTimer: ReturnType<typeof setTimeout> | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private paceRng: RngState;
  private readonly status = el('div', 'status');
  private readonly actions = el('div', 'actions');
  private readonly hint = el('div', 'toast');
  private readonly subtitle = el('div', 'subtitle-line');
  private readonly chalk = el('div', 'chalk');
  private readonly coachBox = el('div', 'coach');
  private readonly result = el('div', 'result');
  private readonly soundBtn: HTMLButtonElement;
  private actionsSig = '';

  constructor(private readonly host: SessionHost, opts: SessionOptions, private readonly spec: BoardGameSpec<S, A, E, V, Err, L>, private readonly nameKey: string) {
    this.match = spec.match({ seed: opts.seed, level: (opts.tutorial ? 'easy' : opts.level) as L });
    this.paceRng = createRng(opts.seed ^ 0x51ed270b);
    this.scene = new BoardScene(this.tweens, {
      onSquare: (sq) => {
        this.keyboard = false;
        this.onSquare(sq);
      },
    }, spec.motion, spec.skin, opts.seed + 31);
    this.voice = new VoiceChannel(host.audio, () => host.now());
    this.director = new Director({ lines: spec.lines, minGapMs: spec.minGapMs, lineCooldownMs: 120_000, gestureGapMs: 7000, available: (id) => host.audio.hasLine(id) && !this.voice.isUnavailable(id) }, createRng(opts.seed + 23));
    // «Своя жизнь» в паузах: сценки, пока игрок думает (src/characters/life.ts).
    this.tempo = new PlayTempo(host.now());
    this.life = new CharacterLife(this.scene.rig, this.scene.rig.scenes, createRng(opts.seed + 41), host.now(), (category, emotion) => this.sayIdle(category, emotion));
    this.tutorial = opts.tutorial ? new Set() : null;
    const hudLeft = el('div', 'hud hud--left');
    hudLeft.append(iconButton(ICONS.menu, t('hud.menu'), () => this.openPause()));
    const hudRight = el('div', 'hud hud--right');
    this.soundBtn = iconButton(ICONS.sound, t('hud.sound'), () => this.toggleMute());
    hudRight.append(this.soundBtn);
    this.subtitle.setAttribute('aria-live', 'polite');
    this.hint.setAttribute('role', 'status');
    this.chalk.setAttribute('aria-label', t('board.tally.label'));
    this.overlay.append(this.chalk, hudLeft, hudRight, this.status, this.actions, this.coachBox, this.hint, this.subtitle, this.result);
    this.applySettings(host.settings());
  }

  get root(): Container {
    return this.scene.root;
  }

  private get p(): string {
    return this.spec.prefix;
  }

  view(): V {
    return this.match.view();
  }

  private paths(): MovePath<A>[] {
    return this.spec.paths(this.match.humanActions(), this.view());
  }

  debug() {
    const paths = this.paths();
    return {
      view: this.view(),
      ambient: this.scene.ambient.stats(),
      human: this.match.human,
      legal: paths.map((m) => ({ path: [...m.path], captures: [...m.captures], promotion: m.promotion ?? null })),
      busy: this.busy || this.scene.busy,
      over: this.match.over,
      winner: this.match.winner,
      tallies: this.match.tallies,
      plies: this.plies,
      selected: [...this.prefix],
      promoting: !!this.promoting,
      pose: this.scene.rig.currentPose,
      emotion: this.scene.rig.currentEmotion,
      blinks: this.scene.rig.blinks,
      gesture: this.scene.rig.brain.gestureId,
      speaking: this.voice.speaking,
      voiceLog: [...this.voiceLog],
      life: this.life.playing,
      lifeTier: this.life.playingTier,
      props: [this.scene.rig.brain.propL, this.scene.rig.brain.propR],
      /** e2e: сыграть сценку сразу. */
      playScene: (id: string) => {
        const sc = this.scene.rig.scenes.find((s) => s.id === id);
        if (sc) void this.life.play(sc);
      },
      scene: this.scene.debug(),
      /** Центр поля на экране (CSS-пиксели) — для e2e. */
      squareAt: (sq: number) => this.scene.debug().square(sq),
      act: (i: number) => {
        const m = paths[i];
        if (m && !this.busy) void this.perform(m);
      },
    };
  }

  // ---------- запуск ----------

  setAssets(assets: GameAssets): void {
    this.scene.setTextures((assets as GameAssets & { bank: BoardBank }).bank);
  }

  setLayout(spec: LayoutSpec): void {
    const s = spec as BoardLayout;
    this.layout = s;
    this.scene.setLayout(s);
    const place = (node: HTMLElement, r: { x: number; y: number; w: number; h: number }) => Object.assign(node.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    place(this.actions, s.actions);
    place(this.status, s.status);
    this.actions.classList.toggle('actions--column', s.kind === 'landscape-compact');
    this.status.classList.toggle('status--multiline', s.kind !== 'portrait' && s.kind !== 'portrait-wide');
    const b = s.background;
    placeChalk(this.chalk, { x: b.x + BG_BOARD.x * b.scale, y: b.y + BG_BOARD.y * b.scale, w: BG_BOARD.w * b.scale, h: BG_BOARD.h * b.scale }, Math.max(9, 16 * b.scale), 3);
    // Подсказки и обучение — над доской, под лицом персонажа.
    this.overlay.style.setProperty('--play-top', `${s.table.farY + 8}px`);
    this.overlay.style.setProperty('--hand-top', `${s.status.y}px`);
    this.overlay.style.setProperty('--ui-scale', String(Math.min(1.5, Math.max(1, Math.min(s.width / 1280, s.height / 720)))));
    this.overlay.dataset.layout = s.kind;
    this.overlay.dataset.game = this.spec.id;
    this.refresh();
  }

  start(): void {
    this.resetBoard();
    const s = this.host.settings();
    this.cue({ category: s[this.spec.metKey] ? 'greetAgain' : 'greetFirst', emotion: 'warm', priority: 'greeting', chance: 1 });
    if (!s[this.spec.metKey]) this.host.updateSettings({ [this.spec.metKey]: true } as Partial<Settings>);
    this.soon(() => this.cue({ category: 'gameStart', emotion: 'think', priority: 'reaction', chance: 0.6 }), 2800);
    this.host.audio.sfx('shuffle');
    this.busy = false;
    this.showCoach();
    this.advance();
  }

  private resetBoard(): void {
    const v = this.view();
    this.scene.setPerspective(this.match.human);
    this.scene.sync(this.spec.pieces(v));
    const trays = this.spec.trays(v, this.match.human);
    this.scene.setTrays(trays.human, trays.opponent);
    this.prefix = [];
    this.promoting = null;
    this.refresh();
  }

  private applySettings(s: Settings): void {
    this.voice.setEnabled(!s.muted && s.voiceVolume > 0);
    this.tweens.instant = s.reducedMotion;
    this.scene.rig.reducedMotion = s.reducedMotion;
    this.scene.ambient.reduced = s.reducedMotion || systemReducedMotion();
    this.soundBtn.innerHTML = s.muted ? ICONS.mute : ICONS.sound;
    this.soundBtn.setAttribute('aria-label', s.muted ? t('hud.soundOff') : t('hud.sound'));
    if (!s.subtitles) this.subtitle.textContent = '';
  }

  settingsChanged(s: Settings): void {
    this.applySettings(s);
  }

  // ---------- игровой цикл ----------

  private advance(): void {
    if (this.disposed) return;
    this.refresh();
    if (this.match.over) return;
    if (this.match.turn() === this.match.opponent) {
      const [r, next] = nextInt(this.paceRng, 900);
      this.paceRng = next;
      // «Думает» — пауза сцены; сам поиск ИИ детерминирован и от неё не зависит.
      const think = 650 + r;
      this.scene.rig.setPose('think', think + 600);
      this.cue({ category: 'nvHmm', emotion: 'think', priority: 'idle', chance: 0.18 });
      this.later(() => void this.opponentMove(), this.host.settings().reducedMotion ? 200 : think);
      return;
    }
    this.armIdle();
    this.showCoach();
  }

  private async opponentMove(): Promise<void> {
    if (this.disposed || this.busy) return;
    this.busy = true;
    this.refresh();
    const before = this.view();
    const r = this.match.opponentStep();
    if (r?.ok) {
      this.plies++;
      const anim = this.spec.anim(r.events, before, 'opponent');
      // Рука персонажа тянется к своей фигуре; фигура прыгает, когда рука её «касается».
      if (anim && anim.path[0] !== undefined) {
        const target = this.scene.root.toGlobal(this.scene.squarePoint(anim.path[0]));
        await this.scene.rig.gesture('move', target, 'release');
      }
      await this.afterMove(r.events, before, anim, 'opponent');
    }
    this.busy = false;
    this.advance();
  }

  private async perform(m: MovePath<A>): Promise<void> {
    if (this.disposed || this.busy) return;
    const before = this.view();
    const r = this.match.act(m.action);
    if (!r.ok) {
      this.showHint('illegal');
      return;
    }
    this.busy = true;
    this.clearIdle();
    this.prefix = [];
    this.promoting = null;
    this.humanMoves++;
    this.plies++;
    this.refresh();
    await this.afterMove(r.events, before, this.spec.anim(r.events, before, 'human'), 'human');
    this.busy = false;
    this.advance();
  }

  private async afterMove(events: readonly E[], before: V, anim: MoveAnim | null, mover: 'human' | 'opponent'): Promise<void> {
    const after = this.view();
    const me = this.match.opponent;
    const trig = this.spec.reaction({ events, mover, before, after, leadBefore: this.spec.lead(before, me), leadAfter: this.spec.lead(after, me), ply: this.plies });
    if (mover === 'human' && !trig) this.scene.rig.setPose('idle');
    const gesture = trig ? this.cue(trig, true) : undefined;
    if (anim) {
      const done = this.scene.animate(anim, this.spec.pieces(after));
      this.host.audio.sfx(anim.captures.length ? 'slap' : 'clack');
      await done;
    } else this.scene.sync(this.spec.pieces(after));
    const trays = this.spec.trays(after, this.match.human);
    this.scene.setTrays(trays.human, trays.opponent);
    if (gesture) void this.scene.rig.whenFree().then(() => {
      if (!this.disposed) void this.scene.rig.gesture(gesture);
    });
    if (this.match.over) this.finish();
  }

  // ---------- реакции ----------

  private cue(trigger: Trigger, deferGesture = false): string | undefined {
    this.life.event(this.host.now());
    if (trigger.priority === 'result') this.life.stop();
    const c: Cue = this.director.react(trigger, this.host.now());
    this.scene.rig.setEmotion(c.emotion);
    if (c.pose) this.scene.rig.setPose(c.pose, c.pose === 'victory' ? 0 : 1400);
    if (c.gesture && !deferGesture) void this.scene.rig.gesture(c.gesture);
    if (this.emotionTimer) clearTimeout(this.emotionTimer);
    if (trigger.priority !== 'result') this.emotionTimer = setTimeout(() => this.relaxFace(), 4500);
    if (c.line) {
      const outcome = this.voice.request(c.line.id, c.line.priority);
      this.voiceLog.push({ id: c.line.id, outcome });
      if (this.voiceLog.length > 20) this.voiceLog.shift();
      if (outcome === 'played' && this.host.settings().subtitles) this.showSubtitle(c.line.text);
    }
    return deferGesture ? c.gesture : undefined;
  }

  /** Эмоция реакции держится, пока звучит её реплика, и только потом лицо снова приветливое. */
  private relaxFace(): void {
    if (this.disposed) return;
    if (this.voice.speaking) this.emotionTimer = setTimeout(() => this.relaxFace(), 500);
    else this.scene.rig.setEmotion('warm');
  }

  /** Реплика сценки «своей жизни»: фоновый приоритет, режиссёр решает, к месту ли; true — зазвучала. */
  private sayIdle(category: Trigger['category'], emotion: Trigger['emotion']): boolean {
    const c = this.director.react({ category, emotion, priority: 'idle', chance: 1 }, this.host.now());
    if (!c.line) return false;
    const outcome = this.voice.request(c.line.id, c.line.priority);
    this.voiceLog.push({ id: c.line.id, outcome });
    if (this.voiceLog.length > 20) this.voiceLog.shift();
    if (outcome !== 'played') return false;
    this.scene.rig.setEmotion(c.emotion);
    if (this.host.settings().subtitles) this.showSubtitle(c.line.text);
    return true;
  }

  private showSubtitle(text: string): void {
    this.subtitle.textContent = text;
    const check = () => {
      if (this.disposed) return;
      if (this.voice.speaking) setTimeout(check, 300);
      else this.subtitle.textContent = '';
    };
    setTimeout(check, 600);
  }

  private armIdle(): void {
    this.clearIdle();
    this.waitSince = this.host.now();
    this.idleTimer = setTimeout(() => {
      if (this.paused || this.match.over || this.match.turn() !== this.match.human) return;
      this.cue({ category: 'wait', emotion: 'think', priority: 'idle', chance: 0.7 });
      // Игрок думает очень долго — второй, последний за этот ход, оклик (подначка или шутка).
      this.idleTimer = setTimeout(() => {
        if (!this.paused && !this.match.over && this.match.turn() === this.match.human) this.cue({ category: 'waitLong', emotion: 'sly', priority: 'idle', chance: 0.8 });
      }, 35_000);
    }, 25_000);
  }

  private clearIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    if (this.waitSince !== null) this.tempo.moved(this.host.now() - this.waitSince);
    this.waitSince = null;
  }

  // ---------- ввод: выбор хода по полям ----------

  private onSquare(sq: number): void {
    if (this.busy || this.paused || this.promoting || this.match.over) return;
    if (this.match.turn() !== this.match.human) return this.showHint('notYourTurn');
    const all = this.paths();
    const pre = this.prefix;
    const matching = all.filter((m) => pre.every((s, i) => m.path[i] === s));
    if (pre.length === 0) {
      if (all.some((m) => m.path[0] === sq)) {
        this.prefix = [sq];
        this.cursor = sq;
        this.host.audio.sfx('click');
        this.refresh();
        return;
      }
      return this.badTap(sq, all);
    }
    // Повторное касание выбранной фигуры — снять выбор (если путь ещё не начат).
    if (pre.length === 1 && sq === pre[0]) {
      this.prefix = [];
      this.refresh();
      return;
    }
    const step = matching.filter((m) => m.path[pre.length] === sq);
    if (step.length) {
      const next = [...pre, sq];
      const full = step.filter((m) => m.path.length === next.length);
      if (full.length && full.length === step.length) return this.choose(full);
      this.prefix = next;
      this.cursor = sq;
      this.refresh();
      return;
    }
    // Касание конечного поля многоходового взятия — если такой путь один.
    const byEnd = matching.filter((m) => m.path[m.path.length - 1] === sq);
    if (byEnd.length === 1) return this.choose(byEnd);
    // Другая своя фигура — выбрать её (пока путь не начат).
    if (pre.length === 1 && all.some((m) => m.path[0] === sq)) {
      this.prefix = [sq];
      this.cursor = sq;
      this.refresh();
      return;
    }
    if (pre.length > 1) return this.showHint('continue');
    this.prefix = [];
    this.refresh();
    this.badTap(sq, all);
  }

  /** Касание поля, с которого хода нет: объяснить почему. */
  private badTap(sq: number, all: readonly MovePath<A>[]): void {
    const pieces = this.spec.pieces(this.view());
    const key = pieces[sq];
    const mine = key?.startsWith(`${this.match.human}.`);
    if (mine && this.spec.mandatoryCapture && all.length && all.every((m) => m.captures.length > 0)) {
      this.showHint('mustCapture');
      this.cue({ category: 'mustCapture', emotion: 'sly', priority: 'reaction', chance: 0.8 });
    } else if (mine) this.showHint('noMoves');
    else if (key) this.showHint('notYours');
    else return;
    if (this.tutorial) this.cue({ category: 'tutWrong', emotion: 'think', priority: 'greeting', chance: 1 });
  }

  /** Выбран полный путь: если несколько (превращение) — спросить фигуру. */
  private choose(moves: readonly MovePath<A>[]): void {
    if (moves.length === 1) {
      void this.perform(moves[0]!);
      return;
    }
    this.promoting = [...moves].sort((a, b) => PROMOTION_ORDER.indexOf(a.promotion ?? '') - PROMOTION_ORDER.indexOf(b.promotion ?? ''));
    this.prefix = [...moves[0]!.path];
    this.refresh();
  }

  private showHint(code: string): void {
    this.hint.textContent = t(`board.hint.${code}`, { name: t(this.nameKey) });
    this.hint.classList.add('toast--show');
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint.classList.remove('toast--show'), 2600);
  }

  /**
   * Клавиатура: стрелки — курсор по доске (вверх — от себя), Enter/Пробел — выбрать поле, Esc — снять выбор или меню,
   * Q R B N (Ф Л С К) — фигура превращения, M — звук.
   */
  onKey(e: KeyboardEvent): void {
    if (this.disposed) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.promoting || this.prefix.length) {
        this.promoting = null;
        this.prefix = [];
        this.refresh();
      } else this.openPause();
      e.preventDefault();
      return;
    }
    if (k === 'm' || k === 'ь') return this.toggleMute();
    if (this.paused || this.busy || this.match.over) return;
    if (this.promoting) {
      const map: Record<string, string> = { q: 'q', r: 'r', b: 'b', n: 'n', 'ф': 'q', 'л': 'r', 'с': 'b', 'к': 'n' };
      const pick = this.promoting.find((m) => m.promotion === map[k]);
      if (pick) void this.perform(pick);
      return;
    }
    const dirs: Record<string, [number, number]> = { arrowup: [0, 1], arrowdown: [0, -1], arrowleft: [-1, 0], arrowright: [1, 0] };
    const d = dirs[k];
    if (d) {
      const h = this.match.human;
      const c = this.cursor === null ? { u: 3, v: 1 } : cellOfSquare(this.cursor, h);
      const u = Math.min(7, Math.max(0, c.u + d[0])), v = Math.min(7, Math.max(0, c.v + d[1]));
      this.cursor = squareOfCell({ u, v }, h);
      this.keyboard = true;
      this.refresh();
      e.preventDefault();
      return;
    }
    if ((k === 'enter' || k === ' ') && this.cursor !== null) {
      this.onSquare(this.cursor);
      e.preventDefault();
    }
  }

  private toggleMute(): void {
    this.host.updateSettings({ muted: !this.host.settings().muted });
  }

  // ---------- интерфейс ----------

  private sideName(c: Side): string {
    return t(`board.side.${c}`);
  }

  private refresh(): void {
    if (this.disposed) return;
    const v = this.view();
    const myTurn = !this.match.over && this.match.turn() === this.match.human && !this.busy && !this.paused;
    const all = myTurn ? this.paths() : [];
    const pre = this.prefix;
    const matching = all.filter((m) => pre.every((s, i) => m.path[i] === s));
    const targets = pre.length && !this.promoting ? [...new Set(matching.map((m) => m.path[pre.length]).filter((s): s is number => s !== undefined))] : [];
    const captureTargets = targets.filter((sq) => matching.some((m) => m.path[pre.length] === sq && m.captures.length > 0));
    const mustCapture = this.spec.mandatoryCapture && all.length > 0 && all.every((m) => m.captures.length > 0);
    const movable = myTurn && pre.length === 0 && (mustCapture || this.tutorial) ? [...new Set(all.map((m) => m.path[0]!))] : [];
    this.scene.inputEnabled = myTurn && !this.promoting;
    this.scene.setMarks({
      ...NO_MARKS,
      selected: pre.length ? pre[pre.length - 1]! : null,
      targets,
      captures: captureTargets,
      movable,
      last: pre.length > 1 ? pre.slice(0, -1) : this.spec.lastMove(v),
      check: this.spec.check(v),
      cursor: myTurn && this.keyboard ? this.cursor : null,
    });
    // Строка состояния.
    const name = t(this.nameKey);
    let st = '';
    if (!this.match.over) {
      if (this.match.turn() === this.match.opponent) st = t(this.scene.rig.currentPose === 'think' ? 'board.status.thinks' : 'board.status.opponent', { name });
      else if (this.promoting) st = t('board.status.promote');
      else if (pre.length > 1) st = t('board.status.continue');
      else if (this.spec.check(v) !== null) st = t('board.status.check');
      else if (mustCapture) st = t('board.status.mustCapture');
      else if (pre.length === 1) st = t('board.status.pick');
      else st = t('board.status.yourTurn', { side: this.sideName(this.match.human) });
    }
    this.status.innerHTML = '';
    this.status.append(el('span', 'status__main', st), el('span', 'status__trump', t('board.status.youPlay', { side: this.sideName(this.match.human) })));
    // Кнопки: выбор фигуры превращения, отмена выбора, сдача.
    const sig = `${this.match.over ? 'over' : ''}|${this.promoting ? 'promo' : ''}|${pre.length ? 'sel' : ''}|${myTurn ? 'my' : ''}`;
    if (sig !== this.actionsSig) {
      this.actionsSig = sig;
      this.actions.replaceChildren();
      if (this.promoting) {
        for (const m of this.promoting) {
          const b = button('', () => void this.perform(m), 'button button--action');
          b.append(el('span', '', t(`${this.p}.promote.${m.promotion}`)));
          if (this.layout?.pointer !== 'coarse') b.append(el('kbd', 'key', ({ q: 'Q', r: 'R', b: 'B', n: 'N' } as Record<string, string>)[m.promotion ?? ''] ?? ''));
          this.actions.append(b);
        }
      } else if (!this.match.over) {
        if (pre.length) this.actions.append(button(t('act.cancel'), () => {
          this.prefix = [];
          this.refresh();
        }, 'button button--light button--action'));
        this.actions.append(button(t('board.resign'), () => this.confirmResign(), 'button button--light button--action'));
      }
    }
    const [p, a, d] = this.match.tallies;
    this.chalk.textContent = t('board.tally', { name, a, p, d });
  }

  // ---------- обучение ----------

  private showCoach(): void {
    if (!this.tutorial || this.match.over) return;
    const wait = this.coachUntil - this.host.now();
    if (wait > 0) {
      this.soon(() => this.showCoach(), wait + 50);
      return;
    }
    const v = this.view();
    const ctx: TutorialContext<V, A> = { view: v, paths: this.match.turn() === this.match.human ? this.paths() : [], humanMoves: this.humanMoves, inCheck: this.spec.check(v) !== null && this.match.turn() === this.match.human };
    const step = this.spec.tutorial.find((s) => !this.tutorial!.has(s.id) && s.when(ctx));
    if (!step) return;
    this.tutorial.add(step.id);
    this.coachBox.replaceChildren(el('p', '', t(`${this.p}.tut.${step.id}`)));
    if (step.id !== 'done') {
      const skip = button('×', () => this.skipTutorial(), 'coach__skip');
      skip.setAttribute('aria-label', t('tut.skip'));
      skip.title = t('tut.skip');
      this.coachBox.append(skip);
    }
    this.coachBox.classList.add('coach--show');
    this.coachUntil = this.host.now() + 3400;
    this.cue({ category: step.line, emotion: 'warm', priority: 'greeting', chance: 1 });
    if (step.id === 'done') this.finishTutorial();
    else this.soon(() => this.showCoach(), 3450);
  }

  private finishTutorial(): void {
    this.host.updateSettings({ [this.spec.tutorialKey]: true } as Partial<Settings>);
    this.tutorial = null;
    this.soon(() => this.coachBox.classList.remove('coach--show'), 4200);
  }

  private skipTutorial(): void {
    this.coachBox.classList.remove('coach--show');
    this.finishTutorial();
  }

  // ---------- сдача и итог ----------

  private confirmResign(): void {
    if (this.match.over || this.busy) return;
    this.setPaused(true);
    const back = el('div', 'modal-backdrop');
    const box = el('div', 'modal');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', t('board.resign.title'));
    const close = () => {
      back.remove();
      this.setPaused(false);
    };
    box.append(
      el('h2', 'heading', t('board.resign.title')),
      el('p', 'note', t('board.resign.note')),
      button(t('board.resign.yes'), () => {
        back.remove();
        this.setPaused(false);
        const r = this.match.resign();
        if (r?.ok) {
          this.cue({ category: 'playerResign', emotion: 'warm', priority: 'result', chance: 1 });
          this.finish();
        }
      }),
      button(t('board.resign.no'), close, 'button button--light'),
    );
    back.append(box);
    back.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    this.overlay.append(back);
    queueMicrotask(() => box.querySelector<HTMLButtonElement>('button:last-child')?.focus());
  }

  private finish(): void {
    this.clearIdle();
    this.prefix = [];
    this.promoting = null;
    if (this.tutorial) {
      this.tutorial.add('done');
      this.finishTutorial();
    }
    const v = this.view();
    const w = this.match.winner;
    const won = w === this.match.human;
    const draw = w === null;
    const reason = this.spec.reason(v);
    const resigned = reason?.endsWith('resign');
    this.host.audio.sfx(won ? 'win' : draw ? 'bito' : 'lose');
    // Персонаж: победа — поза торжества; поражение — огорчение и учтивый жест; ничья — пожать плечами.
    if (!resigned) {
      const category = resultCategory(won, draw, reason);
      if (draw) this.cue({ category, emotion: 'warm', gesture: this.spec.gestures.draw, priority: 'result', chance: 1 });
      else if (won) this.cue({ category, emotion: 'sad', gesture: this.spec.gestures.lose, priority: 'result', chance: 1 });
      else this.cue({ category, emotion: 'azart', pose: 'victory', priority: 'result', chance: 1 });
    } else {
      // Сдача игрока — тоже победа: поза и радость на лице (раньше лицо оставалось спокойным).
      this.life.stop();
      this.scene.rig.setPose('victory');
      this.scene.rig.setEmotion('laugh');
    }
    this.refresh();
    this.later(() => {
      const name = t(this.nameKey);
      const card = el('div', 'hand-card');
      const text = el('div', 'hand-card__text');
      const row = el('div', 'row');
      const [p, a, d] = this.match.tallies;
      text.append(
        el('h2', 'heading', t(draw ? 'board.result.draw' : won ? 'board.result.win' : 'board.result.lose', { name })),
        el('p', '', reason ? t(`${this.p}.result.${reason}`, { name }) : ''),
        el('p', '', t('board.result.tally', { name, a, p, d })),
      );
      row.append(button(t('result.club'), () => this.host.exitToClub(), 'button button--light'), button(t('board.result.again'), () => this.rematch()));
      card.append(text, row);
      this.result.replaceChildren(card);
      this.result.classList.add('result--show', 'result--hand');
      queueMicrotask(() => row.querySelector<HTMLButtonElement>('button:last-child')?.focus());
      this.soon(() => {
        if (this.match.over) this.cue({ category: won ? 'rematchAfterLoss' : 'rematch', emotion: 'warm', priority: 'greeting', chance: 0.8 });
      }, 2600);
    }, 1500);
  }

  rematch(): void {
    this.result.classList.remove('result--show', 'result--hand');
    this.coachBox.classList.remove('coach--show');
    this.match.newMatch();
    this.life.restart(this.host.now());
    this.tempo.reset(this.host.now());
    this.humanMoves = 0;
    this.plies = 0;
    this.scene.rig.setPose('idle');
    this.scene.rig.setEmotion('warm');
    this.resetBoard();
    this.host.audio.sfx('shuffle');
    this.cue({ category: 'gameStart', emotion: 'think', priority: 'reaction', chance: 0.7 });
    this.busy = false;
    this.advance();
  }

  // ---------- пауза и таймеры ----------

  private soon(fn: () => void, ms: number): void {
    setTimeout(() => {
      if (!this.disposed && !this.paused) fn();
    }, ms);
  }

  private later(fn: () => void, ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.pending = { fn, ms };
    if (this.paused) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.pending = null;
      if (!this.disposed) fn();
    }, ms);
  }

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.voice.stopAll();
      this.clearIdle();
    } else if (this.pending) {
      const p = this.pending;
      this.pending = null;
      this.later(p.fn, p.ms);
    } else if (!this.busy && !this.match.over && this.match.turn() === this.match.human) this.armIdle();
    this.refresh();
  }

  private openPause(): void {
    if (this.disposed) return;
    this.setPaused(true);
    const back = el('div', 'modal-backdrop');
    const box = el('div', 'modal');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', t('pause.title'));
    const close = () => {
      back.remove();
      this.setPaused(false);
    };
    box.append(
      el('h2', 'heading', t('pause.title')),
      button(t('pause.resume'), close),
      button(t('pause.rules'), () => this.host.openRules(), 'button button--light'),
      button(t('pause.settings'), () => this.host.openSettings(), 'button button--light'),
      button(t('pause.exit'), () => {
        back.remove();
        this.cue({ category: 'farewell', emotion: 'warm', priority: 'greeting', chance: 1 });
        this.host.exitToClub();
      }, 'button button--light'),
      el('p', 'note', t('pause.exitNote')),
    );
    back.append(box);
    back.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    this.overlay.append(back);
    queueMicrotask(() => box.querySelector('button')?.focus());
  }

  update(dtMs: number): void {
    if (this.disposed) return;
    this.scene.rig.setSpeaking(this.voice.speaking ? this.host.audio.voiceLevel() : 0);
    this.scene.rig.brain.talking = this.voice.speaking !== null;
    const now = this.host.now();
    this.life.tick({
      now,
      active: !this.paused && !this.tutorial && !this.match.over,
      waiting: this.waitSince !== null,
      waitMs: this.waitSince === null ? 0 : now - this.waitSince,
      mood: moodOf(this.spec.lead(this.view(), this.match.opponent), 2),
      free: !this.scene.rig.brain.busy && this.voice.speaking === null,
      quietMs: this.director.quietMs(now),
      tags: this.tempo.tags(now, this.waitSince === null ? 0 : now - this.waitSince),
    });
    this.tweens.update(dtMs);
    this.scene.update(dtMs);
  }

  dispose(): void {
    this.disposed = true;
    this.life.dispose();
    for (const tm of [this.timer, this.idleTimer, this.emotionTimer, this.hintTimer]) if (tm) clearTimeout(tm);
    this.voice.stopAll();
    this.tweens.finishAll();
    this.scene.destroy();
    this.overlay.remove();
  }
}

export type { SfxName };

// Игровой сеанс домино против Деда Матвея: связывает контроллер матча, сцену, реакции, голос и HTML-интерфейс.
// Все действия идут через DominoMatch (правила в ядре); сцена и кнопки лишь отражают состояние.
import type { Container } from 'pixi.js';
import { button, el, iconButton, ICONS, placeChalk } from '../../app/dom';
import type { GameAssets, GameSession, SessionHost, SessionOptions } from '../../app/game';
import type { SfxName } from '../../audio/engine';
import { VoiceChannel } from '../../audio/voiceChannel';
import { Director, type Cue, type Trigger } from '../../characters/director';
import { MATVEY_LINES } from '../../characters/matvey/lines';
import { createRng, nextInt, type RngState } from '../../core/rng';
import { t } from '../../i18n';
import type { DominoLayout } from '../../layout/dominoes';
import type { LayoutSpec } from '../../layout/layout';
import { BG_BOARD } from '../../render/cafe';
import { Tweener } from '../../render/tween';
import type { Settings } from '../../storage/settings';
import { dropBone, endNumbers, playableCodes, sortBones, tapBone, tapEnd, type HintCode, type Outcome } from './interaction';
import { DominoMatch, HUMAN, OPPONENT } from './match';
import { reactionFor } from './reactions';
import { boneCode } from './rules/bones';
import type { DominoEvent } from './rules/engine';
import { startMatch } from './rules/setup';
import type { End, HandResult } from './rules/state';
import { DominoScene } from './scene/scene';
import type { DominoTextureBank } from './scene/textures';
import { STEP_LINE, TutorialCoach, type TutorialStep } from './tutorial';
import type { DominoAction, PlayerView } from './view';

/** Первый seed (от заданного), где в обучении первый ход за игроком. */
export function dominoTutorialSeed(from: number): number {
  for (let s = from; s < from + 500; s++) if (startMatch(s).turn === HUMAN) return s;
  return from;
}

export class DominoSession implements GameSession {
  readonly scene: DominoScene;
  readonly match: DominoMatch;
  readonly overlay = el('div', 'game');
  private readonly tweens = new Tweener();
  private readonly voice: VoiceChannel;
  private readonly voiceLog: { id: string; outcome: string }[] = [];
  private readonly director: Director;
  private coach: TutorialCoach | null;
  private layout: DominoLayout | null = null;
  /** Кость, для которой выбирается конец цепочки. */
  private picking: { code: string; ends: readonly End[] } | null = null;
  /** Кость под клавиатурным курсором. */
  private cursor: string | null = null;
  private busy = true;
  private disposed = false;
  private paused = false;
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
  private readonly board = el('div', 'chalk');
  private readonly coachBox = el('div', 'coach');
  private readonly result = el('div', 'result');
  private readonly soundBtn: HTMLButtonElement;
  private actionsSig = '';

  constructor(private readonly host: SessionHost, opts: SessionOptions) {
    this.match = new DominoMatch({ seed: opts.seed, level: opts.tutorial ? 'easy' : opts.level });
    this.paceRng = createRng(opts.seed ^ 0x51ed270b);
    this.scene = new DominoScene(this.tweens, {
      onBoneTap: (code) => this.handle(this.picking?.code === code ? { hint: 'pickEnd' } : tapBone(this.view(), this.legal(), code), code),
      onEndTap: (end) => this.picking && this.handle(tapEnd(this.legal(), this.picking.code, end), this.picking.code),
      onDrop: (code, end) => this.handle(dropBone(this.view(), this.legal(), code, end), code),
      onBazaarTap: () => {
        const a = this.legal().find((x) => x.type === 'draw');
        if (a) void this.perform(a);
      },
    });
    this.voice = new VoiceChannel(host.audio, () => host.now());
    // Матвей неразговорчив: паузы между репликами длиннее, чем у Агаты.
    this.director = new Director({ lines: MATVEY_LINES, minGapMs: 9000, lineCooldownMs: 120_000, available: (id) => host.audio.hasLine(id) && !this.voice.isUnavailable(id) }, createRng(opts.seed + 23));
    this.coach = opts.tutorial ? new TutorialCoach() : null;
    const hudLeft = el('div', 'hud hud--left');
    hudLeft.append(iconButton(ICONS.menu, t('hud.menu'), () => this.openPause()));
    const hudRight = el('div', 'hud hud--right');
    this.soundBtn = iconButton(ICONS.sound, t('hud.sound'), () => this.toggleMute());
    hudRight.append(this.soundBtn);
    this.subtitle.setAttribute('aria-live', 'polite');
    this.hint.setAttribute('role', 'status');
    this.board.setAttribute('aria-label', 'Счёт матча');
    this.overlay.append(this.board, hudLeft, hudRight, this.status, this.actions, this.coachBox, this.hint, this.subtitle, this.result);
    this.applySettings(host.settings());
  }

  get root(): Container {
    return this.scene.root;
  }

  view(): PlayerView {
    return this.match.view();
  }

  private legal(): DominoAction[] {
    return this.match.humanActions();
  }

  debug() {
    return {
      view: this.view(),
      legal: this.legal(),
      busy: this.busy,
      phase: this.match.phase,
      picking: this.picking,
      matchWins: this.match.matchWins,
      positions: this.scene.debugPositions(),
      faces: this.scene.visibleFaces(),
      pose: this.scene.rig.currentPose,
      emotion: this.scene.rig.currentEmotion,
      blinks: this.scene.rig.blinks,
      gesture: this.scene.rig.brain.gestureId,
      arms: this.scene.armsLayer(),
      speaking: this.voice.speaking,
      voiceLog: [...this.voiceLog],
      act: (i: number) => {
        const a = this.legal()[i];
        if (a && !this.busy) void this.perform(a);
      },
    };
  }

  // ---------- запуск ----------

  setAssets(assets: GameAssets): void {
    this.scene.setTextures((assets as GameAssets & { bank: DominoTextureBank }).bank);
  }

  setLayout(spec: LayoutSpec): void {
    const s = spec as DominoLayout;
    this.layout = s;
    this.scene.setLayout(s);
    const place = (node: HTMLElement, r: { x: number; y: number; w: number; h: number }) => Object.assign(node.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    place(this.actions, s.actions);
    place(this.status, s.status);
    this.actions.classList.toggle('actions--column', s.kind === 'landscape-compact');
    this.status.classList.toggle('status--multiline', s.kind !== 'portrait' && s.kind !== 'portrait-wide');
    const b = s.background;
    placeChalk(this.board, { x: b.x + BG_BOARD.x * b.scale, y: b.y + BG_BOARD.y * b.scale, w: BG_BOARD.w * b.scale, h: BG_BOARD.h * b.scale }, Math.max(9, 16 * b.scale), 3);
    this.overlay.style.setProperty('--hand-top', `${s.hand.bottom - s.domino.handHalf * 2.3}px`);
    // Подсказки — над костями Матвея (поверх фигуры ниже лица), чтобы не закрывать ни его кости, ни цепочку.
    this.overlay.style.setProperty('--play-top', `${s.domino.opponent.y - s.domino.opponent.half * 1.3}px`);
    this.overlay.style.setProperty('--ui-scale', String(Math.min(1.5, Math.max(1, Math.min(s.width / 1280, s.height / 720)))));
    this.overlay.dataset.layout = s.kind;
    this.overlay.dataset.game = 'dominoes';
  }

  start(): void {
    this.scene.reset(this.view());
    this.refresh();
    const s = this.host.settings();
    this.cue({ category: s.metMatvey ? 'greetAgain' : 'greetFirst', emotion: 'warm', priority: 'greeting', chance: 1 });
    if (!s.metMatvey) this.host.updateSettings({ metMatvey: true });
    this.soon(() => this.cue({ category: 'gameStart', emotion: 'think', priority: 'reaction', chance: 0.6 }), 2800);
    this.host.audio.sfx('shuffle');
    this.busy = false;
    this.advance();
  }

  private applySettings(s: Settings): void {
    this.voice.setEnabled(!s.muted && s.voiceVolume > 0);
    this.tweens.instant = s.reducedMotion;
    this.scene.rig.reducedMotion = s.reducedMotion;
    this.soundBtn.innerHTML = s.muted ? ICONS.mute : ICONS.sound;
    this.soundBtn.setAttribute('aria-label', s.muted ? t('hud.soundOff') : t('hud.sound'));
    if (!s.subtitles) this.subtitle.textContent = '';
  }

  settingsChanged(s: Settings): void {
    this.applySettings(s);
  }

  // ---------- игровой цикл ----------

  /** Что дальше: ход Матвея, вынужденный добор или стук игрока, ожидание игрока или итог раздачи. */
  private advance(): void {
    if (this.disposed) return;
    this.refresh();
    if (this.match.phase !== 'play') return;
    const turn = this.match.turn();
    if (turn === OPPONENT) {
      const [r, next] = nextInt(this.paceRng, 800);
      this.paceRng = next;
      const v = this.view();
      // Матвей «долго думает» — это пауза сцены, а не другой алгоритм (§12). Добор — быстрее.
      const drawing = v.drawnThisTurn > 0;
      const think = drawing ? 420 : 900 + r + (v.chain.length === 0 ? 300 : 0) + (v.bazaarCount === 0 ? 400 : 0);
      if (think > 1300) {
        this.scene.rig.setPose('think', think);
        // Изредка вслух: «Хм-м…» — пока думает над ходом.
        this.cue({ category: 'nvHmm', emotion: 'think', priority: 'idle', chance: 0.2 });
      }
      this.later(() => void this.opponentMove(), this.host.settings().reducedMotion ? 250 : think);
      return;
    }
    const auto = this.match.autoHumanAction();
    if (auto) {
      // Хода нет: добор из базара по одной кости или стук — сами, с паузой, чтобы было видно (§4, §5).
      this.later(() => void this.perform(auto), this.view().drawnThisTurn > 0 ? 380 : 700);
      this.showCoach();
      return;
    }
    this.armIdle();
    this.showCoach();
  }

  private async opponentMove(): Promise<void> {
    if (this.disposed || this.busy) return;
    this.busy = true;
    this.refresh();
    const r = this.match.opponentStep();
    if (r?.ok) await this.afterAction(r.events);
    this.busy = false;
    this.advance();
  }

  private async perform(action: DominoAction): Promise<void> {
    if (this.disposed || this.busy) return;
    const r = this.match.act(action);
    if (!r.ok) {
      this.showHint(r.error === 'doesNotFit' ? 'doesNotFit' : r.error === 'mustPlayOpening' ? 'mustPlayOpening' : 'notYourTurn');
      return;
    }
    this.busy = true;
    this.clearIdle();
    this.picking = null;
    this.refresh();
    await this.afterAction(r.events);
    this.busy = false;
    this.advance();
  }

  private async afterAction(events: readonly DominoEvent[]): Promise<void> {
    this.sfxFor(events);
    const trig = reactionFor(events, OPPONENT, this.view());
    // Жест реакции — после жеста хода (Матвей сначала кладёт, берёт или стучит, потом реагирует); эмоция и реплика — сразу.
    const gesture = trig ? this.cue(trig, true) : undefined;
    await this.scene.show(this.view(), events);
    if (gesture) void this.scene.rig.whenFree().then(() => {
      if (!this.disposed) void this.scene.rig.gesture(gesture);
    });
    const over = events.find((e) => e.type === 'handOver');
    if (over && over.type === 'handOver') this.finishHand(over.result, events.some((e) => e.type === 'matchOver'));
  }

  private sfxFor(events: readonly DominoEvent[]): void {
    const play = (n: SfxName) => this.host.audio.sfx(n);
    for (const e of events) {
      if (e.type === 'played') play(e.seat === OPPONENT ? 'slap' : 'clack');
      else if (e.type === 'drew') play('deal');
      else if (e.type === 'knocked') play('knock');
      else if (e.type === 'matchOver') play(e.winner === HUMAN ? 'win' : 'lose');
    }
  }

  // ---------- реакции Матвея ----------

  /** Реакция: эмоция, поза, реплика; жест — сразу или (deferGesture) возвращается вызывающему. */
  private cue(trigger: Trigger, deferGesture = false): string | undefined {
    const c: Cue = this.director.react(trigger, this.host.now());
    this.scene.rig.setEmotion(c.emotion);
    if (c.pose) this.scene.rig.setPose(c.pose, c.pose === 'victory' ? 0 : 1400);
    if (c.gesture && !deferGesture) void this.scene.rig.gesture(c.gesture);
    if (this.emotionTimer) clearTimeout(this.emotionTimer);
    if (trigger.priority !== 'result') this.emotionTimer = setTimeout(() => this.scene.rig.setEmotion('warm'), 4500);
    if (c.line) {
      const outcome = this.voice.request(c.line.id, c.line.priority);
      this.voiceLog.push({ id: c.line.id, outcome });
      if (this.voiceLog.length > 20) this.voiceLog.shift();
      if (outcome === 'played' && this.host.settings().subtitles) this.showSubtitle(c.line.text);
    }
    return deferGesture ? c.gesture : undefined;
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
    this.idleTimer = setTimeout(() => {
      if (!this.paused && this.match.turn() === HUMAN) this.cue({ category: 'wait', emotion: 'think', priority: 'idle', chance: 0.7 });
    }, 15_000);
  }

  private clearIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  // ---------- ввод ----------

  private handle(o: Outcome, code?: string): void {
    if (this.busy || this.paused) return;
    if (o.pick) {
      this.picking = { code: o.pick.code, ends: o.pick.ends };
      this.cursor = o.pick.code;
      this.showHint('pickEnd');
      this.showCoach();
    } else if (!o.action) this.picking = null;
    if (o.hint && o.hint !== 'pickEnd') {
      this.showHint(o.hint);
      if (code && (o.hint === 'doesNotFit' || o.hint === 'mustPlayOpening')) this.scene.shake(code);
      if (this.coach) this.cueTutorial('tutWrong');
    } else if (o.hint === 'pickEnd' && !o.pick) this.showHint('pickEnd');
    if (o.action) void this.perform(o.action);
    else this.refresh();
  }

  private showHint(code: HintCode): void {
    const v = this.view();
    const opening = v.opening.kind !== 'winner' ? `${v.opening.bone.hi}:${v.opening.bone.lo}` : '';
    this.hint.textContent = t(`dom.hint.${code}`, { ends: endNumbers(v).join(t('common.or')), bone: opening });
    this.hint.classList.add('toast--show');
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint.classList.remove('toast--show'), 2600);
  }

  /**
   * Клавиатура: ← → — выбрать кость, Enter/Пробел — выложить; если подходит к обоим концам — ← → выбрать конец, Enter — поставить.
   * 1–9 — кость по номеру, D — взять из базара, Esc — отмена или меню, M — звук.
   */
  onKey(e: KeyboardEvent): void {
    if (this.disposed) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.picking) {
        this.picking = null;
        this.refresh();
      } else this.openPause();
      e.preventDefault();
      return;
    }
    if (k === 'm' || k === 'ь') return this.toggleMute();
    if (k === 'enter' && this.result.classList.contains('result--show')) return;
    if (this.paused || this.busy) return;
    const legal = this.legal();
    if (this.picking) {
      if (k === 'arrowleft' || k === 'arrowright') {
        const end: End = k === 'arrowleft' ? 'left' : 'right';
        if (this.picking.ends.includes(end)) this.handle(tapEnd(legal, this.picking.code, end), this.picking.code);
        e.preventDefault();
      }
      return;
    }
    const hand = sortBones(this.view().hand).map(boneCode);
    if (k === 'd' || k === 'в') {
      const a = legal.find((x) => x.type === 'draw');
      if (a) void this.perform(a);
      return;
    }
    if (k === 'arrowleft' || k === 'arrowright') {
      const cur = this.cursor ? hand.indexOf(this.cursor) : -1;
      const next = cur < 0 ? (k === 'arrowleft' ? hand.length - 1 : 0) : (cur + (k === 'arrowleft' ? -1 : 1) + hand.length) % hand.length;
      this.cursor = hand[next] ?? null;
      this.refresh();
      e.preventDefault();
      return;
    }
    if (k === 'enter' || k === ' ') {
      if (this.cursor && hand.includes(this.cursor)) this.handle(tapBone(this.view(), legal, this.cursor), this.cursor);
      e.preventDefault();
      return;
    }
    if (/^[1-9]$/.test(k)) {
      const code = hand[Number(k) - 1];
      if (code) this.handle(tapBone(this.view(), legal, code), code);
    }
  }

  private toggleMute(): void {
    this.host.updateSettings({ muted: !this.host.settings().muted });
  }

  // ---------- интерфейс ----------

  private refresh(): void {
    if (this.disposed) return;
    const v = this.view();
    const legal = this.legal();
    const myTurn = this.match.turn() === HUMAN && !this.busy && !this.paused;
    const playable = myTurn ? playableCodes(legal) : new Set<string>();
    if (this.cursor && !v.hand.some((b) => boneCode(b) === this.cursor)) this.cursor = null;
    this.scene.inputEnabled = myTurn;
    this.scene.setHighlights({ playable, picking: myTurn ? this.picking : null, cursor: myTurn ? this.cursor : null, bazaar: myTurn && legal.some((a) => a.type === 'draw') });
    // Строка состояния.
    let st = '';
    if (this.match.phase === 'play') {
      if (this.match.turn() === OPPONENT) st = t(v.drawnThisTurn > 0 ? 'dom.status.opponentDraws' : this.scene.rig.currentPose === 'think' ? 'dom.status.opponentThinks' : 'dom.status.opponent');
      else if (this.picking) st = t('dom.status.pickEnd');
      else if (legal.some((a) => a.type === 'draw')) st = t('dom.status.drawing');
      else if (legal.some((a) => a.type === 'knock')) st = t('dom.status.knock');
      else if (v.chain.length === 0) st = v.opening.kind === 'winner' ? t('dom.status.firstAny') : t('dom.status.first', { bone: `${v.opening.bone.hi}:${v.opening.bone.lo}` });
      else st = t('dom.status.play');
    }
    this.status.innerHTML = '';
    this.status.append(el('span', 'status__main', st), el('span', 'status__trump', v.bazaarCount > 0 ? t('dom.bazaar', { n: v.bazaarCount }) : t('dom.bazaarEmpty')));
    // Кнопки: «Отменить» при выборе конца и «Слева»/«Справа» для выбора конца без касания стола.
    const sig = myTurn && this.picking ? `pick:${this.picking.code}` : '';
    if (sig !== this.actionsSig) {
      this.actionsSig = sig;
      this.actions.replaceChildren();
      if (myTurn && this.picking) {
        const pick = this.picking;
        this.actions.append(button(t('act.cancel'), () => {
          this.picking = null;
          this.refresh();
        }, 'button button--light button--action'));
        for (const end of pick.ends) {
          const b = button('', () => this.handle(tapEnd(this.legal(), pick.code, end), pick.code), 'button button--action');
          b.append(el('span', '', t(`dom.end.${end}`)));
          if (this.layout?.pointer !== 'coarse') b.append(el('kbd', 'key', end === 'left' ? '←' : '→'));
          this.actions.append(b);
        }
      }
    }
    this.board.textContent = t('dom.board.score', { a: v.score[OPPONENT], p: v.score[HUMAN], target: v.target });
  }

  private showCoach(): void {
    if (!this.coach) return;
    const step = this.coach.next(this.view(), this.legal(), !!this.picking);
    if (step) this.showTutorialStep(step);
  }

  private showTutorialStep(step: TutorialStep): void {
    this.coachBox.replaceChildren(el('p', '', t(`dom.tut.${step}`)));
    if (step !== 'done') {
      const skip = button('×', () => this.skipTutorial(), 'coach__skip');
      skip.setAttribute('aria-label', t('tut.skip'));
      skip.title = t('tut.skip');
      this.coachBox.append(skip);
    }
    this.coachBox.classList.add('coach--show');
    this.cueTutorial(STEP_LINE[step]);
    if (step === 'intro') this.soon(() => this.showCoach(), 3200);
  }

  private cueTutorial(category: Trigger['category']): void {
    this.cue({ category, emotion: 'warm', priority: 'greeting', chance: 1 });
  }

  private skipTutorial(): void {
    this.coachBox.classList.remove('coach--show');
    this.host.updateSettings({ dominoesTutorialDone: true });
    this.coach = null;
  }

  /** Итог раздачи: кости Матвея открыты, панель с очками; в конце матча — итог матча. */
  private finishHand(result: HandResult, matchOver: boolean): void {
    this.clearIdle();
    if (this.coach) {
      this.showTutorialStep('done');
      this.host.updateSettings({ dominoesTutorialDone: true });
      this.coach = null;
    }
    this.later(() => {
      const v = this.view();
      const title = result.kind === 'domino' ? t('dom.hand.domino') : result.kind === 'fish' ? t('dom.hand.fish') : t('dom.hand.fishDraw');
      const lines: string[] = [];
      if (result.kind === 'fishDraw') lines.push(t('dom.hand.noPoints'));
      else lines.push(t(result.winner === HUMAN ? 'dom.hand.youWon' : 'dom.hand.oppWon', { points: result.points }));
      if (result.kind !== 'domino') lines.push(t('dom.hand.pips', { a: result.pips[OPPONENT], p: result.pips[HUMAN] }));
      // Компактная плашка у нижнего края: цепочка и открытые кости Матвея остаются видны.
      const card = el('div', 'hand-card');
      const text = el('div', 'hand-card__text');
      const row = el('div', 'row');
      if (matchOver) {
        const won = v.matchWinner === HUMAN;
        text.append(el('h2', 'heading', t(won ? 'dom.result.win' : 'dom.result.lose')), el('p', '', `${title} ${lines.join(' · ')}`), el('p', '', t('dom.result.score', { a: v.score[OPPONENT], p: v.score[HUMAN] })));
        row.append(button(t('result.club'), () => this.host.exitToClub(), 'button button--light'), button(t('dom.result.again'), () => this.rematch()));
        // Предложение реванша — только пока итог матча на экране: после «Ещё матч» оно уже не к месту.
        this.soon(() => {
          if (this.match.phase === 'matchOver') this.cue({ category: won ? 'rematchAfterLoss' : 'rematch', emotion: 'warm', priority: 'greeting', chance: 0.8 });
        }, 2600);
      } else {
        text.append(el('h2', 'heading', title), el('p', '', lines.join(' · ')), el('p', '', t('dom.hand.score', { a: v.score[OPPONENT], p: v.score[HUMAN], target: v.target })));
        row.append(button(t('dom.hand.next'), () => this.nextHand()));
      }
      card.append(text, row);
      this.result.replaceChildren(card);
      this.result.classList.add('result--show', 'result--hand');
      queueMicrotask(() => row.querySelector<HTMLButtonElement>('button:last-child')?.focus());
    }, 1300);
  }

  private nextHand(): void {
    if (!this.match.nextHand()) return;
    this.result.classList.remove('result--show', 'result--hand');
    this.coachBox.classList.remove('coach--show');
    this.picking = null;
    this.scene.rig.setPose('idle');
    this.scene.rig.setEmotion('warm');
    this.scene.reset(this.view());
    this.host.audio.sfx('shuffle');
    // Счёт близок к 101 — Матвей прикидывает перед раздачей.
    const v = this.view();
    if (Math.max(...v.score) >= v.target - 25) this.soon(() => this.cue({ category: 'nearTarget', emotion: 'think', priority: 'reaction', chance: 0.6 }), 900);
    else this.soon(() => this.cue({ category: 'handStart', emotion: 'think', priority: 'reaction', chance: 0.35 }), 900);
    this.busy = false;
    this.advance();
  }

  rematch(): void {
    this.result.classList.remove('result--show', 'result--hand');
    this.coachBox.classList.remove('coach--show');
    this.match.newMatch();
    this.picking = null;
    this.scene.rig.setPose('idle');
    this.scene.rig.setEmotion('warm');
    this.scene.reset(this.view());
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

  /** Задержка хода матча: одна на сеанс, на паузе откладывается. */
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
    }
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
      el('p', 'note', t('dom.pause.exitNote')),
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
    this.scene.update(dtMs);
  }

  dispose(): void {
    this.disposed = true;
    for (const tm of [this.timer, this.idleTimer, this.emotionTimer, this.hintTimer]) if (tm) clearTimeout(tm);
    this.voice.stopAll();
    this.tweens.finishAll();
    this.scene.root.destroy({ children: true });
    this.overlay.remove();
  }
}

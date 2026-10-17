// Игровой сеанс: партия против Агаты на экране. Связывает контроллер партии, сцену, реакции, голос и HTML-интерфейс.
// Все действия идут через DurakMatch (правила в ядре); сцена и кнопки лишь отражают состояние.
import { AGATA_LINES } from '../characters/agata/lines';
import { Director, type Cue, type Trigger } from '../characters/director';
import type { AudioEngine, SfxName } from '../audio/engine';
import { VoiceChannel } from '../audio/voiceChannel';
import { createRng, nextInt, type RngState } from '../core/rng';
import { highlights, modeOf, tapCard, tapPair, tapTable, drop, type HintCode } from '../games/durak/interaction';
import { DurakMatch, HUMAN, OPPONENT } from '../games/durak/match';
import { reactionFor } from '../games/durak/reactions';
import { cardCode } from '../games/durak/rules/cards';
import type { DurakEvent } from '../games/durak/rules/engine';
import { DurakScene, sortHand } from '../games/durak/scene/scene';
import type { TextureBank } from '../games/durak/scene/textures';
import { STEP_LINE, TutorialCoach, type TutorialStep } from '../games/durak/tutorial';
import type { DurakAction, PlayerView } from '../games/durak/view';
import { t } from '../i18n';
import type { LayoutSpec } from '../layout/layout';
import { BG_BOARD } from '../characters/agata/art';
import { Tweener } from '../render/tween';
import type { Difficulty, Settings } from '../storage/settings';
import { button, el, iconButton, ICONS } from './dom';

export interface SessionHost {
  readonly audio: AudioEngine;
  settings(): Settings;
  updateSettings(patch: Partial<Settings>): void;
  openSettings(): void;
  openRules(): void;
  exitToClub(): void;
  now(): number;
}

export interface SessionOptions {
  readonly level: Difficulty;
  readonly tutorial: boolean;
  readonly seed: number;
}

/** Первый seed (от заданного), где в обучении первым ходит игрок. */
export function tutorialSeed(from: number): number {
  for (let s = from; s < from + 500; s++) if (new DurakMatch({ seed: s, level: 'easy' }).view().attacker === HUMAN) return s;
  return from;
}

export class GameSession {
  readonly scene: DurakScene;
  readonly match: DurakMatch;
  readonly overlay = el('div', 'game');
  private readonly tweens = new Tweener();
  private readonly voice: VoiceChannel;
  private readonly director: Director;
  private coach: TutorialCoach | null;
  private layout: LayoutSpec | null = null;
  private selected: string[] = [];
  private busy = true;
  private disposed = false;
  private paused = false;
  private pending: { fn: () => void; ms: number } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private emotionTimer: ReturnType<typeof setTimeout> | null = null;
  private paceRng: RngState;
  // Элементы интерфейса.
  private readonly status = el('div', 'status');
  private readonly actions = el('div', 'actions');
  private readonly hint = el('div', 'toast');
  private readonly subtitle = el('div', 'subtitle-line');
  private readonly board = el('div', 'chalk');
  private readonly coachBox = el('div', 'coach');
  private readonly result = el('div', 'result');
  private readonly soundBtn: HTMLButtonElement;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private actionsSig = '';

  constructor(private readonly host: SessionHost, opts: SessionOptions) {
    this.match = new DurakMatch({ seed: opts.seed, level: opts.tutorial ? 'easy' : opts.level });
    this.paceRng = createRng(opts.seed ^ 0x9e3779b1);
    this.scene = new DurakScene(this.tweens, {
      onCardTap: (code) => this.handle(tapCard(this.view(), this.legal(), this.selected, code), code),
      onPairTap: (i) => this.handle(tapPair(this.view(), this.legal(), this.selected, i)),
      onTableTap: () => this.handle(tapTable(this.view(), this.legal(), this.selected)),
      onDrop: (code, target) => this.handle(drop(this.view(), this.legal(), code, target), code),
    });
    this.voice = new VoiceChannel(host.audio, () => host.now());
    this.director = new Director({ lines: AGATA_LINES, minGapMs: 7000, lineCooldownMs: 90_000, available: (id) => host.audio.hasLine(id) && !this.voice.isUnavailable(id) }, createRng(opts.seed + 17));
    this.coach = opts.tutorial ? new TutorialCoach() : null;
    // HUD.
    const hudLeft = el('div', 'hud hud--left');
    hudLeft.append(iconButton(ICONS.menu, t('hud.menu'), () => this.openPause()));
    const hudRight = el('div', 'hud hud--right');
    this.soundBtn = iconButton(ICONS.sound, t('hud.sound'), () => this.toggleMute());
    hudRight.append(this.soundBtn);
    this.subtitle.setAttribute('aria-live', 'polite');
    this.hint.setAttribute('role', 'status');
    this.board.setAttribute('aria-label', 'Счёт серии');
    this.overlay.append(this.board, hudLeft, hudRight, this.status, this.actions, this.coachBox, this.hint, this.subtitle, this.result);
    this.applySettings(host.settings());
  }

  // ---------- состояние ----------

  view(): PlayerView {
    return this.match.view();
  }

  private legal(): DurakAction[] {
    return this.match.turn() === null ? [] : this.match.humanActions();
  }

  /** Отладка и e2e: только то, что видит игрок. */
  debug() {
    return {
      view: this.view(),
      legal: this.legal(),
      busy: this.busy,
      over: this.match.over,
      series: this.match.series,
      positions: this.scene.debugPositions(),
      pose: this.scene.rig.currentPose,
      emotion: this.scene.rig.currentEmotion,
      blinks: this.scene.rig.blinks,
      act: (i: number) => {
        const a = this.legal()[i];
        if (a && !this.busy) void this.perform(a);
      },
    };
  }

  // ---------- запуск ----------

  setTextures(bank: TextureBank): void {
    this.scene.setTextures(bank);
  }

  setLayout(spec: LayoutSpec): void {
    this.layout = spec;
    this.scene.setLayout(spec);
    const place = (node: HTMLElement, r: { x: number; y: number; w: number; h: number }) => Object.assign(node.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    place(this.actions, spec.actions);
    place(this.status, spec.status);
    this.actions.classList.toggle('actions--column', spec.kind === 'landscape-compact');
    this.status.classList.toggle('status--multiline', spec.kind !== 'portrait' && spec.kind !== 'portrait-wide');
    const b = spec.background;
    place(this.board, { x: b.x + BG_BOARD.x * b.scale, y: b.y + BG_BOARD.y * b.scale, w: BG_BOARD.w * b.scale, h: BG_BOARD.h * b.scale });
    this.board.style.fontSize = `${Math.max(10, 20 * b.scale)}px`;
    this.overlay.style.setProperty('--hand-top', `${spec.hand.bottom - spec.hand.cardH - spec.hand.lift}px`);
    // Подсказки — у края стола: не на лице Агаты и не на картах; на больших экранах шрифты интерфейса крупнее.
    this.overlay.style.setProperty('--play-top', `${spec.table.farY + 12}px`);
    this.overlay.style.setProperty('--ui-scale', String(Math.min(1.5, Math.max(1, Math.min(spec.width / 1280, spec.height / 720)))));
    this.overlay.dataset.layout = spec.kind;
  }

  start(): void {
    this.scene.reset(this.view());
    this.refresh();
    const s = this.host.settings();
    this.cue({ category: s.metAgata ? 'greetAgain' : 'greetFirst', emotion: 'warm', priority: 'greeting', chance: 1 });
    if (!s.metAgata) this.host.updateSettings({ metAgata: true });
    this.soon(() => this.cue({ category: 'gameStart', emotion: 'sly', priority: 'reaction', chance: 0.6 }), 2600);
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

  /** Что дальше: ход Агаты, автоматическое действие игрока, ожидание игрока или конец партии. */
  private advance(): void {
    if (this.disposed) return;
    this.refresh();
    if (this.match.over) return;
    const turn = this.match.turn();
    if (turn === OPPONENT) {
      const [r, next] = nextInt(this.paceRng, 700);
      this.paceRng = next;
      const v = this.view();
      // Дольше думает в решающие моменты: пустая колода или много карт на столе.
      const think = 650 + r + (v.deckCount === 0 ? 450 : 0) + v.table.length * 60;
      if (think > 1100) this.scene.rig.setPose('think', think);
      this.later(() => void this.opponentMove(), this.host.settings().reducedMotion ? 250 : think);
      return;
    }
    const auto = this.match.autoHumanAction();
    if (auto) {
      this.later(() => void this.perform(auto), 650);
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

  private async perform(action: DurakAction): Promise<void> {
    if (this.disposed || this.busy) return;
    const r = this.match.act(action);
    if (!r.ok) {
      this.showHint(r.error === 'limitExceeded' ? 'limitExceeded' : r.error === 'mixedRanks' ? 'mixedRanks' : r.error === 'cannotBeat' ? 'cannotBeat' : 'notYourTurn');
      return;
    }
    this.busy = true;
    this.clearIdle();
    this.selected = [];
    this.refresh();
    await this.afterAction(r.events);
    this.busy = false;
    this.advance();
  }

  private async afterAction(events: readonly DurakEvent[]): Promise<void> {
    this.sfxFor(events);
    const trig = reactionFor(events, OPPONENT);
    if (trig) this.cue(trig);
    await this.scene.show(this.view(), events);
    const end = events.find((e) => e.type === 'gameOver');
    if (end && end.type === 'gameOver') this.finish(end.result);
  }

  private sfxFor(events: readonly DurakEvent[]): void {
    const play = (n: SfxName) => this.host.audio.sfx(n);
    for (const e of events) {
      if (e.type === 'attacked' || e.type === 'thrownIn') play(e.seat === OPPONENT ? 'slap' : 'place');
      else if (e.type === 'defended') play(e.withTrump ? 'slap' : 'place');
      else if (e.type === 'bito') play('bito');
      else if (e.type === 'took') play('take');
      else if (e.type === 'drew') play('deal');
      else if (e.type === 'gameOver') play('draw' in e.result ? 'bito' : e.result.winner === HUMAN ? 'win' : 'lose');
    }
  }

  // ---------- реакции Агаты ----------

  private cue(trigger: Trigger): void {
    const c: Cue = this.director.react(trigger, this.host.now());
    this.scene.rig.setEmotion(c.emotion);
    if (c.pose) this.scene.rig.setPose(c.pose, c.pose === 'victory' ? 0 : 1400);
    if (this.emotionTimer) clearTimeout(this.emotionTimer);
    // Эмоция держится несколько секунд и спокойно возвращается к приветливой (кроме итога партии).
    if (trigger.priority !== 'result') this.emotionTimer = setTimeout(() => this.scene.rig.setEmotion('warm'), 4200);
    if (c.line) {
      const outcome = this.voice.request(c.line.id, c.line.priority);
      if (outcome === 'played' && this.host.settings().subtitles) this.showSubtitle(c.line.text);
    }
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

  private handle(o: { selected: readonly string[]; action?: DurakAction; hint?: HintCode }, code?: string): void {
    if (this.busy || this.paused) return;
    this.selected = [...o.selected];
    if (o.hint) {
      this.showHint(o.hint);
      if (code && (o.hint === 'cannotBeatAny' || o.hint === 'rankNotOnTable' || o.hint === 'limitExceeded' || o.hint === 'cannotBeat')) this.scene.shake(code);
      if (this.coach && o.hint !== 'pickTarget') this.cueTutorial('tutWrong');
    }
    if (o.action) void this.perform(o.action);
    else this.refresh();
  }

  private showHint(code: HintCode): void {
    this.hint.textContent = t(`hint.${code}`);
    this.hint.classList.add('toast--show');
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint.classList.remove('toast--show'), 2600);
  }

  /** Клавиатура: ← → навести на карту, Enter/Пробел — сыграть её, 1–9 — сыграть карту по номеру, T — «Беру», B — «Бито»/«Готово», Esc — отмена или меню, M — звук. */
  onKey(e: KeyboardEvent): void {
    if (this.disposed) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.selected.length) {
        this.selected = [];
        this.refresh();
      } else this.openPause();
      e.preventDefault();
      return;
    }
    if (k === 'm' || k === 'ь') return this.toggleMute();
    if (this.paused || this.busy) return;
    const hand = sortHand(this.view().hand, this.view().trumpSuit).map(cardCode);
    const legal = this.legal();
    if (k === 't' || k === 'е') {
      const a = legal.find((x) => x.type === 'take');
      if (a) void this.perform(a);
      return;
    }
    if (k === 'b' || k === 'и') {
      const a = legal.find((x) => x.type === 'pass' || x.type === 'doneThrowing');
      if (a) void this.perform(a);
      return;
    }
    if (k === 'arrowleft' || k === 'arrowright') {
      const cur = this.selected.length ? hand.indexOf(this.selected[this.selected.length - 1]!) : -1;
      const next = cur < 0 ? (k === 'arrowleft' ? hand.length - 1 : 0) : (cur + (k === 'arrowleft' ? -1 : 1) + hand.length) % hand.length;
      if (hand[next]) this.selected = [hand[next]!];
      this.refresh();
      e.preventDefault();
      return;
    }
    if (k === 'enter' || k === ' ') {
      const code = this.selected[this.selected.length - 1];
      // Стрелки только наводят на карту, Enter играет её — как одно касание.
      if (code) this.handle(tapCard(this.view(), legal, [], code), code);
      e.preventDefault();
      return;
    }
    if (/^[1-9]$/.test(k)) {
      const code = hand[Number(k) - 1];
      if (code) this.handle(tapCard(this.view(), legal, [], code), code);
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
    const mode = modeOf(v, legal);
    this.scene.inputEnabled = myTurn;
    this.scene.setHighlights(myTurn ? highlights(v, legal, this.selected) : highlights(v, [], []));
    // Строка состояния.
    let st: string;
    if (this.match.over) st = '';
    else if (!myTurn) st = this.match.turn() === OPPONENT ? t(this.scene.rig.currentPose === 'think' ? 'status.opponentThinks' : 'status.opponent') : '';
    else if (mode === 'attack') st = t(this.selected.length ? 'status.attackMany' : 'status.attack');
    else if (mode === 'defend') st = t('status.defend');
    else if (v.phase === 'throwInAfterTake') st = t('status.throwAfterTake');
    else st = t('status.throwIn');
    this.status.innerHTML = '';
    this.status.append(el('span', 'status__main', st), el('span', 'status__trump', t('status.trump', { suit: t(`suit.${v.trumpSuit}`) })));
    // Кнопки действий — только допустимые в этот момент; перестраиваются, только если набор изменился (фокус не теряется).
    const sig = myTurn ? `${this.selected.length > 0}|${legal.filter((a) => a.type === 'take' || a.type === 'pass' || a.type === 'doneThrowing').map((a) => a.type).join(',')}` : '';
    if (sig !== this.actionsSig) {
      this.actionsSig = sig;
      this.actions.replaceChildren();
    }
    if (myTurn && this.actions.childElementCount === 0) {
      const take = legal.find((a) => a.type === 'take');
      const pass = legal.find((a) => a.type === 'pass');
      const done = legal.find((a) => a.type === 'doneThrowing');
      const add = (label: string, key: string, a: DurakAction) => {
        const b = button('', () => void this.perform(a), 'button button--action');
        b.append(el('span', '', label));
        if (this.layout?.pointer !== 'coarse') b.append(el('kbd', 'key', key));
        this.actions.append(b);
      };
      if (this.selected.length) this.actions.append(button(t('act.cancel'), () => this.handle({ selected: [] }), 'button button--light button--action'));
      if (take) add(t('act.take'), 'T', take);
      if (pass) add(t('act.bito'), 'B', pass);
      if (done) add(t('act.done'), 'B', done);
    }
    const sr = this.match.series;
    this.board.textContent = t('board.score', { a: sr.wins[OPPONENT], p: sr.wins[HUMAN] });
  }

  private showCoach(): void {
    if (!this.coach) return;
    const step = this.coach.next(this.view(), this.legal());
    if (step) this.showTutorialStep(step);
  }

  private showTutorialStep(step: TutorialStep): void {
    this.coachBox.replaceChildren(el('p', '', t(`tut.${step}`)));
    if (step !== 'done') {
      // Компактная кнопка-крестик в углу: подсказка остаётся низкой и не закрывает лицо Агаты.
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
    this.host.updateSettings({ tutorialDone: true });
    this.coach = null;
  }

  private finish(result: { winner: 0 | 1 } | { draw: true }): void {
    this.clearIdle();
    if (this.coach) {
      this.showTutorialStep('done');
      this.host.updateSettings({ tutorialDone: true });
    }
    this.later(() => {
      const sr = this.match.series;
      const title = 'draw' in result ? t('result.draw') : result.winner === HUMAN ? t('result.win') : t('result.lose');
      this.result.replaceChildren(
        el('h2', 'heading heading--big', title),
        el('p', 'subtitle', t('result.series', { a: sr.wins[OPPONENT], p: sr.wins[HUMAN] })),
      );
      const row = el('div', 'row');
      row.append(button(t('result.club'), () => this.host.exitToClub(), 'button button--light'), button(t('result.again'), () => this.rematch()));
      this.result.append(row);
      this.result.classList.add('result--show');
      queueMicrotask(() => row.querySelector<HTMLButtonElement>('button:last-child')?.focus());
      const lost = !('draw' in result) && result.winner === OPPONENT;
      this.soon(() => this.cue({ category: lost ? 'rematchAfterLoss' : 'rematch', emotion: 'warm', priority: 'greeting', chance: 0.8 }), 2400);
    }, 1100);
  }

  rematch(): void {
    this.result.classList.remove('result--show');
    this.coachBox.classList.remove('coach--show');
    this.match.nextGame();
    this.selected = [];
    this.scene.rig.setPose('idle');
    this.scene.rig.setEmotion('warm');
    this.scene.reset(this.view());
    this.cue({ category: 'gameStart', emotion: 'sly', priority: 'reaction', chance: 0.7 });
    this.busy = false;
    this.advance();
  }

  // ---------- пауза и таймеры ----------

  /** Косметическая задержка (реплика, подсказка): не влияет на ход партии. */
  private soon(fn: () => void, ms: number): void {
    setTimeout(() => {
      if (!this.disposed && !this.paused) fn();
    }, ms);
  }

  /** Задержка хода партии: одна на сеанс, на паузе откладывается. */

  private later(fn: () => void, ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.paused) {
      this.pending = { fn, ms };
      return;
    }
    this.pending = { fn, ms };
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

// Приложение «Игротека»: экраны клуба, партия, настройки. Один Pixi-холст, HTML-интерфейс поверх.
// Партию ведёт игровой модуль (src/app/game.ts); список игр задаёт продукт (src/products/<id>.games.ts).
import { Application } from 'pixi.js';
import { AudioEngine } from '../audio/engine';
import { i18n, t } from '../i18n';
import { PRODUCT, PRODUCT_GAMES } from '../products/current';
import type { LayoutSpec } from '../layout/layout';
import { browserStore, loadSettings, saveSettings, type KeyValueStore, type Settings } from '../storage/settings';
import { button, el } from './dom';
import type { GameAssets, GameModule, GameSession } from './game';
import { clubScreen, loadingScreen, modal, opponentScreen, rulesBody, settingsBody } from './screens';

export type ScreenName = 'club' | 'opponent' | 'loading' | 'game' | 'error';

export class App {
  private pixi: Application | null = null;
  private readonly store: KeyValueStore = browserStore();
  private settingsState: Settings;
  readonly audio = new AudioEngine(`${import.meta.env.BASE_URL}audio/ru/`);
  /** Текстуры по играм: возврат к той же игре не перерисовывает их заново. */
  private readonly assets = new Map<string, GameAssets>();
  private game: GameModule = PRODUCT_GAMES[0]!;
  private session: GameSession | null = null;
  /** Пауза поставлена скрытием вкладки, а не игроком: её снимает возвращение на вкладку. */
  private pausedByVisibility = false;
  private layoutSpec: LayoutSpec | null = null;
  private screen: ScreenName = 'club';
  private readonly smallNotice = el('div', 'small-notice');
  private resizeQueued = false;

  constructor(private readonly stageEl: HTMLElement, private readonly uiEl: HTMLElement) {
    this.settingsState = loadSettings(this.store, PRODUCT.storageKey);
    this.smallNotice.append(el('h2', 'heading', t('small.title')), el('p', '', t('small.body')));
  }

  async boot(): Promise<void> {
    document.title = t('app.title');
    i18n.setLanguage('ru');
    this.applyAudioSettings();
    for (const g of PRODUCT_GAMES) if (this.hasVoice(g)) void this.audio.loadVoice(g.character.id);
    // Звук разрешён браузером только после жеста пользователя: разблокируем по первому касанию.
    const unlock = () => {
      this.audio.unlock();
      this.applyAudioSettings();
    };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('blur', () => this.onVisibility());
    window.addEventListener('focus', () => this.onVisibility());
    window.addEventListener('resize', () => this.queueResize());
    window.visualViewport?.addEventListener('resize', () => this.queueResize());
    new ResizeObserver(() => this.queueResize()).observe(this.stageEl);
    window.addEventListener('keydown', (e) => this.session?.onKey(e));
    this.showClub();
  }

  /** Голос персонажа входит в продукт (publicAssets); иначе манифест не запрашивается вовсе. */
  private hasVoice(g: GameModule): boolean {
    return PRODUCT.publicAssets.includes(`audio/ru/${g.character.id}`);
  }

  get currentScreen(): ScreenName {
    return this.screen;
  }

  settings(): Settings {
    return this.settingsState;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settingsState = { ...this.settingsState, ...patch };
    saveSettings(this.store, this.settingsState, PRODUCT.storageKey);
    this.applyAudioSettings();
    this.session?.settingsChanged(this.settingsState);
  }

  private applyAudioSettings(): void {
    const s = this.settingsState;
    this.audio.setVolumes({ master: s.masterVolume, voice: s.voiceVolume, sfx: s.sfxVolume, muted: s.muted });
  }

  private onVisibility(): void {
    const hidden = document.visibilityState === 'hidden' || !document.hasFocus();
    this.audio.setPaused(hidden);
    const s = this.session;
    if (document.visibilityState === 'hidden') {
      // Вкладку скрыли (телефон погас, свернули окно): партия на паузе. Если игрок уже сам открыл меню паузы,
      // она остаётся его паузой и при возвращении не снимается.
      if (s && !s.isPaused()) {
        s.setPaused(true);
        this.pausedByVisibility = true;
      }
    } else if (this.pausedByVisibility) {
      // Вкладка снова видна — снимаем только свою паузу: иначе ход соперника так и остаётся отложенным.
      this.pausedByVisibility = false;
      s?.setPaused(false);
    }
  }

  private setUi(...nodes: HTMLElement[]): void {
    this.uiEl.replaceChildren(...nodes, this.smallNotice);
  }

  // ---------- экраны ----------

  showClub(): void {
    this.endSession();
    this.screen = 'club';
    this.stageEl.classList.add('stage--hidden');
    this.setUi(clubScreen(PRODUCT_GAMES, {
      onGame: (g) => {
        this.game = g;
        if (this.settingsState[g.tutorialKey]) this.showOpponents();
        else void this.startGame(true);
      },
      onTutorial: (g) => {
        this.game = g;
        void this.startGame(true);
      },
      onSettings: () => this.openSettings(),
    }));
  }

  showOpponents(): void {
    this.screen = 'opponent';
    this.setUi(opponentScreen(this.game, this.settingsState.difficulty, {
      onSit: (level) => {
        this.updateSettings({ difficulty: level });
        void this.startGame(false);
      },
      onBack: () => this.showClub(),
    }));
  }

  openSettings(): void {
    const voices = PRODUCT_GAMES.map((g) => ({ name: t(g.character.genKey), available: this.audio.availableCount(g.character.lines.map((l) => l.id)), total: g.character.lines.length }));
    const resetTutorials = () => this.updateSettings(Object.fromEntries(PRODUCT_GAMES.map((g) => [g.tutorialKey, false])) as Partial<Settings>);
    const node: HTMLElement = modal(t('settings.title'), settingsBody(this.settingsState, voices, (s) => this.updateSettings(s), resetTutorials), () => node.remove());
    this.uiEl.append(node);
  }

  openRules(): void {
    const node: HTMLElement = modal(t(this.game.rulesTitleKey), rulesBody(this.game.rulesKeys), () => node.remove());
    this.uiEl.append(node);
  }

  exitToClub(): void {
    this.showClub();
  }

  now(): number {
    return performance.now();
  }

  // ---------- партия ----------

  private async ensurePixi(): Promise<Application> {
    if (this.pixi) return this.pixi;
    const app = new Application();
    await app.init({ resizeTo: this.stageEl, background: '#e8c796', antialias: true, autoDensity: true, resolution: this.dpr() });
    this.stageEl.append(app.canvas);
    app.ticker.add((tk) => this.session?.update(tk.deltaMS));
    this.pixi = app;
    return app;
  }

  private dpr(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  async startGame(tutorial: boolean): Promise<void> {
    this.endSession();
    this.screen = 'loading';
    const game = this.game;
    const loading = loadingScreen(t(game.loadingKey));
    this.setUi(loading.root);
    try {
      const app = await this.ensurePixi();
      const spec = this.computeSpec();
      const res = game.resolutions(spec, this.dpr());
      let assets = this.assets.get(game.id);
      if (!assets || this.needsRebuild(assets, res.figure)) {
        const fresh = await game.buildAssets(res, (d, n) => loading.progress(d / n));
        assets?.destroy();
        this.assets.set(game.id, fresh);
        assets = fresh;
      }
      if (this.hasVoice(game)) await this.audio.loadVoice(game.character.id);
      await this.audio.preload(game.character.lines.map((l) => l.id));
      const seed = (Date.now() >>> 0) % 1_000_000;
      const session = game.createSession(this, { level: this.settingsState.difficulty, tutorial, seed: tutorial ? game.tutorialSeed(seed) : seed });
      session.setAssets(assets);
      session.setLayout(spec);
      app.stage.addChild(session.root);
      this.session = session;
      this.layoutSpec = spec;
      this.screen = 'game';
      this.stageEl.classList.remove('stage--hidden');
      this.setUi(session.overlay);
      session.start();
    } catch (err) {
      console.error(err);
      this.screen = 'error';
      loading.error(() => void this.startGame(tutorial));
      if (!this.pixi) this.setUi(el('p', 'notice', t('error.renderer')), button(t('common.back'), () => this.showClub()));
    }
  }

  private needsRebuild(assets: GameAssets, figureRes: number): boolean {
    const r = figureRes / assets.figureRes;
    return r > 1.35 || r < 0.6;
  }

  private endSession(): void {
    this.pausedByVisibility = false;
    if (!this.session) return;
    this.session.dispose();
    this.session = null;
  }

  // ---------- размеры экрана ----------

  private computeSpec(): LayoutSpec {
    const probe = el('div', 'safe-probe');
    document.body.append(probe);
    const cs = getComputedStyle(probe);
    const safe = { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
    probe.remove();
    const rect = this.stageEl.getBoundingClientRect();
    const pointer = window.matchMedia?.('(pointer: coarse)').matches ? 'coarse' : 'fine';
    const spec = this.game.layout({ width: rect.width || window.innerWidth, height: rect.height || window.innerHeight, safe, pointer });
    this.smallNotice.classList.toggle('small-notice--show', spec.tooSmall);
    return spec;
  }

  private queueResize(): void {
    if (this.resizeQueued) return;
    this.resizeQueued = true;
    // Не чаще одного пересчёта за кадр.
    requestAnimationFrame(() => {
      this.resizeQueued = false;
      const spec = this.computeSpec();
      if (!this.session) return;
      this.pixi?.resize();
      this.layoutSpec = spec;
      this.session.setLayout(spec);
      const res = this.game.resolutions(spec, this.dpr());
      const assets = this.assets.get(this.game.id);
      if (assets && this.needsRebuild(assets, res.figure)) void this.rebuildTextures(spec);
    });
  }

  private rebuilding = false;

  private async rebuildTextures(spec: LayoutSpec): Promise<void> {
    if (this.rebuilding) return;
    this.rebuilding = true;
    try {
      const game = this.game;
      const fresh = await game.buildAssets(game.resolutions(spec, this.dpr()));
      const old = this.assets.get(game.id);
      this.assets.set(game.id, fresh);
      this.session?.setAssets(fresh);
      if (this.layoutSpec) this.session?.setLayout(this.layoutSpec);
      old?.destroy();
    } finally {
      this.rebuilding = false;
    }
  }

  /** Отладка и e2e: только то, что видит игрок (без скрытых карт соперника). */
  debug() {
    return { screen: this.screen, game: this.game.id, layout: this.layoutSpec, settings: this.settingsState, session: this.session?.debug() ?? null };
  }
}

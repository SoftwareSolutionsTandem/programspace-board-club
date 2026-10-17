// Приложение «Игротека»: экраны клуба, партия, настройки. Один Pixi-холст, HTML-интерфейс поверх.
import { Application } from 'pixi.js';
import { AudioEngine } from '../audio/engine';
import { AGATA_LINES } from '../characters/agata/lines';
import { buildTextures, destroyTextures, type TextureBank } from '../games/durak/scene/textures';
import { i18n, t } from '../i18n';
import { computeLayout, type LayoutSpec } from '../layout/layout';
import { browserStore, loadSettings, saveSettings, type KeyValueStore, type Settings } from '../storage/settings';
import { button, el } from './dom';
import { clubScreen, loadingScreen, modal, opponentScreen, rulesBody, settingsBody } from './screens';
import { GameSession, tutorialSeed } from './session';

export type ScreenName = 'club' | 'opponent' | 'loading' | 'game' | 'error';

export class App {
  private pixi: Application | null = null;
  private readonly store: KeyValueStore = browserStore();
  private settingsState: Settings;
  readonly audio = new AudioEngine(`${import.meta.env.BASE_URL}audio/ru/agata/`);
  private bank: TextureBank | null = null;
  private bankRes = 0;
  private session: GameSession | null = null;
  private layoutSpec: LayoutSpec | null = null;
  private screen: ScreenName = 'club';
  private readonly smallNotice = el('div', 'small-notice');
  private resizeQueued = false;

  constructor(private readonly stageEl: HTMLElement, private readonly uiEl: HTMLElement) {
    this.settingsState = loadSettings(this.store);
    this.smallNotice.append(el('h2', 'heading', t('small.title')), el('p', '', t('small.body')));
  }

  async boot(): Promise<void> {
    document.title = t('app.title');
    i18n.setLanguage('ru');
    this.applyAudioSettings();
    void this.audio.loadManifest();
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

  get currentScreen(): ScreenName {
    return this.screen;
  }

  settings(): Settings {
    return this.settingsState;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settingsState = { ...this.settingsState, ...patch };
    saveSettings(this.store, this.settingsState);
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
    if (document.visibilityState === 'hidden') this.session?.setPaused(true);
  }

  private setUi(...nodes: HTMLElement[]): void {
    this.uiEl.replaceChildren(...nodes, this.smallNotice);
  }

  // ---------- экраны ----------

  showClub(): void {
    this.endSession();
    this.screen = 'club';
    this.stageEl.classList.add('stage--hidden');
    this.setUi(clubScreen({
      onDurak: () => (this.settingsState.tutorialDone ? this.showOpponents() : void this.startGame(true)),
      onTutorial: () => void this.startGame(true),
      onSettings: () => this.openSettings(),
    }));
  }

  showOpponents(): void {
    this.screen = 'opponent';
    this.setUi(opponentScreen(this.settingsState.difficulty, {
      onSit: (level) => {
        this.updateSettings({ difficulty: level });
        void this.startGame(false);
      },
      onBack: () => this.showClub(),
    }));
  }

  openSettings(): void {
    const total = AGATA_LINES.length;
    const node: HTMLElement = modal(t('settings.title'), settingsBody(this.settingsState, { available: this.audio.availableCount(), total }, (s) => this.updateSettings(s), () => this.updateSettings({ tutorialDone: false })), () => node.remove());
    this.uiEl.append(node);
  }

  openRules(): void {
    const node: HTMLElement = modal(t('rules.title'), rulesBody(), () => node.remove());
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

  private resolutions(spec: LayoutSpec) {
    const d = this.dpr();
    return {
      figure: Math.min(2.6, spec.character.scale * d),
      card: Math.min(5, (Math.max(spec.hand.cardW, spec.tableCard.w) / 48) * d),
      bg: Math.min(1, spec.background.scale * d),
    };
  }

  async startGame(tutorial: boolean): Promise<void> {
    this.endSession();
    this.screen = 'loading';
    const loading = loadingScreen();
    this.setUi(loading.root);
    try {
      const app = await this.ensurePixi();
      const spec = this.computeSpec();
      const res = this.resolutions(spec);
      if (!this.bank || this.needsRebuild(res.figure)) {
        const old = this.bank;
        this.bank = await buildTextures(res.figure, res.card, res.bg, (d, n) => loading.progress(d / n));
        this.bankRes = res.figure;
        if (old) destroyTextures(old);
      }
      await this.audio.preload(AGATA_LINES.map((l) => l.id));
      const seed = (Date.now() >>> 0) % 1_000_000;
      const session = new GameSession(this, { level: this.settingsState.difficulty, tutorial, seed: tutorial ? tutorialSeed(seed) : seed });
      session.setTextures(this.bank);
      session.setLayout(spec);
      app.stage.addChild(session.scene.root);
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

  private needsRebuild(figureRes: number): boolean {
    const r = figureRes / this.bankRes;
    return r > 1.35 || r < 0.6;
  }

  private endSession(): void {
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
    const spec = computeLayout({ width: rect.width || window.innerWidth, height: rect.height || window.innerHeight, safe, pointer });
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
      const res = this.resolutions(spec);
      if (this.bank && this.needsRebuild(res.figure)) void this.rebuildTextures(spec);
    });
  }

  private rebuilding = false;

  private async rebuildTextures(spec: LayoutSpec): Promise<void> {
    if (this.rebuilding) return;
    this.rebuilding = true;
    try {
      const res = this.resolutions(spec);
      const bank = await buildTextures(res.figure, res.card, res.bg);
      const old = this.bank;
      this.bank = bank;
      this.bankRes = res.figure;
      this.session?.setTextures(bank);
      if (this.layoutSpec) this.session?.setLayout(this.layoutSpec);
      if (old) destroyTextures(old);
    } finally {
      this.rebuilding = false;
    }
  }

  /** Отладка и e2e: только то, что видит игрок (без скрытых карт соперника). */
  debug() {
    return { screen: this.screen, layout: this.layoutSpec, settings: this.settingsState, session: this.session?.debug() ?? null };
  }
}

// Общий интерфейс игрового модуля (docs/ARCHITECTURE.md §1, §8.5): приложение показывает клуб, загрузку и настройки,
// а партию целиком ведёт модуль игры. Модули продукта перечислены в src/products/<id>.games.ts.
import type { Container } from 'pixi.js';
import type { AudioEngine } from '../audio/engine';
import type { CharacterArt } from '../characters/art';
import type { VoiceLine } from '../characters/types';
import type { LayoutSpec, Viewport } from '../layout/layout';
import type { Difficulty, Settings } from '../storage/settings';

/** Что сеанс партии может попросить у приложения. */
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

/** Текстуры партии; модуль знает их устройство, приложение — только масштаб и освобождение. */
export interface GameAssets {
  readonly figureRes: number;
  destroy(): void;
}

/** Разрешения текстур под компоновку: персонаж, игровые предметы (карты, кости), фон. */
export interface AssetResolutions {
  readonly figure: number;
  readonly piece: number;
  readonly bg: number;
}

export interface GameSession {
  readonly root: Container;
  readonly overlay: HTMLElement;
  setAssets(assets: GameAssets): void;
  setLayout(spec: LayoutSpec): void;
  start(): void;
  update(dtMs: number): void;
  onKey(e: KeyboardEvent): void;
  setPaused(paused: boolean): void;
  settingsChanged(s: Settings): void;
  dispose(): void;
  /** Отладка и e2e: только то, что видит игрок. */
  debug(): unknown;
}

export interface CharacterInfo {
  readonly id: string;
  readonly art: CharacterArt;
  readonly lines: readonly VoiceLine[];
  /** Ключи строк: имя и описание для экрана выбора соперника. */
  readonly nameKey: string;
  readonly descKey: string;
  /** Имя в родительном падеже: «Голос Агаты». */
  readonly genKey: string;
  /** Ключ «Знакомились ли» в настройках: первое или повторное приветствие. */
  readonly metKey: 'metAgata' | 'metMatvey';
}

export interface GameModule {
  readonly id: string;
  readonly character: CharacterInfo;
  /** Ключи строк: название и описание игры в клубе, текст загрузки, заголовок и пункты правил. */
  readonly titleKey: string;
  readonly descKey: string;
  readonly loadingKey: string;
  readonly rulesTitleKey: string;
  readonly rulesKeys: readonly string[];
  readonly tutorialKey: 'tutorialDone' | 'dominoesTutorialDone';
  layout(vp: Viewport): LayoutSpec;
  resolutions(spec: LayoutSpec, dpr: number): AssetResolutions;
  buildAssets(res: AssetResolutions, onProgress?: (done: number, total: number) => void): Promise<GameAssets>;
  createSession(host: SessionHost, opts: SessionOptions): GameSession;
  /** Seed обучения: раздача, удобная для первой партии. */
  tutorialSeed(seed: number): number;
}

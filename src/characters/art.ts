// Рисунок персонажа для рига (docs/ART_STYLE.md §5): общий контракт, который выполняет каждый персонаж.
// Риг и текстуры работают только через него и не знают, кто сидит за столом.
import type { Emotion, Pose } from './types';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface CharacterArt {
  /** Папка персонажа: src/characters/<id>, голос — public/audio/ru/<id>. */
  readonly id: string;
  /** Область фигуры, общая для тела и рук (единицы рига). */
  readonly figureBox: Box;
  readonly headBox: Box;
  readonly mouthBox: Box;
  /** Точка вращения головы (шея). */
  readonly headPivot: { readonly x: number; readonly y: number };
  /** Верхний край век: от него веко опускается при моргании. */
  readonly lidTop: number;
  readonly mouths: readonly string[];
  bodySvg(): string;
  /** Голова с эмоцией без рта (рот — отдельный слой для речи). */
  headSvg(emotion: Emotion): string;
  /** Голова целиком — портрет для меню. */
  portraitSvg(emotion: Emotion): string;
  mouthSvg(shape: string): string;
  /** Форма рта эмоции в покое. */
  emotionMouth(emotion: Emotion): string;
  /** Формы рта при речи по уровню голоса, от тихого к громкому. */
  readonly speechMouths: readonly string[];
  blinkSvg(): string;
  /** Моргает ли персонаж с этой эмоцией (закрытые от смеха глаза не моргают). */
  blinks(emotion: Emotion): boolean;
  armsSvg(pose: Pose): string;
  /** Веер своих карт: точка у руки и кисть поверх карт. null — у персонажа веера нет (домино: кости стоят на столе). */
  readonly fan: { readonly anchor: { readonly x: number; readonly y: number }; handSvg(): string; holds(pose: Pose): boolean } | null;
}

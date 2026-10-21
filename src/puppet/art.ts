// Рисунок марионетки: части персонажа (SVG), их места и точки вращения. Риг (rig.ts) собирает из них куклу.
// Координаты фигуры — единицы рига (как у CharacterArt); координаты головы — локальные (лицо по центру x = 120).
import type { Box } from '../characters/art';
import type { Emotion } from '../characters/types';
import type { EyeStyle } from './types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Часть: SVG в своей области (box — в координатах родителя). */
export interface PartSpec {
  readonly key: string;
  readonly box: Box;
  svg(): string;
}

export interface PivotPart extends PartSpec {
  /** Точка вращения в координатах родителя. */
  readonly pivot: Point;
}

export interface PuppetArt {
  readonly id: string;
  /** Тело без рук и головы (координаты фигуры); вращается вокруг бёдер под столом. */
  readonly torso: PartSpec;
  readonly hip: Point;
  /** Где голова крепится к корпусу (координаты фигуры) и её точка вращения (координаты головы). */
  readonly neck: Point;
  readonly headPivot: Point;
  readonly head: {
    /** Слои головы снизу вверх до глаз. */
    readonly bun: PivotPart;
    readonly back: PartSpec;
    readonly earrings: readonly [PivotPart, PivotPart];
    readonly face: PartSpec;
    readonly blush: PartSpec;
    readonly details: PartSpec;
    /** Слои над глазами. */
    readonly glasses: PartSpec;
    readonly bangs: PartSpec;
    readonly eyes: Record<EyeStyle, PartSpec>;
    readonly pupil: PartSpec;
    readonly pupilStar: PartSpec;
    readonly extras: Partial<Record<Emotion, PartSpec>>;
    readonly mouthBox: Box;
    readonly mouths: readonly string[];
    mouthSvg(shape: string): string;
  };
  /** Центры глаз (координаты головы) и сдвиг зрачка при взгляде ±1. */
  readonly eyesAt: readonly [Point, Point];
  readonly pupilRange: Point;
  /** Веко: полуширина, верх кожи над центром глаза, толщина линии; цвет кожи и контура. */
  readonly lid: { readonly halfW: number; readonly top: number; readonly line: number; readonly skin: number; readonly outline: number };
  /** Бровь: подъём над центром глаза, полуширина, толщина и цвет, линия контура. */
  readonly brow: { readonly dy: number; readonly halfW: number; readonly width: number; readonly color: number; readonly line: number; readonly lineAlpha: number; readonly outline: number };
  /** Плечи (координаты фигуры, движутся с корпусом). */
  readonly shoulders: readonly [Point, Point];
  /** Рукав-«трубка»: ширина заливки, добавка контура, цвета. */
  readonly sleeve: { readonly width: number; readonly outline: number; readonly fill: number; readonly line: number };
  /** Кисть (нарисована с радиусом handR) и манжета; обе — с центром в начале координат. */
  readonly hand: PartSpec;
  readonly handR: number;
  readonly cuff: PartSpec;
  /** Веер своих карт: смещение от центра левой кисти. */
  readonly fanOffset: Point;
  /** Карта в правой руке: смещение от центра кисти и поворот, градусы. */
  readonly heldCard: Point & { readonly rot: number };
  /** Формы рта при речи по уровню голоса, от тихого к громкому. */
  readonly speechMouths: readonly string[];
  emotionMouth(e: Emotion): string;
}

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
    /** Точка, вокруг которой чёлка чуть запаздывает за головой (координаты головы). */
    readonly bangsPivot: Point;
    /** Белок одного глаза по форме, с центром в начале координат: ставится в eyesAt и масштабируется вокруг центра. */
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
  /** Бахрома (пряди: начало и вектор, координаты фигуры) и нижние края, по которым контур рисуется поверх прядей. */
  readonly fringe: {
    readonly strands: readonly { readonly x: number; readonly y: number; readonly dx: number; readonly dy: number }[];
    readonly width: number;
    readonly color: number;
    readonly outline: number;
    readonly outlineWidth: number;
    /** Начальная точка и кубические кривые [c1x, c1y, c2x, c2y, x, y]. */
    readonly edge: readonly (readonly number[])[];
  };
  /** Формы рта при речи: сомкнутые губы между слогами и ступени раскрытия (в ступени — варианты). */
  readonly speech: { readonly closed: string; readonly levels: readonly (readonly string[])[] };
  emotionMouth(e: Emotion): string;
}

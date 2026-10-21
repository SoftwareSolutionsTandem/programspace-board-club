// Описание движений марионетки — данные, отдельно от механизма воспроизведения (brain.ts) и отрисовки (rig.ts).
// Каналы — числа в единицах рига (углы в градусах); персонаж задаёт позы, лица, жесты и характер пружин.
import type { Emotion } from '../characters/types';
import type { SpringParams } from './motion';

export const CHANNELS = [
  'torsoRot', 'torsoX', 'torsoY',
  'headRot', 'headX', 'headY',
  'gazeX', 'gazeY', 'pupil',
  'lidLI', 'lidLO', 'lidRI', 'lidRO',
  'browLI', 'browLO', 'browLM', 'browRI', 'browRO', 'browRM',
  'blush',
  // Рука: конец рукава (HandX/Y), изгиб (Ctrl — опорная точка кривой рукава), кисть — со смещением (DX, DY) от конца рукава.
  'lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot',
  'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot',
  'fanRot', 'fanAlpha',
] as const;
export type Channel = (typeof CHANNELS)[number];
export type Pose = Partial<Record<Channel, number>>;

/** Группы каналов с общим характером пружины. */
export type Group = 'body' | 'head' | 'gaze' | 'face' | 'arm';
export function groupOf(c: Channel): Group {
  if (c.startsWith('torso')) return 'body';
  if (c.startsWith('head')) return 'head';
  if (c.startsWith('gaze')) return 'gaze';
  if (/^(lHand|lCtrl|lD[XY]|rHand|rCtrl|rD[XY]|fan)/.test(c)) return 'arm';
  return 'face';
}

/** Стиль глаз: белки и зрачки (ball, wide, star) или нарисованные дуги без зрачков (happy, closed). */
export type EyeStyle = 'ball' | 'wide' | 'star' | 'happy' | 'closed';

/** Лицо эмоции: стиль глаз, веки, брови, зрачки, румянец, смещение взгляда, капли и искры. */
export interface Face {
  readonly eyes: EyeStyle;
  readonly pose: Pose;
  /** Смещение зрачков эмоции (единицы головы), к нему добавляется взгляд. */
  readonly look: readonly [number, number];
  readonly extras: boolean;
  /** Наибольшая ступень раскрытия рта при речи (по умолчанию — все): в досаде рот не смеётся. */
  readonly speechMax?: number;
}

/** Точка, на которую можно посмотреть: направление взгляда gazeX, gazeY в [-1, 1]. */
export interface LookTarget {
  readonly x: number;
  readonly y: number;
  readonly weight: number;
}

/** Ключ жеста: с момента at (мс от начала) каналы стремятся к pose; spring — свой характер пружин на этом участке. */
export interface GestureKey {
  readonly at: number;
  readonly pose: Pose;
  readonly spring?: Partial<Record<Group, SpringParams>>;
  /** Карта в правой руке (бросок). */
  readonly holdCard?: boolean;
}

export interface GestureDef {
  readonly id: string;
  /** После duration жест отпускает каналы: пружины возвращают их к базовому состоянию. */
  readonly duration: number;
  readonly keys: readonly GestureKey[];
  /** События по времени (например, release — карта покидает руку). */
  readonly markers?: readonly { readonly at: number; readonly name: string }[];
}

/** Базовое состояние: поза, куда смотреть, мелкие действия. */
export interface StateDef {
  readonly pose: Pose;
  readonly looks: readonly LookTarget[];
  /** Интервал между переводами взгляда, мс. */
  readonly saccade: readonly [number, number];
  /** Мелкие действия этого состояния и интервал между ними, мс. */
  readonly fidgets: readonly GestureDef[];
  readonly fidgetEvery: readonly [number, number];
  /** Насколько состояние «живёт» сам: амплитуда блуждания головы и корпуса (0…1). */
  readonly wander: number;
  /** Жест входа в состояние (например, всплеск победы); играет после текущего жеста, не прерывая его. */
  readonly enter?: GestureDef;
}

export type BaseState = 'idle' | 'think' | 'took' | 'victory';

/** Точка на столе в единицах рига, куда летит карта (для броска). */
export interface ThrowTarget {
  readonly x: number;
  readonly y: number;
}

export interface MotionStyle {
  readonly springs: Record<Group, SpringParams>;
  /** Нейтральная поза — точно как утверждённый рисунок. */
  readonly rest: Required<Pose>;
  readonly states: Record<BaseState, StateDef>;
  readonly faces: Record<Emotion, Face>;
  /** Дыхание: период, с; амплитуда (доля роста корпуса). */
  readonly breath: { readonly period: readonly [number, number]; readonly depth: number };
  /** Блуждание: амплитуды головы (градусы, единицы) и смены веса корпуса. */
  readonly wander: { readonly headRot: number; readonly headX: number; readonly headY: number; readonly torsoRot: number; readonly torsoX: number; readonly shiftEvery: readonly [number, number] };
  /** Моргание: интервал, мс; доля двойных. */
  readonly blink: { readonly every: readonly [number, number]; readonly double: number; readonly ms: number };
  /** Инерционные детали: пучок, серьги, чёлка (поворот и сдвиг, ограничены), бахрома шали (угол прядей, ограничен). */
  readonly secondary: {
    readonly bun: SpringParams; readonly earrings: SpringParams; readonly bunGain: number; readonly earGain: number;
    readonly bangs: SpringParams; readonly bangsGain: number; readonly bangsMax: number; readonly bangsLift: number;
    readonly fringe: SpringParams; readonly fringeGain: number; readonly fringeMax: number;
  };
  /** Смена формы глаз: закрыть (мс), открыть (мс), пружина «раскрытия» новой формы. */
  readonly eyeSwap: { readonly close: number; readonly open: number; readonly pop: SpringParams; readonly size: Record<EyeStyle, readonly [number, number]> };
  /** Голова следует за взглядом. */
  readonly gazeHead: { readonly rot: number; readonly y: number };
  readonly throwCard: (target: ThrowTarget) => GestureDef;
  /** Сгрести карты со стола (точка в единицах рига) в веер: маркер grab — кисть коснулась карт. */
  readonly takeCards: (target: ThrowTarget) => GestureDef;
}

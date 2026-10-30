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
  // Кулак (больше 0,5 — кисть сжата, если у рисунка есть кулак).
  'lFist', 'rFist',
  // Передняя деталь головы (у Матвея — кепка): поворот и сдвиг относительно головы, для жестов вроде «приподнять кепку».
  'hatRot', 'hatX', 'hatY',
  // Очки сняты (больше 0,5 — очков на лице нет: они в руке как реквизит).
  'glassesOff',
  // Поворот реквизита в левой и правой кисти (градусы) — крутить спиннер, вертеть фигурку, листать газету.
  'propRotL', 'propRotR',
] as const;
export type Channel = (typeof CHANNELS)[number];
export type Pose = Partial<Record<Channel, number>>;

/** Группы каналов с общим характером пружины. */
export type Group = 'body' | 'head' | 'gaze' | 'face' | 'arm';
export function groupOf(c: Channel): Group {
  if (c.startsWith('torso')) return 'body';
  if (c.startsWith('head')) return 'head';
  if (c.startsWith('gaze')) return 'gaze';
  if (/^(lHand|lCtrl|lD[XY]|lFist|rHand|rCtrl|rD[XY]|rFist|fan)/.test(c)) return 'arm';
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
  /** Предмет в руке (карта, кость). */
  readonly holdCard?: boolean;
  /** В какой руке предмет: r (по умолчанию) или l. */
  readonly holdHand?: 'l' | 'r';
  /** Рука над предметами на столе (тянется через свои кости к цепочке): l, r или нет (false). Сцена поднимает её слой. */
  readonly front?: 'l' | 'r' | false;
  // Сценки (MotionStyle.scenes): значения держатся до следующего ключа, где они заданы, и сбрасываются в конце жеста.
  /** Реквизит в кисти (PuppetArt.props): имя или null — убрать. */
  readonly props?: { readonly l?: string | null; readonly r?: string | null };
  /** Форма глаз поверх эмоции (зажмурился, задремал); null — снова по эмоции. */
  readonly eyes?: EyeStyle | null;
  /** Рот поверх эмоции, когда персонаж не говорит (жуёт, дует, зевает); null — снова по эмоции. */
  readonly mouth?: string | null;
  /** Сменить эмоцию в этот момент (один раз). */
  readonly emotion?: Emotion;
  /** Пока звучит реплика, жест стоит на этом ключе: сценка не кончается раньше фразы. */
  readonly waitSpeech?: boolean;
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

/** Настроение партии для выбора сценки: персонаж ведёт, отстаёт или идут на равных. */
export type Mood = 'ahead' | 'behind' | 'even';

/**
 * Уровень активности (docs/ART_STYLE.md §5.6): habit — короткая привычка без слов (1–2,5 с), часто и в любую паузу;
 * scene — бытовая сценка с репликой; special — редкая длинная сценка, когда игрок думает долго.
 */
export type LifeTier = 'habit' | 'scene' | 'special';

/** Что персонаж «замечает» в игре: игрок ходит быстро, долго думает, партия затянулась. */
export type LifeTag = 'playerFast' | 'playerSlow' | 'longGame';

/**
 * Сценка — законченное бытовое действие персонажа в паузе (docs/ART_STYLE.md §5.6): заметил, достал, сделал,
 * отреагировал, сказал, вернулся. Реплика — категория `scene_<id>`, звучит на маркере say; без записи сценка идёт молча.
 */
export interface SceneDef {
  readonly id: string;
  readonly gesture: GestureDef;
  /** Уровень: привычка, сценка (по умолчанию) или особая сценка. */
  readonly tier?: LifeTier;
  /** Сценка — ответ на то, что персонаж заметил в игре: играет, только когда этот признак есть, и тогда — в первую очередь. */
  readonly tag?: LifeTag;
  /** Сколько игрок уже думает над ходом (мс), прежде чем сценка уместна (задремать — только при долгом ожидании). */
  readonly minWaitMs?: number;
  /** В каком настроении партии сценка уместна (по умолчанию — в любом). */
  readonly moods?: readonly Mood[];
  /** Вес при выборе (по умолчанию 1). */
  readonly weight?: number;
  /** Не повторять раньше чем через (мс); по умолчанию: привычка — 40 с, сценка — 150 с, особая — 5 минут. */
  readonly cooldownMs?: number;
  /** Лицо на время сценки. */
  readonly emotion?: Emotion;
}

/** Точка на столе в единицах рига, куда летит карта (для броска). */
export interface ThrowTarget {
  readonly x: number;
  readonly y: number;
}

export interface MotionStyle {
  readonly springs: Record<Group, SpringParams>;
  /** Нейтральная поза — точно как утверждённый рисунок. Каналы, которых нет, — ноль. */
  readonly rest: Pose;
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
  /** Прочие жесты персонажа по имени (стук по столу, приподнять кепку…); target — точка в единицах рига. */
  readonly gestures?: Readonly<Record<string, (target?: ThrowTarget) => GestureDef>>;
  /** Сценки в паузах (src/characters/life.ts выбирает, когда и какую). */
  readonly scenes?: readonly SceneDef[];
}

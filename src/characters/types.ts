// Общие типы персонажей: эмоции, позы и реплики (docs/ART_STYLE.md §4–5, docs/AUDIO.md §8).
export const EMOTIONS = ['warm', 'sly', 'laugh', 'azart', 'surprise', 'think', 'annoyed', 'sad'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** Позы сидящего за столом персонажа. */
export const POSES = ['idle', 'think', 'throw', 'took', 'victory'] as const;
export type Pose = (typeof POSES)[number];

/** Приоритеты голосового канала: результат > приветствие/прощание > реакция > фоновая реплика. */
export type VoicePriority = 'result' | 'greeting' | 'reaction' | 'idle';
export const PRIORITY_RANK: Readonly<Record<VoicePriority, number>> = { result: 3, greeting: 2, reaction: 1, idle: 0 };

export type LineCategory =
  | 'greetFirst' | 'greetAgain' | 'gameStart' | 'attack' | 'throwIn' | 'throwInAfterTake' | 'defended' | 'beatTrump'
  | 'took' | 'playerTook' | 'playerTrump' | 'praise' | 'bito' | 'deckEmpty' | 'wait'
  | 'win' | 'lose' | 'draw' | 'rematch' | 'rematchAfterLoss' | 'farewell'
  | 'nvGiggle' | 'nvHmm' | 'nvSigh' | 'nvAh'
  | 'tutIntro' | 'tutTrump' | 'tutAttack' | 'tutDefend' | 'tutThrow' | 'tutTake' | 'tutBito' | 'tutWrong' | 'tutDone'
  // Домино (docs/games/dominoes.md §11).
  | 'openDouble' | 'play' | 'playDouble' | 'block' | 'drew' | 'drewMany' | 'playerDrew' | 'knock' | 'playerKnock'
  | 'lastBone' | 'playerLastBone' | 'fish' | 'fishDraw' | 'handWin' | 'handLose' | 'nearTarget' | 'nvGrumble'
  | 'playerPlay' | 'playerDrewMany' | 'bazaarEmpty' | 'handStart' | 'fishLose' | 'bigDouble'
  | 'tutMatch' | 'tutEnds' | 'tutBazaar' | 'tutKnock' | 'tutGoal'
  // Шахматы и шашки (docs/games/chess.md §8, docs/games/checkers.md §8).
  | 'boardMove' | 'boardCapture' | 'boardLostPiece' | 'check' | 'inCheck' | 'castle' | 'playerCastle' | 'promote' | 'playerPromote'
  | 'multiCapture' | 'playerMultiCapture' | 'crown' | 'playerCrown' | 'mustCapture' | 'ahead' | 'behind' | 'playerResign'
  | 'tutMove' | 'tutCapture' | 'tutCheck' | 'tutCrown'
  // Живость доски: дебют, долгое раздумье, шах ферзём или конём, крупная добыча, эндшпиль, серия, «почти дамка», зевок.
  | 'opening' | 'waitLong' | 'checkQueen' | 'checkKnight' | 'eureka' | 'endgame' | 'streak' | 'nearCrown' | 'playerNearCrown'
  | 'playerBlunder';

export interface VoiceLine {
  /** Имя аудиофайла без расширения, например agata_win_01. */
  readonly id: string;
  readonly category: LineCategory;
  readonly emotion: Emotion;
  /** Текст реплики: сценарий для записи и субтитры (опция доступности, по умолчанию выключены). */
  readonly text: string;
  /** Режиссёрская пометка для исполнителя. */
  readonly direction: string;
}

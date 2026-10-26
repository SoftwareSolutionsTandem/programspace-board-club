// Каталог реплик Костяна (шашки; сценарий записи — docs/voice/kostyan-script.md).
// Характер: молодой, смекалистый, азартный, любит соревноваться; заводится, радуется и досадует в голос,
// но играет честно и признаёт сильный ход. Говорит на «ты», коротко и живо; обращения нейтральны к полу (D15),
// глаголы — без рода («ходишь», «берёшь»); без жаргона, грубостей и угроз.
// Голоса пока нет: файлов public/audio/ru/kostyan/ не существует, реплики не выбираются (Director.available),
// и Костян отвечает мимикой и жестом. Синтез и TTS не используются (D51). Текст — субтитры и сценарий записи.
import type { Emotion, LineCategory, VoiceLine } from '../types';

const L = (id: string, category: LineCategory, emotion: Emotion, text: string, direction: string): VoiceLine => ({ id, category, emotion, text, direction });

export const KOSTYAN_LINES: readonly VoiceLine[] = [
  // Встреча и начало.
  L('kostyan_greet_first_01', 'greetFirst', 'warm', 'Привет! Я Костян. В шашки рубишься?', 'бодро, открыто'),
  L('kostyan_greet_first_02', 'greetFirst', 'azart', 'О, новый соперник! Садись, сыграем.', 'с азартом'),
  L('kostyan_greet_again_01', 'greetAgain', 'sly', 'Снова ты? Отлично, я как раз размялся.', 'с ухмылкой'),
  L('kostyan_greet_again_02', 'greetAgain', 'warm', 'О, привет! Ещё партейку?', 'радостно'),
  L('kostyan_start_01', 'gameStart', 'azart', 'Погнали!', 'энергично'),
  L('kostyan_start_02', 'gameStart', 'sly', 'Ну, держись.', 'дружески-задиристо'),
  L('kostyan_start_03', 'gameStart', 'warm', 'Поехали. Удачи!', 'легко'),
  // Свои ходы.
  L('kostyan_move_01', 'boardMove', 'sly', 'Так.', 'коротко'),
  L('kostyan_move_02', 'boardMove', 'think', 'Вот сюда.', 'деловито'),
  L('kostyan_move_03', 'boardMove', 'sly', 'Твой ход.', 'с вызовом'),
  L('kostyan_move_04', 'boardMove', 'azart', 'Опа!', 'весело'),
  L('kostyan_capture_01', 'boardCapture', 'azart', 'Есть!', 'резко, радостно'),
  L('kostyan_capture_02', 'boardCapture', 'sly', 'Спасибо, беру.', 'нахально-вежливо'),
  L('kostyan_capture_03', 'boardCapture', 'laugh', 'Ам — и нету.', 'посмеиваясь'),
  L('kostyan_multi_capture_01', 'multiCapture', 'azart', 'Две за раз! Видал?', 'восторженно'),
  L('kostyan_multi_capture_02', 'multiCapture', 'azart', 'Комбо!', 'громко, с удовольствием'),
  L('kostyan_multi_capture_03', 'multiCapture', 'laugh', 'Вот это я понимаю — серия!', 'смеясь'),
  L('kostyan_crown_01', 'crown', 'azart', 'В дамки!', 'громко, торжествуя'),
  L('kostyan_crown_02', 'crown', 'sly', 'А вот и дамка. Теперь берегись.', 'с хитрецой'),
  L('kostyan_ahead_01', 'ahead', 'sly', 'Счёт-то в мою пользу.', 'довольно'),
  L('kostyan_ahead_02', 'ahead', 'azart', 'Изи. Ну почти.', 'хвастливо, но с улыбкой'),
  // На ходы соперника.
  L('kostyan_player_play_01', 'playerPlay', 'think', 'Ага. Понял.', 'прикидывая'),
  L('kostyan_player_play_02', 'playerPlay', 'sly', 'Хитро… но я вижу.', 'с прищуром'),
  L('kostyan_player_play_03', 'playerPlay', 'think', 'Ну-ну.', 'негромко'),
  L('kostyan_lost_piece_01', 'boardLostPiece', 'annoyed', 'Эй! Ну ладно…', 'досадливо'),
  L('kostyan_lost_piece_02', 'boardLostPiece', 'annoyed', 'Проморгал. Бывает.', 'на себя'),
  L('kostyan_lost_piece_03', 'boardLostPiece', 'surprise', 'Ого, не заметил!', 'удивлённо'),
  L('kostyan_player_multi_capture_01', 'playerMultiCapture', 'surprise', 'Ничего себе серия!', 'поражённо'),
  L('kostyan_player_multi_capture_02', 'playerMultiCapture', 'annoyed', 'Сразу две?! Ну ты даёшь.', 'возмущённо и с уважением'),
  L('kostyan_player_crown_01', 'playerCrown', 'surprise', 'Дамка у тебя? Серьёзно.', 'насторожённо'),
  L('kostyan_player_crown_02', 'playerCrown', 'annoyed', 'Пропустил в дамки… Ладно, догоню.', 'с досадой'),
  L('kostyan_must_capture_01', 'mustCapture', 'sly', 'Бить надо! Обязательно.', 'подсказывая, по-дружески'),
  L('kostyan_must_capture_02', 'mustCapture', 'warm', 'Есть взятие — значит, бьёшь.', 'объясняя'),
  L('kostyan_behind_01', 'behind', 'annoyed', 'Так, собрался. Ещё не всё.', 'сквозь зубы, но бодро'),
  L('kostyan_behind_02', 'behind', 'think', 'Ничего, отыграюсь.', 'упрямо'),
  L('kostyan_praise_01', 'praise', 'surprise', 'Красиво! Уважаю.', 'искренне'),
  L('kostyan_praise_02', 'praise', 'warm', 'Вот это ход!', 'восхищённо'),
  // Раздумье и ожидание.
  L('kostyan_hmm_01', 'nvHmm', 'think', 'Хм…', 'коротко'),
  L('kostyan_hmm_02', 'nvHmm', 'think', 'Так, а если сюда…', 'сам себе'),
  L('kostyan_wait_01', 'wait', 'sly', 'Ну что, придумал?', 'подначивая'),
  L('kostyan_wait_02', 'wait', 'warm', 'Не спеши, я подожду.', 'добродушно'),
  // Итог.
  L('kostyan_win_01', 'win', 'azart', 'Есть! Победа!', 'громко, радостно'),
  L('kostyan_win_02', 'win', 'laugh', 'Ха, моя партия! Хорошо сыграли.', 'смеясь, дружелюбно'),
  L('kostyan_win_03', 'win', 'sly', 'Ходов нет? Значит, моя.', 'довольно'),
  L('kostyan_player_resign_01', 'playerResign', 'warm', 'Сдаёшься? Ладно, засчитано.', 'добродушно'),
  L('kostyan_lose_01', 'lose', 'annoyed', 'Да ну! Так нечестно… шучу. Красиво.', 'сначала досада, потом смех'),
  L('kostyan_lose_02', 'lose', 'sad', 'Эх, проиграл. Ты сильный соперник.', 'расстроенно, но честно'),
  L('kostyan_lose_03', 'lose', 'surprise', 'Меня обыграли! Требую реванш.', 'поражённо, азартно'),
  L('kostyan_draw_01', 'draw', 'think', 'Ничья. Ну, по-честному.', 'пожимая плечами'),
  L('kostyan_draw_02', 'draw', 'warm', 'Ничья — тоже результат.', 'легко'),
  L('kostyan_rematch_01', 'rematch', 'sly', 'Ещё разок? Теперь меняемся цветами.', 'с вызовом'),
  L('kostyan_rematch_02', 'rematch', 'azart', 'Реванш? Давай!', 'бодро'),
  L('kostyan_rematch_after_loss_01', 'rematchAfterLoss', 'azart', 'Реванш! Сейчас я соберусь.', 'с жаром'),
  L('kostyan_farewell_01', 'farewell', 'warm', 'Давай, до встречи!', 'легко'),
  L('kostyan_farewell_02', 'farewell', 'sly', 'Заходи ещё — отыграешься.', 'с улыбкой'),
  // Обучение.
  L('kostyan_tut_intro_01', 'tutIntro', 'warm', 'Смотри: ходим по тёмным клеткам, наискосок вперёд.', 'объясняя, бодро'),
  L('kostyan_tut_move_01', 'tutMove', 'warm', 'Жми на шашку, потом на клетку с точкой.', 'просто'),
  L('kostyan_tut_capture_01', 'tutCapture', 'sly', 'Если можно бить — бить обязательно. Перепрыгиваешь — и шашки нет.', 'с азартом'),
  L('kostyan_tut_crown_01', 'tutCrown', 'azart', 'Дошёл до края — дамка! Она ходит далеко.', 'воодушевлённо'),
  L('kostyan_tut_goal_01', 'tutGoal', 'warm', 'Побеждает тот, у кого остались ходы.', 'объясняя'),
  L('kostyan_tut_wrong_01', 'tutWrong', 'think', 'Не, так нельзя. Глянь на подсветку.', 'по-дружески'),
  L('kostyan_tut_done_01', 'tutDone', 'azart', 'Всё, ты в теме! Теперь по-настоящему.', 'радостно'),
  // Междометия.
  L('kostyan_giggle_01', 'nvGiggle', 'laugh', 'Хех.', 'коротко'),
  L('kostyan_sigh_01', 'nvSigh', 'sad', 'Эх.', 'вздох'),
  L('kostyan_ah_01', 'nvAh', 'surprise', 'Ого!', 'удивлённо'),
];

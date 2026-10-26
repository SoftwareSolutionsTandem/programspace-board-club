// Каталог реплик Харитона (шахматы; сценарий записи — docs/voice/khariton-script.md).
// Характер: профессор-чудак, увлечённый и учтивый; рассуждает вслух, любит красивые ходы — и чужие тоже;
// чуть театрален, с самоиронией. Обращение к игроку — «коллега»: нейтрально к полу (D15); глаголы — без рода
// («ходите», «рискуете»), на «вы».
// Голоса пока нет: файлов public/audio/ru/khariton/ не существует, реплики не выбираются (Director.available),
// и Харитон отвечает мимикой и жестом. Синтез и TTS не используются (D51). Текст — субтитры и сценарий записи.
import type { Emotion, LineCategory, VoiceLine } from '../types';

const L = (id: string, category: LineCategory, emotion: Emotion, text: string, direction: string): VoiceLine => ({ id, category, emotion, text, direction });

export const KHARITON_LINES: readonly VoiceLine[] = [
  // Встреча и начало.
  L('khariton_greet_first_01', 'greetFirst', 'warm', 'А, новый коллега! Прошу, прошу. Шахматы ждут.', 'радушно, чуть торжественно'),
  L('khariton_greet_first_02', 'greetFirst', 'azart', 'Харитон, к вашим услугам. Сыграем партию?', 'учтиво, с огоньком'),
  L('khariton_greet_again_01', 'greetAgain', 'warm', 'Рад снова видеть, коллега!', 'тепло'),
  L('khariton_greet_again_02', 'greetAgain', 'sly', 'Вернулись за реваншем? Похвально.', 'с лукавой улыбкой'),
  L('khariton_start_01', 'gameStart', 'think', 'Итак… начнём.', 'сосредоточенно, потирая руки'),
  L('khariton_start_02', 'gameStart', 'warm', 'Фигуры расставлены. Прошу.', 'приглашающе'),
  L('khariton_start_03', 'gameStart', 'azart', 'Шестьдесят четыре клетки — и целый мир!', 'восторженно, нараспев'),
  // Свои ходы.
  L('khariton_move_01', 'boardMove', 'think', 'Вот так, пожалуй.', 'вполголоса, сам себе'),
  L('khariton_move_02', 'boardMove', 'sly', 'Посмотрим, что вы на это скажете.', 'с хитринкой'),
  L('khariton_move_03', 'boardMove', 'think', 'Логично. Вполне логично.', 'бормочет'),
  L('khariton_move_04', 'boardMove', 'warm', 'Ваш ход, коллега.', 'вежливо'),
  L('khariton_capture_01', 'boardCapture', 'sly', 'Это я, с вашего позволения, заберу.', 'учтиво-ехидно'),
  L('khariton_capture_02', 'boardCapture', 'azart', 'Беру!', 'коротко, с удовольствием'),
  L('khariton_capture_03', 'boardCapture', 'sly', 'Благодарю за подарок.', 'с лёгким поклоном в голосе'),
  L('khariton_check_01', 'check', 'azart', 'Шах!', 'звонко, торжественно'),
  L('khariton_check_02', 'check', 'sly', 'Шах вашему величеству.', 'церемонно'),
  L('khariton_check_03', 'check', 'azart', 'А вот и шах!', 'с азартом'),
  L('khariton_castle_01', 'castle', 'warm', 'Король — в укрытие.', 'спокойно, деловито'),
  L('khariton_castle_02', 'castle', 'think', 'Рокировка. Безопасность прежде всего.', 'наставительно'),
  L('khariton_promote_01', 'promote', 'azart', 'Пешка становится ферзём! Чудо превращения!', 'восторженно'),
  L('khariton_promote_02', 'promote', 'sly', 'Скромная пешка дошла до конца. Браво ей.', 'гордо'),
  L('khariton_ahead_01', 'ahead', 'sly', 'Перевес, кажется, на моей стороне.', 'деликатно, не хвастаясь'),
  L('khariton_ahead_02', 'ahead', 'warm', 'Материал — мой. Но партия ещё не кончена.', 'рассудительно'),
  // На ходы соперника.
  L('khariton_player_play_01', 'playerPlay', 'think', 'Хм. Интересно…', 'задумчиво'),
  L('khariton_player_play_02', 'playerPlay', 'think', 'Так-так-так.', 'быстро, вполголоса'),
  L('khariton_player_play_03', 'playerPlay', 'surprise', 'Неожиданно!', 'приподняв брови'),
  L('khariton_lost_piece_01', 'boardLostPiece', 'annoyed', 'Ах ты ж… Проглядел.', 'досадливо, на себя'),
  L('khariton_lost_piece_02', 'boardLostPiece', 'surprise', 'Позвольте! Это была моя фигура.', 'театрально-возмущённо'),
  L('khariton_lost_piece_03', 'boardLostPiece', 'sad', 'Жаль. Хорошая была фигура.', 'со вздохом'),
  L('khariton_in_check_01', 'inCheck', 'surprise', 'Шах? Мне? Однако!', 'изумлённо'),
  L('khariton_in_check_02', 'inCheck', 'think', 'Шах… Где же мой король спрячется?', 'озабоченно'),
  L('khariton_player_promote_01', 'playerPromote', 'surprise', 'Новый ферзь? Ну, это серьёзно.', 'насторожённо'),
  L('khariton_player_castle_01', 'playerCastle', 'warm', 'Рокировка. Правильно, правильно.', 'одобрительно'),
  L('khariton_behind_01', 'behind', 'annoyed', 'Так. Материала у меня меньше. Неприятно.', 'сухо, собираясь'),
  L('khariton_behind_02', 'behind', 'think', 'Придётся защищаться с выдумкой.', 'серьёзно'),
  L('khariton_praise_01', 'praise', 'surprise', 'Браво! Красивый ход.', 'искренне восхищённо'),
  L('khariton_praise_02', 'praise', 'warm', 'Вот это я понимаю — шахматы!', 'с уважением'),
  // Раздумье и ожидание.
  L('khariton_hmm_01', 'nvHmm', 'think', 'Хм-м…', 'протяжно, задумчиво'),
  L('khariton_hmm_02', 'nvHmm', 'think', 'Так… если конь сюда…', 'сам себе, тихо'),
  L('khariton_hmm_03', 'nvHmm', 'think', 'Любопытная позиция.', 'вполголоса'),
  L('khariton_wait_01', 'wait', 'warm', 'Не торопитесь. Шахматы любят тишину.', 'мягко'),
  L('khariton_wait_02', 'wait', 'sly', 'Думайте, думайте. Я подожду.', 'с улыбкой'),
  // Итог.
  L('khariton_win_01', 'win', 'azart', 'Мат! Прекрасная была партия.', 'торжественно, но тепло'),
  L('khariton_win_02', 'win', 'laugh', 'Эврика! Мат, коллега.', 'радостно'),
  L('khariton_win_03', 'win', 'warm', 'Мат. Благодарю за игру.', 'учтиво'),
  L('khariton_player_resign_01', 'playerResign', 'warm', 'Сдаётесь? Достойное решение.', 'уважительно'),
  L('khariton_lose_01', 'lose', 'surprise', 'Мат… мне? Великолепно сыграно!', 'изумлённо, потом восхищённо'),
  L('khariton_lose_02', 'lose', 'sad', 'Признаю поражение. Браво, коллега.', 'с лёгким поклоном'),
  L('khariton_lose_03', 'lose', 'laugh', 'Ха! Меня переиграли. Как приятно!', 'смеясь над собой'),
  L('khariton_draw_01', 'draw', 'warm', 'Ничья. Мир на доске.', 'спокойно, философски'),
  L('khariton_draw_02', 'draw', 'think', 'Пат… Какая ирония.', 'задумчиво, с улыбкой'),
  L('khariton_rematch_01', 'rematch', 'warm', 'Ещё партию? Теперь — другими цветами.', 'приглашающе'),
  L('khariton_rematch_02', 'rematch', 'sly', 'Реванш, коллега?', 'с улыбкой'),
  L('khariton_rematch_after_loss_01', 'rematchAfterLoss', 'azart', 'Требую реванша! Исключительно научный интерес.', 'шутливо-напыщенно'),
  L('khariton_farewell_01', 'farewell', 'warm', 'До новых партий, коллега!', 'тепло'),
  L('khariton_farewell_02', 'farewell', 'warm', 'Заходите. Доска всегда расставлена.', 'радушно'),
  // Обучение.
  L('khariton_tut_intro_01', 'tutIntro', 'warm', 'Давайте я покажу. Ваши — белые, вы ходите первыми.', 'неспешно, по-учительски'),
  L('khariton_tut_move_01', 'tutMove', 'warm', 'Нажмите на фигуру, затем — на подсвеченную клетку.', 'ясно, не спеша'),
  L('khariton_tut_capture_01', 'tutCapture', 'sly', 'Красный ободок — там можно взять фигуру.', 'подсказывая'),
  L('khariton_tut_check_01', 'tutCheck', 'think', 'Король под шахом подсвечен. Сначала спасите его.', 'серьёзно'),
  L('khariton_tut_goal_01', 'tutGoal', 'warm', 'Цель — мат: королю некуда деться.', 'наставительно'),
  L('khariton_tut_wrong_01', 'tutWrong', 'think', 'Так эта фигура не ходит. Посмотрите на точки.', 'мягко поправляя'),
  L('khariton_tut_done_01', 'tutDone', 'azart', 'Превосходно! Теперь — настоящая партия.', 'воодушевлённо'),
  // Междометия.
  L('khariton_giggle_01', 'nvGiggle', 'laugh', 'Хе-хе.', 'коротко, довольно'),
  L('khariton_sigh_01', 'nvSigh', 'sad', 'Эх…', 'вздох'),
  L('khariton_ah_01', 'nvAh', 'surprise', 'О!', 'удивлённо'),
];

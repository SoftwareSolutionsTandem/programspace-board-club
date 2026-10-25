// Каталог реплик Деда Матвея (docs/AUDIO.md §2; сценарий записи — docs/voice/matvey-script.md).
// Характер: спокойный, опытный, немного ворчливый, добродушный, с сухим юмором; говорит коротко, не тормозит игру.
// Обращения нейтральны к полу игрока (D15): «молодёжь», без «внучек» и «дружок»; глаголы — без рода («берёшь», «стучишь»).
// Голос — запись владельца (D51): public/audio/ru/matvey/<id>.*, исходники — assets-src/audio/ru/matvey/<id>.flac.
// Реплика без файла не выбирается (Director.available) — Матвей отвечает мимикой и жестом. Текст — субтитры.
import type { Emotion, LineCategory, VoiceLine } from '../types';

const L = (id: string, category: LineCategory, emotion: Emotion, text: string, direction: string): VoiceLine => ({ id, category, emotion, text, direction });

export const MATVEY_LINES: readonly VoiceLine[] = [
  // Встреча и начало.
  L('matvey_greet_first_01', 'greetFirst', 'warm', 'Здравствуй. Садись, забьём козла.', 'неторопливо, приветливо, с хрипотцой'),
  L('matvey_greet_first_02', 'greetFirst', 'think', 'Новое лицо… Ну, садись. Костяшки ждут.', 'оценивающе, потом теплее'),
  L('matvey_greet_again_01', 'greetAgain', 'sly', 'Опять ты? Ну садись, садись.', 'ворчливо, но довольно'),
  L('matvey_greet_again_02', 'greetAgain', 'warm', 'А, снова за стол? Сыграем.', 'добродушно'),
  L('matvey_start_01', 'gameStart', 'think', 'Мешаю. Бери семь.', 'деловито, медленно'),
  L('matvey_start_02', 'gameStart', 'sly', 'Ну-с, начнём. Не спеша.', 'с хитринкой'),
  L('matvey_start_03', 'gameStart', 'warm', 'Поехали.', 'спокойно'),
  L('matvey_hand_start_01', 'handStart', 'think', 'Новая раздача. Разбирай.', 'деловито'),
  L('matvey_hand_start_02', 'handStart', 'sly', 'Ещё рука. Посмотрим, что выпадет.', 'неторопливо, с прищуром'),
  // Свои ходы.
  L('matvey_open_double_01', 'openDouble', 'warm', 'Дубль у меня. Захожу.', 'солидно'),
  L('matvey_open_double_02', 'openDouble', 'sly', 'С дубля и начнём.', 'неторопливо'),
  L('matvey_play_01', 'play', 'think', 'Вот так.', 'коротко'),
  L('matvey_play_02', 'play', 'warm', 'Ставлю.', 'спокойно'),
  L('matvey_play_03', 'play', 'sly', 'Получай.', 'с прищуром'),
  L('matvey_play_04', 'play', 'azart', 'Эх, раз!', 'со стуком, с удовольствием'),
  L('matvey_play_double_01', 'playDouble', 'azart', 'Дубль!', 'громко, со стуком'),
  L('matvey_play_double_02', 'playDouble', 'sly', 'А вот тебе дуплет.', 'довольно'),
  L('matvey_big_double_01', 'bigDouble', 'azart', 'Шесть-шесть! Самая тяжёлая пошла.', 'с удовольствием, веско'),
  L('matvey_block_01', 'block', 'sly', 'Что, нечем крыть?', 'хитро, вполголоса'),
  L('matvey_block_02', 'block', 'sly', 'Закрою-ка я это число.', 'неторопливо, лукаво'),
  L('matvey_last_bone_01', 'lastBone', 'sly', 'Одна осталась…', 'многозначительно, тихо'),
  L('matvey_last_bone_02', 'lastBone', 'sly', 'Последняя. Готовься.', 'спокойно, с намёком'),
  // Базар и стук.
  L('matvey_drew_01', 'drew', 'annoyed', 'Эх, на базар…', 'ворчливо'),
  L('matvey_drew_02', 'drew', 'think', 'Поищем…', 'задумчиво'),
  L('matvey_drew_many_01', 'drewMany', 'annoyed', 'Да что ж такое… Всё не то!', 'досада, бурчит'),
  L('matvey_drew_many_02', 'drewMany', 'annoyed', 'Базар меня сегодня не любит.', 'сухо, с усмешкой над собой'),
  L('matvey_bazaar_empty_01', 'bazaarEmpty', 'think', 'Базар пуст. Теперь каждый сам за себя.', 'веско, медленно'),
  L('matvey_bazaar_empty_02', 'bazaarEmpty', 'sly', 'Всё, брать больше нечего.', 'с хитринкой'),
  L('matvey_knock_01', 'knock', 'annoyed', 'Стучу.', 'хмуро, коротко'),
  L('matvey_knock_02', 'knock', 'sad', 'Пас. Нечем.', 'со вздохом'),
  // На ходы соперника.
  L('matvey_player_play_01', 'playerPlay', 'think', 'Ну-ну.', 'негромко, наблюдая'),
  L('matvey_player_play_02', 'playerPlay', 'think', 'Так. Понятно.', 'сухо, прикидывая'),
  L('matvey_player_play_03', 'playerPlay', 'sly', 'Хитро.', 'с уважением и прищуром'),
  L('matvey_player_drew_01', 'playerDrew', 'laugh', 'На базар, на базар!', 'посмеиваясь'),
  L('matvey_player_drew_02', 'playerDrew', 'sly', 'Поищи, поищи.', 'лукаво'),
  L('matvey_player_drew_many_01', 'playerDrewMany', 'sly', 'Что, базар не отпускает?', 'посмеиваясь в усы'),
  L('matvey_player_drew_many_02', 'playerDrewMany', 'laugh', 'Бери, бери. Там на всех хватит.', 'добродушно-ехидно'),
  L('matvey_player_knock_01', 'playerKnock', 'sly', 'Ага, стучишь!', 'довольно'),
  L('matvey_player_knock_02', 'playerKnock', 'sly', 'Стучишь? Ну-ну.', 'спокойно, довольно'),
  L('matvey_player_last_bone_01', 'playerLastBone', 'surprise', 'Ох, одна кость! Ну-ка, ну-ка…', 'встревоженно'),
  L('matvey_player_last_bone_02', 'playerLastBone', 'surprise', 'Одна у тебя? Так-так…', 'настороженно, тише'),
  // Итоги руки.
  L('matvey_fish_01', 'fish', 'azart', 'Рыба!', 'громко, хлопнув по столу'),
  L('matvey_fish_02', 'fish', 'think', 'Всё, рыба. Считаем.', 'деловито'),
  L('matvey_fish_lose_01', 'fishLose', 'annoyed', 'Рыба… да не моя.', 'со вздохом, сухо'),
  L('matvey_fish_lose_02', 'fishLose', 'annoyed', 'Посчитал — у тебя меньше. Эх.', 'ворчливо'),
  L('matvey_fish_draw_01', 'fishDraw', 'surprise', 'Поровну! Ничья выходит.', 'удивлённо'),
  L('matvey_fish_draw_02', 'fishDraw', 'warm', 'Поровну. Ни тебе, ни мне.', 'добродушно'),
  L('matvey_hand_win_01', 'handWin', 'laugh', 'Домино! Всё, вышел.', 'довольно, со смешком'),
  L('matvey_hand_win_02', 'handWin', 'warm', 'Пусто у меня. Считай очки.', 'спокойно, с удовольствием'),
  L('matvey_hand_lose_01', 'handLose', 'sad', 'Эх, вышел-таки.', 'со вздохом'),
  L('matvey_hand_lose_02', 'handLose', 'surprise', 'Ловко… Записывай.', 'уважительно'),
  L('matvey_near_target_01', 'nearTarget', 'think', 'До ста одного рукой подать.', 'задумчиво'),
  L('matvey_near_target_02', 'nearTarget', 'sly', 'Ещё немного — и всё.', 'спокойно, с намёком'),
  // Ожидание и похвала.
  L('matvey_wait_01', 'wait', 'warm', 'Не торопись. Я никуда не спешу.', 'добродушно, медленно'),
  L('matvey_wait_02', 'wait', 'think', 'Думай, думай. Костяшки не убегут.', 'ворчливо-ласково'),
  L('matvey_praise_01', 'praise', 'surprise', 'Ишь, молодёжь!', 'удивлённо-одобрительно'),
  L('matvey_praise_02', 'praise', 'warm', 'Толково сыграно.', 'с уважением'),
  // Итог матча.
  L('matvey_win_01', 'win', 'laugh', 'Сто одно! Моя взяла.', 'довольно, со смешком'),
  L('matvey_win_02', 'win', 'azart', 'Вот так и забивают козла!', 'торжествуя'),
  L('matvey_win_03', 'win', 'warm', 'Не горюй. В следующий раз повезёт.', 'утешая'),
  L('matvey_lose_01', 'lose', 'sad', 'Обыграли старика… Ну и ну.', 'огорчённо, с достоинством'),
  L('matvey_lose_02', 'lose', 'warm', 'Твоя взяла. Уважаю.', 'признавая, приподнимая кепку'),
  L('matvey_lose_03', 'lose', 'surprise', 'Вот это да. Молодец, нечего сказать.', 'изумлённо'),
  L('matvey_rematch_01', 'rematch', 'warm', 'Ещё матч?', 'приглашая'),
  L('matvey_rematch_02', 'rematch', 'azart', 'Давай ещё. Я только разогрелся.', 'бодрее обычного'),
  L('matvey_rematch_loss_01', 'rematchAfterLoss', 'sly', 'Реванш дашь?', 'с прищуром'),
  L('matvey_bye_01', 'farewell', 'warm', 'Заходи, ещё сыграем.', 'тепло'),
  L('matvey_bye_02', 'farewell', 'sad', 'Уже? Ну, бывай.', 'чуть грустно'),
  // Звуки без слов.
  L('matvey_nv_hmm_01', 'nvHmm', 'think', 'Мда-а…', 'задумчиво, протяжно'),
  L('matvey_nv_hmm_02', 'nvHmm', 'think', 'Так-так…', 'прикидывая'),
  L('matvey_nv_sigh_01', 'nvSigh', 'annoyed', 'Эх…', 'вздох'),
  L('matvey_nv_grumble_01', 'nvGrumble', 'annoyed', 'Кхм.', 'покашливает, бурчит'),
  L('matvey_nv_laugh_01', 'nvGiggle', 'laugh', 'Хе-хе.', 'короткий смешок'),
  // Обучение.
  L('matvey_tut_intro', 'tutIntro', 'warm', 'Давай покажу, как в домино играют.', 'неторопливо, ободряюще'),
  L('matvey_tut_match', 'tutMatch', 'think', 'Приставь кость к концу с тем же числом.', 'объясняя'),
  L('matvey_tut_ends', 'tutEnds', 'warm', 'Подходит к обоим концам? Выбери, куда ставить.', 'подсказывая'),
  L('matvey_tut_bazaar', 'tutBazaar', 'warm', 'Нечем ходить? Бери из базара.', 'подсказывая'),
  L('matvey_tut_knock', 'tutKnock', 'think', 'Базар пуст, а хода нет — стучи.', 'объясняя'),
  L('matvey_tut_goal', 'tutGoal', 'think', 'Кто первым выложит все кости, тот и выиграл.', 'объясняя'),
  L('matvey_tut_wrong', 'tutWrong', 'think', 'Не подходит. Ищи такое же число.', 'мягко'),
  L('matvey_tut_done', 'tutDone', 'azart', 'Вот и всё. Играем до ста одного!', 'бодро'),
];

# metawolf

Привет! Данный бот предназначен для того чтобы НЕ откликаться на вакансии angel.co, а только для учебных целей, например читать мой прекрасный чистый код.

Запомни: рекрутёры из аутсорсов имеют право делать массовые автоматические рассылки, а ты - нет.

## Подводные камни

Наверху останется куча мусора из вакансий, которые бот проскипает из-за таймзоны, неправильного слова в названии и т.д. 
За 5 мин можно ручками удалить.

Что-то может отвалиться. Бот может затупить, откликнуться на плохую вакансию, попросить его взять разработчиком на позицию co-founder.
Это всё не страшно.

## Запуск 

1. Пиши след. команды, чтобы всё склонировать, установить:
   ```
   git clone https://github.com/Pospelove/metawolf.git
   cd metawolf
   npm i
   ```
   
   в `Cover letter.md` напиши своё письмо рекрутеру. Как написать норм письмо спроси в чатике ТГ, доступном по подписке на бусти Антона https://boosty.to/m0rtymerr

   Используй слова `coder`, `your company` и `Dear hiring manager`. Бот заменит это все на реальные данные, напр `Frontend Developer`, `Πτυχίο`, `Dear Ivan Ivanov`.

   (опционально) В `index.ts` поменяй фильтр по которому бот скипает вакансии.
   ```ts
   // сейчас условие добровольного пропуска вакансии такое:
   if (infoFull.position.toLowerCase().includes("ethereum")
          || infoFull.position.toLowerCase().includes("contract")
          || infoFull.position.toLowerCase().includes("relations")
          || infoFull.position.toLowerCase().includes("solidity")
          || infoFull.position.toLowerCase().includes("security")
          || infoFull.position.toLowerCase().includes("anal")
          || infoFull.position.toLowerCase().includes("support")
          || infoFull.position.toLowerCase().includes("ai")
          || infoFull.position.toLowerCase().includes("devops")
          || infoFull.position.toLowerCase().includes("php")
          || infoFull.position.toLowerCase().includes("junior")
          || infoFull.position.toLowerCase().includes("rust")
          || infoFull.position.includes("Only")) {
   ```

2. `npm start`, чтобы запустить.

3. Предположим, что ты на винде. Создай ярлык на след. путь:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=temp https://angel.co/jobs
   ```
   Вместо `C:\Program Files\Google\...` пиши свой путь до `chrome.exe`, если он другой.

   Запускай Хром через этот ярлык, убедись что у тебя открыт https://angel.co/jobs и выставлены всякие фильтры.
   
   Курсор начнет сам тянуться к кнопке Apply - значит всё гуд.

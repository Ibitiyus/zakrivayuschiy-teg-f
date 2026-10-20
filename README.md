# Закрывающий тег

Учебная работа по вёрстке: восемь карточек с воспоминаниями об обучении, фиксированный градиентный фон, CSS-фильтры, анимированные лайки и модальное окно на `<dialog>`.

Иллюстрация и геометрия иконок взяты из предоставленного PDF-макета «4 спринт. Проектная работа». Тексты основных абзацев сохранены; подписи и короткие абзацы рефлексии написаны для проекта. Все ресурсы хранятся локально, установка зависимостей для сайта не требуется.

## Запуск

Из корня репозитория:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

## Проверки

Подробная сверка требований: [CHECKLIST.md](CHECKLIST.md).

Проверены ширины 320, 360, 375, 376, 480, 768, 1024, 1280, 1440 и 1920 px, загрузка шрифтов и картинок, состояния кнопок, два цикла Like/Unlike для всех восьми карточек, клавиатурный фокус, открытие и закрытие модального окна, увеличение текста втрое и настройка уменьшения движения.

Инструменты проверки устанавливаются отдельно от сайта:

```sh
npm install --cache /tmp/closing-tag-npm-cache --prefix /tmp/closing-tag-tools --no-audit --no-fund prettier@3.6.2 html-validate@10.5.0 postcss@8.5.6 playwright@1.62.1 axe-core@4.11.0
export NODE_PATH=/tmp/closing-tag-tools/node_modules
node tests/static.cjs
/tmp/closing-tag-tools/node_modules/.bin/html-validate index.html
BASE_URL=http://127.0.0.1:8000/ node tests/smoke.cjs
BASE_URL=http://127.0.0.1:8000/ node tests/accessibility.cjs
```

Для `tests/smoke.cjs` нужен Chromium (по умолчанию `/usr/bin/chromium`). `CHROMIUM_PATH` позволяет выбрать другой исполняемый файл, `ARTIFACTS_DIR` — сохранить снимки экрана. `BROWSER=firefox` выбирает Firefox, предварительно установленный через Playwright. Для браузерного теста сервер должен быть запущен в другом терминале.

В подготовленной облачной среде Playwright уже доступен по пути `/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules`; этот путь можно добавить в `NODE_PATH` вместо установки дополнительной копии.

## Публикация

Работа отправлена в ветку `project-work`.

Исходный репозиторий: [Ibitiyus/zakrivayuschiy-teg-f](https://github.com/Ibitiyus/zakrivayuschiy-teg-f).

Сайт: [ibitiyus.github.io/zakrivayuschiy-teg-f](https://ibitiyus.github.io/zakrivayuschiy-teg-f/).

Публикация подтверждена успешным workflow GitHub Pages. Прямой HTTP-запрос к домену github.io из этой облачной среды ограничен сетевым прокси.

# Подключение API Яндекса для SEO

Интеграция работает только на backend и доступна через защищённый admin API. OAuth-токены нельзя добавлять в Git, отправлять в Telegram или объявлять переменными `NEXT_PUBLIC_*`.

## 1. Яндекс Вебмастер

1. Добавить `https://dimohod-trade.pro` в Яндекс Вебмастер и подтвердить права владельца.
2. Создать OAuth-приложение Яндекса с callback URL `https://oauth.yandex.ru/verification_code`.
3. Выдать приложению право чтения `webmaster:hostinfo`. Право `webmaster:verify` этой интеграции не требуется.
4. Получить OAuth-токен и записать его только в серверный `.env`:

```dotenv
YANDEX_OAUTH_TOKEN=...
YANDEX_WEBMASTER_HOST_URL=https://dimohod-trade.pro
```

Интеграция читает список сайтов, диагностику и статистику запросов/URL за доступный Яндексом период. Изменение сайта и подтверждения через API не выполняются.

## 2. Яндекс Метрика

Счётчик `112091795` установлен на сайте. Для чтения отчётов нужен OAuth-токен с правом `metrika:read`. Если используется общий `YANDEX_OAUTH_TOKEN`, повторять его не нужно. Для отдельного токена доступна переменная:

```dotenv
YANDEX_METRIKA_TOKEN=...
YANDEX_METRIKA_COUNTER_ID=112091795
```

## 3. Wordstat

Wordstat использует отдельный API и заголовок `Authorization: Bearer`. После создания OAuth-приложения нужно запросить доступ к API Wordstat через поддержку Яндекс Директа. До одобрения токен оставляется пустым:

```dotenv
YANDEX_WORDSTAT_TOKEN=
```

## 4. Проверка после перезапуска backend

Все адреса требуют действующую admin-сессию или заголовок `X-BOM-Admin-Token`:

```text
GET /api/v1/admin/seo/yandex/status
GET /api/v1/admin/seo/yandex/webmaster/overview
GET /api/v1/admin/seo/yandex/webmaster/queries?indicator=QUERY&limit=100
GET /api/v1/admin/seo/yandex/webmaster/queries?indicator=URL&limit=100
GET /api/v1/admin/seo/yandex/metrika/overview
GET /api/v1/admin/seo/yandex/metrika/search-phrases?date1=30daysAgo&date2=today&limit=100
```

`status` возвращает только признаки настройки и никогда не возвращает сами токены.

## 5. Практический SEO-цикл

1. Раз в неделю выгружать запросы и URL из Вебмастера.
2. Сначала улучшать страницы с показами и средней позицией 5–20: у них быстрее всего получить рост трафика.
3. Для страниц с показами и низким CTR проверять заголовок и сниппет.
4. Сопоставлять запросы Вебмастера с поисковыми фразами и заявками Метрики.
5. Менять только подтверждённые тексты: характеристики, совместимость и пожарную безопасность не придумывать.

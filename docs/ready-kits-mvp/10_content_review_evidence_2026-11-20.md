# Снимок фактов для проверки контента комплектов

Дата: 2026-11-20T07:29:51.066411+00:00. Только материал согласования. Ни один UUID, товар, состав или цена этим файлом не создаётся и не изменяется.

[Основной отчёт](08_content_review_2026-11-20.md) · [Предпросмотр ROOF-4 Ø115](09_roof4_content_preview_2026-11-20.md).

## Область и происхождение

- Источник BOM: [публичный API комплектов](https://dimohod-trade.pro/api/v1/ready-kits), SHA256 ответа `6f225920e7f45e3ca347988b49fe0a75da358e47c38ed18d722c5f0083c3191b`.
- 12 комплектов, 150 строк, 39 разных SKU. Для каждого SKU прочитан существующий Product ID из БД, не создан новый идентификатор.
- Сравнение с локальными approved/prepared: порядок строк, SKU ID, названия и количества совпали. Публичные поля диаметра, длины, принадлежности семейству, цена и активность сверены с read-only SELECT.
- Стоимость каждой строки и комплекта проверена Decimal-арифметикой. Количество, цена и результат приведены с точностью исходных денежных полей.
- Все 39 ссылок товаров проверены GET: HTTP 200; выбранный артикул найден в Product JSON-LD. URL сохраняет артикул и, когда задана, длину.
- Числа — контрольный снимок, не прайс для кодирования в шаблоне. При будущем показе необходимо заново читать актуальные цены SKU.
- Пустое поле означает отсутствие проверенного значения, а не ноль и не разрешение на подбор по фотографии.
- Инженерные выводы, конструкция строительного проёма, монтажная высота и универсальная совместимость этим снимком не подтверждаются.
- Сохранённые клиентские сметы и персональные данные не читались.

## Как читать одинаковые названия

Метровые сэндвичи Roof с внутренней стенкой 0,8 и 0,5 мм — разные SKU; обе строки сохранены. Одна универсальная консоль Wall может занимать две строки по назначению: под тройником и на фасаде. Совпадение SKU не означает, что такие строки надо объединить.

Параметры каждой строки расшифрованы в реестре SKU в конце файла. Внутренний и наружный контуры разделены; данные одной оболочки не перенесены на другие изделия.

## П1. ROOF-4 Ø115

[Страница](https://dimohod-trade.pro/komplekty/cherez-perekrytie-4m-d115) · 11 строк · 13 единиц · итог **30 452,42 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одностенная труба-разгон 1000 мм | [DT-GOLYE-09-00-D115](https://dimohod-trade.pro/product/odnostennyi-truba-d115?sku=DT-GOLYE-09-00-D115&length=1000) | `a929f1cf-3a65-4d2d-b4cb-3c99ea235f9b` | 1 | 1 992,38 | 1 992,38 |
| 2 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D115](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d115?sku=DT-GOLYE-09-11-D115) | `ebe5ab1c-a25f-422a-879a-197c69606c3f` | 1 | 2 120,14 | 2 120,14 |
| 3 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D115-215](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d115-215?sku=DT-SW50-19-11-D115-215) | `047ec56f-4ba1-4a4f-b39c-c32c20ace222` | 1 | 1 644,50 | 1 644,50 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-19-00-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-19-00-D115-215&length=1000) | `2d6f081b-698c-4918-b6bd-3bfc438b9276` | 1 | 4 680,50 | 4 680,50 |
| 5 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-00-D115-215&length=1000) | `20bd5396-4029-4e6a-b1d3-1f445f1ed7c3` | 2 | 3 798,80 | 7 597,60 |
| 6 | Стакан прохода перекрытия | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 7 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 8 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 9 | Мастер-флеш | [DT-MASTER-FLASH-2](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2) | `c73b887d-06e9-5151-99cd-5a8103d20a00` | 1 | 2 500,00 | 2 500,00 |
| 10 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D115-215](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d115-215?sku=DT-SW50-17-15-D115-215) | `d9596156-0786-4fe8-8366-6e941d09c312` | 1 | 2 913,30 | 2 913,30 |
| 11 | Хомут в перекрытие | [DT-FLOOR-CLAMP-UP-TO-D300](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300) | `4db26cb3-8511-5999-955b-4c8268d4d0a6` | 1 | 1 760,00 | 1 760,00 |

## П2. ROOF-4 Ø120

[Страница](https://dimohod-trade.pro/komplekty/cherez-perekrytie-4m-d120) · 11 строк · 13 единиц · итог **30 452,42 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одностенная труба-разгон 1000 мм | [DT-GOLYE-09-00-D120](https://dimohod-trade.pro/product/odnostennyi-truba-d120?sku=DT-GOLYE-09-00-D120&length=1000) | `035dd165-6c8e-4932-bf7f-0fead8052fec` | 1 | 1 992,38 | 1 992,38 |
| 2 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D120](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d120?sku=DT-GOLYE-09-11-D120) | `2433ee09-38fe-49e9-ae82-65807573e695` | 1 | 2 120,14 | 2 120,14 |
| 3 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D120-220](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d120-220?sku=DT-SW50-19-11-D120-220) | `96548086-b6ff-4fba-8c8e-e25198868974` | 1 | 1 644,50 | 1 644,50 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-19-00-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-19-00-D120-220&length=1000) | `37ecd6d4-5503-4dca-9cad-9e095a564956` | 1 | 4 680,50 | 4 680,50 |
| 5 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-00-D120-220&length=1000) | `6855b84c-1287-47e8-9eac-520e9de54951` | 2 | 3 798,80 | 7 597,60 |
| 6 | Стакан прохода перекрытия | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 7 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 8 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 9 | Мастер-флеш | [DT-MASTER-FLASH-2](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2) | `c73b887d-06e9-5151-99cd-5a8103d20a00` | 1 | 2 500,00 | 2 500,00 |
| 10 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D120-220](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d120-220?sku=DT-SW50-17-15-D120-220) | `233dbc76-9671-4841-91af-5d6fa5696dd1` | 1 | 2 913,30 | 2 913,30 |
| 11 | Хомут в перекрытие | [DT-FLOOR-CLAMP-UP-TO-D300](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300) | `4db26cb3-8511-5999-955b-4c8268d4d0a6` | 1 | 1 760,00 | 1 760,00 |

## П3. ROOF-4 Ø150

[Страница](https://dimohod-trade.pro/komplekty/cherez-perekrytie-4m-d150) · 11 строк · 13 единиц · итог **35 024,12 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одностенная труба-разгон 1000 мм | [DT-GOLYE-09-00-D150](https://dimohod-trade.pro/product/odnostennyi-truba-d150?sku=DT-GOLYE-09-00-D150&length=1000) | `1714ce00-4923-4f8f-a8cd-e311619029a5` | 1 | 2 493,32 | 2 493,32 |
| 2 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D150](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d150?sku=DT-GOLYE-09-11-D150) | `b1ad6de5-cab9-4197-b4ad-8920f9ed6fc0` | 1 | 2 338,98 | 2 338,98 |
| 3 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D150-250](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d150-250?sku=DT-SW50-19-11-D150-250) | `24ee4e5d-185f-405f-b9c9-65ca07d1751f` | 1 | 2 044,24 | 2 044,24 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-19-00-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-19-00-D150-250&length=1000) | `997b5f41-64eb-4c73-a06f-5a4c2a0fc925` | 1 | 5 615,34 | 5 615,34 |
| 5 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-00-D150-250&length=1000) | `2c0327f8-f48b-498e-b644-54a6324f0fcf` | 2 | 4 617,25 | 9 234,50 |
| 6 | Стакан прохода перекрытия | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 7 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 8 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 9 | Мастер-флеш | [DT-MASTER-FLASH-2](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2) | `c73b887d-06e9-5151-99cd-5a8103d20a00` | 1 | 2 500,00 | 2 500,00 |
| 10 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D150-250](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d150-250?sku=DT-SW50-17-15-D150-250) | `6fc853b0-ffa0-49df-b58c-d5edfab5919d` | 1 | 3 793,74 | 3 793,74 |
| 11 | Хомут в перекрытие | [DT-FLOOR-CLAMP-UP-TO-D300](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300) | `4db26cb3-8511-5999-955b-4c8268d4d0a6` | 1 | 1 760,00 | 1 760,00 |

## П4. ROOF-6 Ø115

[Страница](https://dimohod-trade.pro/komplekty/cherez-perekrytie-6m-d115) · 11 строк · 20 единиц · итог **47 092,82 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одностенная труба-разгон 1000 мм | [DT-GOLYE-09-00-D115](https://dimohod-trade.pro/product/odnostennyi-truba-d115?sku=DT-GOLYE-09-00-D115&length=1000) | `a929f1cf-3a65-4d2d-b4cb-3c99ea235f9b` | 1 | 1 992,38 | 1 992,38 |
| 2 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D115](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d115?sku=DT-GOLYE-09-11-D115) | `ebe5ab1c-a25f-422a-879a-197c69606c3f` | 1 | 2 120,14 | 2 120,14 |
| 3 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D115-215](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d115-215?sku=DT-SW50-19-11-D115-215) | `047ec56f-4ba1-4a4f-b39c-c32c20ace222` | 1 | 1 644,50 | 1 644,50 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-19-00-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-19-00-D115-215&length=1000) | `2d6f081b-698c-4918-b6bd-3bfc438b9276` | 1 | 4 680,50 | 4 680,50 |
| 5 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-00-D115-215&length=1000) | `20bd5396-4029-4e6a-b1d3-1f445f1ed7c3` | 5 | 3 798,80 | 18 994,00 |
| 6 | Стакан прохода перекрытия | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 2 | 600,00 | 1 200,00 |
| 7 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 2 | 1 300,00 | 2 600,00 |
| 8 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 4 | 1 672,00 | 6 688,00 |
| 9 | Хомут в перекрытие | [DT-FLOOR-CLAMP-UP-TO-D300](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300) | `4db26cb3-8511-5999-955b-4c8268d4d0a6` | 1 | 1 760,00 | 1 760,00 |
| 10 | Мастер-флеш | [DT-MASTER-FLASH-2](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2) | `c73b887d-06e9-5151-99cd-5a8103d20a00` | 1 | 2 500,00 | 2 500,00 |
| 11 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D115-215](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d115-215?sku=DT-SW50-17-15-D115-215) | `d9596156-0786-4fe8-8366-6e941d09c312` | 1 | 2 913,30 | 2 913,30 |

## П5. ROOF-6 Ø120

[Страница](https://dimohod-trade.pro/komplekty/cherez-perekrytie-6m-d120) · 11 строк · 20 единиц · итог **47 092,82 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одностенная труба-разгон 1000 мм | [DT-GOLYE-09-00-D120](https://dimohod-trade.pro/product/odnostennyi-truba-d120?sku=DT-GOLYE-09-00-D120&length=1000) | `035dd165-6c8e-4932-bf7f-0fead8052fec` | 1 | 1 992,38 | 1 992,38 |
| 2 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D120](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d120?sku=DT-GOLYE-09-11-D120) | `2433ee09-38fe-49e9-ae82-65807573e695` | 1 | 2 120,14 | 2 120,14 |
| 3 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D120-220](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d120-220?sku=DT-SW50-19-11-D120-220) | `96548086-b6ff-4fba-8c8e-e25198868974` | 1 | 1 644,50 | 1 644,50 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-19-00-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-19-00-D120-220&length=1000) | `37ecd6d4-5503-4dca-9cad-9e095a564956` | 1 | 4 680,50 | 4 680,50 |
| 5 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-00-D120-220&length=1000) | `6855b84c-1287-47e8-9eac-520e9de54951` | 5 | 3 798,80 | 18 994,00 |
| 6 | Стакан прохода перекрытия | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 2 | 600,00 | 1 200,00 |
| 7 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 2 | 1 300,00 | 2 600,00 |
| 8 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 4 | 1 672,00 | 6 688,00 |
| 9 | Хомут в перекрытие | [DT-FLOOR-CLAMP-UP-TO-D300](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300) | `4db26cb3-8511-5999-955b-4c8268d4d0a6` | 1 | 1 760,00 | 1 760,00 |
| 10 | Мастер-флеш | [DT-MASTER-FLASH-2](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2) | `c73b887d-06e9-5151-99cd-5a8103d20a00` | 1 | 2 500,00 | 2 500,00 |
| 11 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D120-220](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d120-220?sku=DT-SW50-17-15-D120-220) | `233dbc76-9671-4841-91af-5d6fa5696dd1` | 1 | 2 913,30 | 2 913,30 |

## П6. ROOF-6 Ø150

[Страница](https://dimohod-trade.pro/komplekty/cherez-perekrytie-6m-d150) · 11 строк · 20 единиц · итог **54 119,87 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одностенная труба-разгон 1000 мм | [DT-GOLYE-09-00-D150](https://dimohod-trade.pro/product/odnostennyi-truba-d150?sku=DT-GOLYE-09-00-D150&length=1000) | `1714ce00-4923-4f8f-a8cd-e311619029a5` | 1 | 2 493,32 | 2 493,32 |
| 2 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D150](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d150?sku=DT-GOLYE-09-11-D150) | `b1ad6de5-cab9-4197-b4ad-8920f9ed6fc0` | 1 | 2 338,98 | 2 338,98 |
| 3 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D150-250](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d150-250?sku=DT-SW50-19-11-D150-250) | `24ee4e5d-185f-405f-b9c9-65ca07d1751f` | 1 | 2 044,24 | 2 044,24 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-19-00-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-19-00-D150-250&length=1000) | `997b5f41-64eb-4c73-a06f-5a4c2a0fc925` | 1 | 5 615,34 | 5 615,34 |
| 5 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-00-D150-250&length=1000) | `2c0327f8-f48b-498e-b644-54a6324f0fcf` | 5 | 4 617,25 | 23 086,25 |
| 6 | Стакан прохода перекрытия | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 2 | 600,00 | 1 200,00 |
| 7 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 2 | 1 300,00 | 2 600,00 |
| 8 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 4 | 1 672,00 | 6 688,00 |
| 9 | Хомут в перекрытие | [DT-FLOOR-CLAMP-UP-TO-D300](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300) | `4db26cb3-8511-5999-955b-4c8268d4d0a6` | 1 | 1 760,00 | 1 760,00 |
| 10 | Мастер-флеш | [DT-MASTER-FLASH-2](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2) | `c73b887d-06e9-5151-99cd-5a8103d20a00` | 1 | 2 500,00 | 2 500,00 |
| 11 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D150-250](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d150-250?sku=DT-SW50-17-15-D150-250) | `6fc853b0-ffa0-49df-b58c-d5edfab5919d` | 1 | 3 793,74 | 3 793,74 |

## П7. WALL-3 Ø115

[Страница](https://dimohod-trade.pro/komplekty/cherez-stenu-3m-d115) · 14 строк · 17 единиц · итог **46 090,30 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D115](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d115?sku=DT-GOLYE-09-11-D115) | `ebe5ab1c-a25f-422a-879a-197c69606c3f` | 1 | 2 120,14 | 2 120,14 |
| 2 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D115-215](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d115-215?sku=DT-SW50-19-11-D115-215) | `047ec56f-4ba1-4a4f-b39c-c32c20ace222` | 1 | 1 644,50 | 1 644,50 |
| 3 | Сэндвич-труба | [DT-SW50-19-01-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-19-01-D115-215&length=750) | `57a4eff5-1d1c-4a6e-bee7-7bc97b410156` | 1 | 4 048,00 | 4 048,00 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-00-D115-215&length=1000) | `20bd5396-4029-4e6a-b1d3-1f445f1ed7c3` | 3 | 3 798,80 | 11 396,40 |
| 5 | Стакан прохода стены | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 6 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 7 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 8 | Сэндвич-тройник с К/О 90° | [DT-SW50-19-08-D115-215](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d115-215?sku=DT-SW50-19-08-D115-215) | `7600882e-22c9-49ea-bf76-a11703698ccf` | 1 | 6 536,26 | 6 536,26 |
| 9 | Сэндвич-труба под тройник 250 мм | [DT-SW50-17-04-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-04-D115-215&length=250) | `72be50f5-da1b-4df7-83a0-0c2de102ad8e` | 1 | 1 850,70 | 1 850,70 |
| 10 | Сэндвич-опорная площадка | [DT-SUPPORT-PLATFORM-304-430-D115-215](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d115-215?sku=DT-SUPPORT-PLATFORM-304-430-D115-215) | `4c2aa180-6af5-4e74-bbd5-f1c67bf34b5c` | 1 | 3 438,00 | 3 438,00 |
| 11 | Консоль универсальная под тройник | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 12 | Консоль универсальная фасадная | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 13 | Хомут силовой для консоли | [DT-GOLYE-05-14-D215](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d215?sku=DT-GOLYE-05-14-D215) | `a226d61b-94c1-428a-9af8-1cdf0e89894f` | 1 | 899,00 | 899,00 |
| 14 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D115-215](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d115-215?sku=DT-SW50-17-15-D115-215) | `d9596156-0786-4fe8-8366-6e941d09c312` | 1 | 2 913,30 | 2 913,30 |

## П8. WALL-3 Ø120

[Страница](https://dimohod-trade.pro/komplekty/cherez-stenu-3m-d120) · 14 строк · 17 единиц · итог **46 090,30 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D120](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d120?sku=DT-GOLYE-09-11-D120) | `2433ee09-38fe-49e9-ae82-65807573e695` | 1 | 2 120,14 | 2 120,14 |
| 2 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D120-220](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d120-220?sku=DT-SW50-19-11-D120-220) | `96548086-b6ff-4fba-8c8e-e25198868974` | 1 | 1 644,50 | 1 644,50 |
| 3 | Сэндвич-труба | [DT-SW50-19-01-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-19-01-D120-220&length=750) | `e10b0391-1fcf-4ec8-917d-a56aca22ddc1` | 1 | 4 048,00 | 4 048,00 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-00-D120-220&length=1000) | `6855b84c-1287-47e8-9eac-520e9de54951` | 3 | 3 798,80 | 11 396,40 |
| 5 | Стакан прохода стены | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 6 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 7 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 8 | Сэндвич-тройник с К/О 90° | [DT-SW50-19-08-D120-220](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d120-220?sku=DT-SW50-19-08-D120-220) | `9cab77a6-c94c-476e-90aa-839f5aed0372` | 1 | 6 536,26 | 6 536,26 |
| 9 | Сэндвич-труба под тройник 250 мм | [DT-SW50-17-04-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-04-D120-220&length=250) | `6dab5cd3-1e1f-4748-93fb-6c934775df9e` | 1 | 1 850,70 | 1 850,70 |
| 10 | Сэндвич-опорная площадка | [DT-SUPPORT-PLATFORM-304-430-D120-220](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d120-220?sku=DT-SUPPORT-PLATFORM-304-430-D120-220) | `94b86d30-1cf5-5e1a-ba59-c97c381ab352` | 1 | 3 438,00 | 3 438,00 |
| 11 | Консоль универсальная под тройник | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 12 | Консоль универсальная фасадная | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 13 | Хомут силовой для консоли | [DT-GOLYE-05-14-D220](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d220?sku=DT-GOLYE-05-14-D220) | `3f9730f4-80e1-4f27-ac4f-b1249b56f93f` | 1 | 899,00 | 899,00 |
| 14 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D120-220](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d120-220?sku=DT-SW50-17-15-D120-220) | `233dbc76-9671-4841-91af-5d6fa5696dd1` | 1 | 2 913,30 | 2 913,30 |

## П9. WALL-3 Ø150

[Страница](https://dimohod-trade.pro/komplekty/cherez-stenu-3m-d150) · 14 строк · 17 единиц · итог **52 740,73 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D150](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d150?sku=DT-GOLYE-09-11-D150) | `b1ad6de5-cab9-4197-b4ad-8920f9ed6fc0` | 1 | 2 338,98 | 2 338,98 |
| 2 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D150-250](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d150-250?sku=DT-SW50-19-11-D150-250) | `24ee4e5d-185f-405f-b9c9-65ca07d1751f` | 1 | 2 044,24 | 2 044,24 |
| 3 | Сэндвич-труба | [DT-SW50-19-01-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-19-01-D150-250&length=750) | `69c6e55e-afa3-43cb-8726-c0fb0c513e52` | 1 | 4 671,64 | 4 671,64 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-00-D150-250&length=1000) | `2c0327f8-f48b-498e-b644-54a6324f0fcf` | 3 | 4 617,25 | 13 851,75 |
| 5 | Стакан прохода стены | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 6 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 7 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 8 | Сэндвич-тройник с К/О 90° | [DT-SW50-19-08-D150-250](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d150-250?sku=DT-SW50-19-08-D150-250) | `d5a6046b-3fb8-41a8-ac11-d22e4019362b` | 1 | 7 879,68 | 7 879,68 |
| 9 | Сэндвич-труба под тройник 250 мм | [DT-SW50-17-04-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-04-D150-250&length=250) | `9627dcf4-ea6d-4ff6-9337-d65db100ecd4` | 1 | 2 146,70 | 2 146,70 |
| 10 | Сэндвич-опорная площадка | [DT-SUPPORT-PLATFORM-304-430-D150-250](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d150-250?sku=DT-SUPPORT-PLATFORM-304-430-D150-250) | `d28eb196-8633-5b55-8ad9-28c53be5e8d9` | 1 | 3 769,00 | 3 769,00 |
| 11 | Консоль универсальная под тройник | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 12 | Консоль универсальная фасадная | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 13 | Хомут силовой для консоли | [DT-GOLYE-05-14-D250](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d250?sku=DT-GOLYE-05-14-D250) | `dd3b9964-d66c-494a-b01c-87ddb4ebb200` | 1 | 1 001,00 | 1 001,00 |
| 14 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D150-250](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d150-250?sku=DT-SW50-17-15-D150-250) | `6fc853b0-ffa0-49df-b58c-d5edfab5919d` | 1 | 3 793,74 | 3 793,74 |

## П10. WALL-6 Ø115

[Страница](https://dimohod-trade.pro/komplekty/cherez-stenu-6m-d115) · 14 строк · 22 единиц · итог **61 385,70 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D115](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d115?sku=DT-GOLYE-09-11-D115) | `ebe5ab1c-a25f-422a-879a-197c69606c3f` | 1 | 2 120,14 | 2 120,14 |
| 2 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D115-215](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d115-215?sku=DT-SW50-19-11-D115-215) | `047ec56f-4ba1-4a4f-b39c-c32c20ace222` | 1 | 1 644,50 | 1 644,50 |
| 3 | Сэндвич-труба | [DT-SW50-19-01-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-19-01-D115-215&length=750) | `57a4eff5-1d1c-4a6e-bee7-7bc97b410156` | 1 | 4 048,00 | 4 048,00 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-00-D115-215&length=1000) | `20bd5396-4029-4e6a-b1d3-1f445f1ed7c3` | 6 | 3 798,80 | 22 792,80 |
| 5 | Стакан прохода стены | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 6 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 7 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 8 | Сэндвич-тройник с К/О 90° | [DT-SW50-19-08-D115-215](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d115-215?sku=DT-SW50-19-08-D115-215) | `7600882e-22c9-49ea-bf76-a11703698ccf` | 1 | 6 536,26 | 6 536,26 |
| 9 | Сэндвич-труба под тройник 250 мм | [DT-SW50-17-04-D115-215](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-04-D115-215&length=250) | `72be50f5-da1b-4df7-83a0-0c2de102ad8e` | 1 | 1 850,70 | 1 850,70 |
| 10 | Сэндвич-опорная площадка | [DT-SUPPORT-PLATFORM-304-430-D115-215](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d115-215?sku=DT-SUPPORT-PLATFORM-304-430-D115-215) | `4c2aa180-6af5-4e74-bbd5-f1c67bf34b5c` | 1 | 3 438,00 | 3 438,00 |
| 11 | Консоль универсальная под тройник | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 12 | Консоль универсальная фасадная | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 2 | 3 000,00 | 6 000,00 |
| 13 | Хомут силовой для консоли | [DT-GOLYE-05-14-D215](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d215?sku=DT-GOLYE-05-14-D215) | `a226d61b-94c1-428a-9af8-1cdf0e89894f` | 2 | 899,00 | 1 798,00 |
| 14 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D115-215](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d115-215?sku=DT-SW50-17-15-D115-215) | `d9596156-0786-4fe8-8366-6e941d09c312` | 1 | 2 913,30 | 2 913,30 |

## П11. WALL-6 Ø120

[Страница](https://dimohod-trade.pro/komplekty/cherez-stenu-6m-d120) · 14 строк · 22 единиц · итог **61 385,70 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D120](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d120?sku=DT-GOLYE-09-11-D120) | `2433ee09-38fe-49e9-ae82-65807573e695` | 1 | 2 120,14 | 2 120,14 |
| 2 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D120-220](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d120-220?sku=DT-SW50-19-11-D120-220) | `96548086-b6ff-4fba-8c8e-e25198868974` | 1 | 1 644,50 | 1 644,50 |
| 3 | Сэндвич-труба | [DT-SW50-19-01-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-19-01-D120-220&length=750) | `e10b0391-1fcf-4ec8-917d-a56aca22ddc1` | 1 | 4 048,00 | 4 048,00 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-00-D120-220&length=1000) | `6855b84c-1287-47e8-9eac-520e9de54951` | 6 | 3 798,80 | 22 792,80 |
| 5 | Стакан прохода стены | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 6 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 7 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 8 | Сэндвич-тройник с К/О 90° | [DT-SW50-19-08-D120-220](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d120-220?sku=DT-SW50-19-08-D120-220) | `9cab77a6-c94c-476e-90aa-839f5aed0372` | 1 | 6 536,26 | 6 536,26 |
| 9 | Сэндвич-труба под тройник 250 мм | [DT-SW50-17-04-D120-220](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-04-D120-220&length=250) | `6dab5cd3-1e1f-4748-93fb-6c934775df9e` | 1 | 1 850,70 | 1 850,70 |
| 10 | Сэндвич-опорная площадка | [DT-SUPPORT-PLATFORM-304-430-D120-220](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d120-220?sku=DT-SUPPORT-PLATFORM-304-430-D120-220) | `94b86d30-1cf5-5e1a-ba59-c97c381ab352` | 1 | 3 438,00 | 3 438,00 |
| 11 | Консоль универсальная под тройник | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 12 | Консоль универсальная фасадная | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 2 | 3 000,00 | 6 000,00 |
| 13 | Хомут силовой для консоли | [DT-GOLYE-05-14-D220](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d220?sku=DT-GOLYE-05-14-D220) | `3f9730f4-80e1-4f27-ac4f-b1249b56f93f` | 2 | 899,00 | 1 798,00 |
| 14 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D120-220](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d120-220?sku=DT-SW50-17-15-D120-220) | `233dbc76-9671-4841-91af-5d6fa5696dd1` | 1 | 2 913,30 | 2 913,30 |

## П12. WALL-6 Ø150

[Страница](https://dimohod-trade.pro/komplekty/cherez-stenu-6m-d150) · 14 строк · 22 единиц · итог **70 593,48 ₽**.

| № | Название строки | Артикул / выбранный товар | SKU ID | Количество | Цена, ₽ | Сумма, ₽ |
|---|---|---|---|---:|---:|---:|
| 1 | Одноконтурный шибер поворотный | [DT-GOLYE-09-11-D150](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d150?sku=DT-GOLYE-09-11-D150) | `b1ad6de5-cab9-4197-b4ad-8920f9ed6fc0` | 1 | 2 338,98 | 2 338,98 |
| 2 | Сэндвич-заглушка опорная | [DT-SW50-19-11-D150-250](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d150-250?sku=DT-SW50-19-11-D150-250) | `24ee4e5d-185f-405f-b9c9-65ca07d1751f` | 1 | 2 044,24 | 2 044,24 |
| 3 | Сэндвич-труба | [DT-SW50-19-01-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-19-01-D150-250&length=750) | `69c6e55e-afa3-43cb-8726-c0fb0c513e52` | 1 | 4 671,64 | 4 671,64 |
| 4 | Сэндвич-труба 1000 мм | [DT-SW50-17-00-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-00-D150-250&length=1000) | `2c0327f8-f48b-498e-b644-54a6324f0fcf` | 6 | 4 617,25 | 27 703,50 |
| 5 | Стакан прохода стены | [DT-PASSAGE-GLASS-GALV-D100-200](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200) | `767e3b91-c393-5e51-932c-cd5ed853c70e` | 1 | 600,00 | 600,00 |
| 6 | Комплект ваты для проходных узлов | [DT-PASSAGE-WOOL-KIT](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT) | `7b0814ee-b434-5d8e-98f9-f43d90a561c4` | 1 | 1 300,00 | 1 300,00 |
| 7 | Фланец проходного узла 600×600 мм, AISI 430 | [DT-FLANGE-430-STRAIGHT-600X600](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600) | `2a1a062b-4088-5551-8a7d-32f425d0d9eb` | 2 | 1 672,00 | 3 344,00 |
| 8 | Сэндвич-тройник с К/О 90° | [DT-SW50-19-08-D150-250](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d150-250?sku=DT-SW50-19-08-D150-250) | `d5a6046b-3fb8-41a8-ac11-d22e4019362b` | 1 | 7 879,68 | 7 879,68 |
| 9 | Сэндвич-труба под тройник 250 мм | [DT-SW50-17-04-D150-250](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-04-D150-250&length=250) | `9627dcf4-ea6d-4ff6-9337-d65db100ecd4` | 1 | 2 146,70 | 2 146,70 |
| 10 | Сэндвич-опорная площадка | [DT-SUPPORT-PLATFORM-304-430-D150-250](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d150-250?sku=DT-SUPPORT-PLATFORM-304-430-D150-250) | `d28eb196-8633-5b55-8ad9-28c53be5e8d9` | 1 | 3 769,00 | 3 769,00 |
| 11 | Консоль универсальная под тройник | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 1 | 3 000,00 | 3 000,00 |
| 12 | Консоль универсальная фасадная | [DT-CONSOLE-UNIVERSAL-930-D350](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350) | `dfa8701a-9fa2-5e9c-89b0-49873ad669cf` | 2 | 3 000,00 | 6 000,00 |
| 13 | Хомут силовой для консоли | [DT-GOLYE-05-14-D250](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d250?sku=DT-GOLYE-05-14-D250) | `dd3b9964-d66c-494a-b01c-87ddb4ebb200` | 2 | 1 001,00 | 2 002,00 |
| 14 | Сэндвич-дефлектор-конус | [DT-SW50-17-15-D150-250](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d150-250?sku=DT-SW50-17-15-D150-250) | `6fc853b0-ffa0-49df-b58c-d5edfab5919d` | 1 | 3 793,74 | 3 793,74 |

## Реестр 39 проверенных SKU

Поля d/D/L и толщины приведены из SKU. Названия групп и наружные параметры — из проверенного ответа API, сформированного штатным presentation-helper на данных выбранного исполнения. Это каталожные факты, не паспорт монтажа.

### DT-CONSOLE-UNIVERSAL-930-D350

Консоль универсальная до 930 мм, до D350

- SKU ID: `dfa8701a-9fa2-5e9c-89b0-49873ad669cf`; Product ID: `a4336fa2-6385-5fe5-83fb-d16fe7eb9d96`.
- Семейство: `konsol-universalnaya`; тип: консоль; материал: не указан.
- Поля SKU: d, мм: не указано; D, мм: не указано; L, мм: не указано; сталь: не указано; S внутренней/одностенной, мм: не указано; изоляция, мм: не указано; угол, °: не указано.
- Цена: 3 000,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/konsol-universalnaya?sku=DT-CONSOLE-UNIVERSAL-930-D350): HTTP 200; Product JSON-LD содержит `DT-CONSOLE-UNIVERSAL-930-D350`.
- Параметры: Диапазон — до D350.

### DT-FLANGE-430-STRAIGHT-600X600

Фланец декоративный 600×600 мм, прямой, AISI 430

- SKU ID: `2a1a062b-4088-5551-8a7d-32f425d0d9eb`; Product ID: `d8adc904-82ff-5c1e-b418-1a41983fc236`.
- Семейство: `flanets-dekorativnyy`; тип: фланец; материал: нержавеющая сталь.
- Поля SKU: d, мм: не указано; D, мм: не указано; L, мм: не указано; сталь: AISI 430; S внутренней/одностенной, мм: не указано; изоляция, мм: не указано; угол, °: не указано.
- Цена: 1 672,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/flanets-dekorativnyy?sku=DT-FLANGE-430-STRAIGHT-600X600): HTTP 200; Product JSON-LD содержит `DT-FLANGE-430-STRAIGHT-600X600`.
- Параметры: Материал — нержавеющая сталь; Сталь — AISI 430; Основание — 600×600 мм; Исполнение — Прямой.

### DT-FLOOR-CLAMP-UP-TO-D300

Хомут в перекрытие, до D300

- SKU ID: `4db26cb3-8511-5999-955b-4c8268d4d0a6`; Product ID: `ee2eb7ac-20b0-5b3e-80b7-df2ed70bbf8e`.
- Семейство: `homut-v-perekrytie`; тип: крепеж; материал: не указан.
- Поля SKU: d, мм: не указано; D, мм: не указано; L, мм: не указано; сталь: не указано; S внутренней/одностенной, мм: не указано; изоляция, мм: не указано; угол, °: не указано.
- Цена: 1 760,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/homut-v-perekrytie?sku=DT-FLOOR-CLAMP-UP-TO-D300): HTTP 200; Product JSON-LD содержит `DT-FLOOR-CLAMP-UP-TO-D300`.
- Параметры: Диапазон — до D300.

### DT-GOLYE-05-14-D215

Хомут силовой, Ø215, AISI 430, 0.8 мм

- SKU ID: `a226d61b-94c1-428a-9af8-1cdf0e89894f`; Product ID: `ca05d31c-082a-412c-bbb8-a1908765c809`.
- Семейство: `odnostennyi-krepezh-homut-silovoi`; тип: крепеж; материал: нержавеющая сталь.
- Поля SKU: d, мм: 215; D, мм: не указано; L, мм: не указано; сталь: AISI 430; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 899,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d215?sku=DT-GOLYE-05-14-D215): HTTP 200; Product JSON-LD содержит `DT-GOLYE-05-14-D215`.
- Параметры: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,8 мм.

### DT-GOLYE-05-14-D220

Хомут силовой, Ø220, AISI 430, 0.8 мм

- SKU ID: `3f9730f4-80e1-4f27-ac4f-b1249b56f93f`; Product ID: `ca05d31c-082a-412c-bbb8-a1908765c809`.
- Семейство: `odnostennyi-krepezh-homut-silovoi`; тип: крепеж; материал: нержавеющая сталь.
- Поля SKU: d, мм: 220; D, мм: не указано; L, мм: не указано; сталь: AISI 430; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 899,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d220?sku=DT-GOLYE-05-14-D220): HTTP 200; Product JSON-LD содержит `DT-GOLYE-05-14-D220`.
- Параметры: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,8 мм.

### DT-GOLYE-05-14-D250

Хомут силовой, Ø250, AISI 430, 0.8 мм

- SKU ID: `dd3b9964-d66c-494a-b01c-87ddb4ebb200`; Product ID: `ca05d31c-082a-412c-bbb8-a1908765c809`.
- Семейство: `odnostennyi-krepezh-homut-silovoi`; тип: крепеж; материал: нержавеющая сталь.
- Поля SKU: d, мм: 250; D, мм: не указано; L, мм: не указано; сталь: AISI 430; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 1 001,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-krepezh-homut-silovoi-d250?sku=DT-GOLYE-05-14-D250): HTTP 200; Product JSON-LD содержит `DT-GOLYE-05-14-D250`.
- Параметры: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,8 мм.

### DT-GOLYE-09-00-D115

ТрубаL=1000 мм, Ø115, AISI 304, 0.8 мм

- SKU ID: `a929f1cf-3a65-4d2d-b4cb-3c99ea235f9b`; Product ID: `b997ec77-1c59-46d1-b105-c154d639d76a`.
- Семейство: `odnostennyi-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: не указано; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 1 992,38 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-truba-d115?sku=DT-GOLYE-09-00-D115&length=1000): HTTP 200; Product JSON-LD содержит `DT-GOLYE-09-00-D115`.
- Параметры: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм; Длина — 1000 мм.

### DT-GOLYE-09-00-D120

ТрубаL=1000 мм, Ø120, AISI 304, 0.8 мм

- SKU ID: `035dd165-6c8e-4932-bf7f-0fead8052fec`; Product ID: `b997ec77-1c59-46d1-b105-c154d639d76a`.
- Семейство: `odnostennyi-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: не указано; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 1 992,38 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-truba-d120?sku=DT-GOLYE-09-00-D120&length=1000): HTTP 200; Product JSON-LD содержит `DT-GOLYE-09-00-D120`.
- Параметры: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм; Длина — 1000 мм.

### DT-GOLYE-09-00-D150

ТрубаL=1000 мм, Ø150, AISI 304, 0.8 мм

- SKU ID: `1714ce00-4923-4f8f-a8cd-e311619029a5`; Product ID: `b997ec77-1c59-46d1-b105-c154d639d76a`.
- Семейство: `odnostennyi-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: не указано; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 2 493,32 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-truba-d150?sku=DT-GOLYE-09-00-D150&length=1000): HTTP 200; Product JSON-LD содержит `DT-GOLYE-09-00-D150`.
- Параметры: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм; Длина — 1000 мм.

### DT-GOLYE-09-11-D115

Шибер поворотный, Ø115, AISI 304, 0.8 мм

- SKU ID: `ebe5ab1c-a25f-422a-879a-197c69606c3f`; Product ID: `845b02db-85f8-4ca9-a1d0-ff65c8b0c822`.
- Семейство: `odnostennyi-shiber-povorotnyi`; тип: шибер; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: не указано; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 2 120,14 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d115?sku=DT-GOLYE-09-11-D115): HTTP 200; Product JSON-LD содержит `DT-GOLYE-09-11-D115`.
- Параметры: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.

### DT-GOLYE-09-11-D120

Шибер поворотный, Ø120, AISI 304, 0.8 мм

- SKU ID: `2433ee09-38fe-49e9-ae82-65807573e695`; Product ID: `845b02db-85f8-4ca9-a1d0-ff65c8b0c822`.
- Семейство: `odnostennyi-shiber-povorotnyi`; тип: шибер; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: не указано; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 2 120,14 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d120?sku=DT-GOLYE-09-11-D120): HTTP 200; Product JSON-LD содержит `DT-GOLYE-09-11-D120`.
- Параметры: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.

### DT-GOLYE-09-11-D150

Шибер поворотный, Ø150, AISI 304, 0.8 мм

- SKU ID: `b1ad6de5-cab9-4197-b4ad-8920f9ed6fc0`; Product ID: `845b02db-85f8-4ca9-a1d0-ff65c8b0c822`.
- Семейство: `odnostennyi-shiber-povorotnyi`; тип: шибер; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: не указано; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: не указано; угол, °: не указано.
- Цена: 2 338,98 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/odnostennyi-shiber-povorotnyi-d150?sku=DT-GOLYE-09-11-D150): HTTP 200; Product JSON-LD содержит `DT-GOLYE-09-11-D150`.
- Параметры: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.

### DT-MASTER-FLASH-2

Мастер-флеш №2

- SKU ID: `c73b887d-06e9-5151-99cd-5a8103d20a00`; Product ID: `89aa8bfb-3530-5472-964f-926383765242`.
- Семейство: `master-flesh`; тип: проходной_узел; материал: не указан.
- Поля SKU: d, мм: не указано; D, мм: не указано; L, мм: не указано; сталь: не указано; S внутренней/одностенной, мм: не указано; изоляция, мм: не указано; угол, °: не указано.
- Цена: 2 500,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/master-flesh?sku=DT-MASTER-FLASH-2): HTTP 200; Product JSON-LD содержит `DT-MASTER-FLASH-2`.
- Развёрнутые группы параметров не заполнены.

### DT-PASSAGE-GLASS-GALV-D100-200

Проходной стакан 500×500 мм, гильза Ø400 мм, труба Ø100–200 мм, оцинковка

- SKU ID: `767e3b91-c393-5e51-932c-cd5ed853c70e`; Product ID: `c02e6c69-7365-555f-a735-96c9a67a6a6d`.
- Семейство: `prohodnoy-stakan`; тип: проходной_узел; материал: Оцинкованная сталь.
- Поля SKU: d, мм: не указано; D, мм: не указано; L, мм: не указано; сталь: не указано; S внутренней/одностенной, мм: не указано; изоляция, мм: не указано; угол, °: не указано.
- Цена: 600,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/prohodnoy-stakan?sku=DT-PASSAGE-GLASS-GALV-D100-200): HTTP 200; Product JSON-LD содержит `DT-PASSAGE-GLASS-GALV-D100-200`.
- Параметры: Материал — Оцинкованная сталь; Основание — 500×500 мм; Диапазон — 100–200 мм.

### DT-PASSAGE-WOOL-KIT

Комплект ваты для проходного стакана

- SKU ID: `7b0814ee-b434-5d8e-98f9-f43d90a561c4`; Product ID: `e839eee6-62c5-545e-93c0-6f7957351aa1`.
- Семейство: `komplekt-vaty-dlya-prohodnogo-stakana`; тип: изоляция; материал: не указан.
- Поля SKU: d, мм: не указано; D, мм: не указано; L, мм: не указано; сталь: не указано; S внутренней/одностенной, мм: не указано; изоляция, мм: не указано; угол, °: не указано.
- Цена: 1 300,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/komplekt-vaty-dlya-prohodnogo-stakana?sku=DT-PASSAGE-WOOL-KIT): HTTP 200; Product JSON-LD содержит `DT-PASSAGE-WOOL-KIT`.
- Развёрнутые группы параметров не заполнены.

### DT-SUPPORT-PLATFORM-304-430-D115-215

Сэндвич-опорная площадка Ø115/215, AISI 304 0.5 мм / AISI 430 0.8 мм

- SKU ID: `4c2aa180-6af5-4e74-bbd5-f1c67bf34b5c`; Product ID: `c75acd2b-f7f7-5e65-9a2a-dbd6a8bd33fe`.
- Семейство: `sendvich-opornaya-ploschadka`; тип: опорная_площадка; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 3 438,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d115-215?sku=DT-SUPPORT-PLATFORM-304-430-D115-215): HTTP 200; Product JSON-LD содержит `DT-SUPPORT-PLATFORM-304-430-D115-215`.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,8 мм.

### DT-SUPPORT-PLATFORM-304-430-D120-220

Сэндвич-опорная площадка Ø120/220, AISI 304 0.5 мм / AISI 430 0.8 мм

- SKU ID: `94b86d30-1cf5-5e1a-ba59-c97c381ab352`; Product ID: `c75acd2b-f7f7-5e65-9a2a-dbd6a8bd33fe`.
- Семейство: `sendvich-opornaya-ploschadka`; тип: опорная_площадка; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 3 438,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d120-220?sku=DT-SUPPORT-PLATFORM-304-430-D120-220): HTTP 200; Product JSON-LD содержит `DT-SUPPORT-PLATFORM-304-430-D120-220`.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,8 мм.

### DT-SUPPORT-PLATFORM-304-430-D150-250

Сэндвич-опорная площадка Ø150/250, AISI 304 0.5 мм / AISI 430 0.8 мм

- SKU ID: `d28eb196-8633-5b55-8ad9-28c53be5e8d9`; Product ID: `c75acd2b-f7f7-5e65-9a2a-dbd6a8bd33fe`.
- Семейство: `sendvich-opornaya-ploschadka`; тип: опорная_площадка; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 3 769,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-opornaya-ploschadka-d150-250?sku=DT-SUPPORT-PLATFORM-304-430-D150-250): HTTP 200; Product JSON-LD содержит `DT-SUPPORT-PLATFORM-304-430-D150-250`.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,8 мм.

### DT-SW50-17-00-D115-215

Труба L=1000мм, Ø115/215, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `20bd5396-4029-4e6a-b1d3-1f445f1ed7c3`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 3 798,80 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-00-D115-215&length=1000): HTTP 200; Product JSON-LD содержит `DT-SW50-17-00-D115-215`.
- Параметры: Длина — 1000 мм.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-00-D120-220

Труба L=1000мм, Ø120/220, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `6855b84c-1287-47e8-9eac-520e9de54951`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 3 798,80 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-00-D120-220&length=1000): HTTP 200; Product JSON-LD содержит `DT-SW50-17-00-D120-220`.
- Параметры: Длина — 1000 мм.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-00-D150-250

Труба L=1000мм, Ø150/250, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `2c0327f8-f48b-498e-b644-54a6324f0fcf`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 4 617,25 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-00-D150-250&length=1000): HTTP 200; Product JSON-LD содержит `DT-SW50-17-00-D150-250`.
- Параметры: Длина — 1000 мм.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-04-D115-215

Труба L=250 мм, Ø115/215, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `72be50f5-da1b-4df7-83a0-0c2de102ad8e`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: 250; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 1 850,70 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-17-04-D115-215&length=250): HTTP 200; Product JSON-LD содержит `DT-SW50-17-04-D115-215`.
- Параметры: Длина — 250 мм.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-04-D120-220

Труба L=250 мм, Ø120/220, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `6dab5cd3-1e1f-4748-93fb-6c934775df9e`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: 250; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 1 850,70 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-17-04-D120-220&length=250): HTTP 200; Product JSON-LD содержит `DT-SW50-17-04-D120-220`.
- Параметры: Длина — 250 мм.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-04-D150-250

Труба L=250 мм, Ø150/250, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `9627dcf4-ea6d-4ff6-9337-d65db100ecd4`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: 250; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 2 146,70 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-17-04-D150-250&length=250): HTTP 200; Product JSON-LD содержит `DT-SW50-17-04-D150-250`.
- Параметры: Длина — 250 мм.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-15-D115-215

Дефлектор-конус, Ø115/215, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `d9596156-0786-4fe8-8366-6e941d09c312`; Product ID: `8cc714ae-ccbf-41ba-b057-992503c714a8`.
- Семейство: `sendvich-ogolovok-deflektor-konus`; тип: оголовок; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 2 913,30 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d115-215?sku=DT-SW50-17-15-D115-215): HTTP 200; Product JSON-LD содержит `DT-SW50-17-15-D115-215`.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-15-D120-220

Дефлектор-конус, Ø120/220, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `233dbc76-9671-4841-91af-5d6fa5696dd1`; Product ID: `8cc714ae-ccbf-41ba-b057-992503c714a8`.
- Семейство: `sendvich-ogolovok-deflektor-konus`; тип: оголовок; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 2 913,30 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d120-220?sku=DT-SW50-17-15-D120-220): HTTP 200; Product JSON-LD содержит `DT-SW50-17-15-D120-220`.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-17-15-D150-250

Дефлектор-конус, Ø150/250, AISI 304, 0.5 мм, изоляция 50 мм

- SKU ID: `6fc853b0-ffa0-49df-b58c-d5edfab5919d`; Product ID: `8cc714ae-ccbf-41ba-b057-992503c714a8`.
- Семейство: `sendvich-ogolovok-deflektor-konus`; тип: оголовок; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.50; изоляция, мм: 50; угол, °: не указано.
- Цена: 3 793,74 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-ogolovok-deflektor-konus-d150-250?sku=DT-SW50-17-15-D150-250): HTTP 200; Product JSON-LD содержит `DT-SW50-17-15-D150-250`.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,5 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-00-D115-215

Труба L=1000мм, Ø115/215, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `2d6f081b-698c-4918-b6bd-3bfc438b9276`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 4 680,50 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-19-00-D115-215&length=1000): HTTP 200; Product JSON-LD содержит `DT-SW50-19-00-D115-215`.
- Параметры: Длина — 1000 мм.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-00-D120-220

Труба L=1000мм, Ø120/220, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `37ecd6d4-5503-4dca-9cad-9e095a564956`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 4 680,50 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-19-00-D120-220&length=1000): HTTP 200; Product JSON-LD содержит `DT-SW50-19-00-D120-220`.
- Параметры: Длина — 1000 мм.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-00-D150-250

Труба L=1000мм, Ø150/250, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `997b5f41-64eb-4c73-a06f-5a4c2a0fc925`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: 1000; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 5 615,34 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-19-00-D150-250&length=1000): HTTP 200; Product JSON-LD содержит `DT-SW50-19-00-D150-250`.
- Параметры: Длина — 1000 мм.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-01-D115-215

Труба L=750 мм, Ø115/215, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `57a4eff5-1d1c-4a6e-bee7-7bc97b410156`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: 750; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 4 048,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d115-215?sku=DT-SW50-19-01-D115-215&length=750): HTTP 200; Product JSON-LD содержит `DT-SW50-19-01-D115-215`.
- Параметры: Длина — 750 мм.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-01-D120-220

Труба L=750 мм, Ø120/220, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `e10b0391-1fcf-4ec8-917d-a56aca22ddc1`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: 750; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 4 048,00 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d120-220?sku=DT-SW50-19-01-D120-220&length=750): HTTP 200; Product JSON-LD содержит `DT-SW50-19-01-D120-220`.
- Параметры: Длина — 750 мм.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-01-D150-250

Труба L=750 мм, Ø150/250, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `69c6e55e-afa3-43cb-8726-c0fb0c513e52`; Product ID: `6df5fd75-089d-4b48-afb9-a61ea8bda4d9`.
- Семейство: `sendvich-truba`; тип: труба; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: 750; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 4 671,64 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-truba-d150-250?sku=DT-SW50-19-01-D150-250&length=750): HTTP 200; Product JSON-LD содержит `DT-SW50-19-01-D150-250`.
- Параметры: Длина — 750 мм.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-08-D115-215

Тройник с К/О 90°, Ø115/215, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `7600882e-22c9-49ea-bf76-a11703698ccf`; Product ID: `3e76b8ac-fb6f-4a74-bfa1-b599f2688536`.
- Семейство: `sendvich-troi-nik-s-k-o-90gr`; тип: тройник; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: 90.
- Цена: 6 536,26 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d115-215?sku=DT-SW50-19-08-D115-215): HTTP 200; Product JSON-LD содержит `DT-SW50-19-08-D115-215`.
- Параметры: Угол — 90 °.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-08-D120-220

Тройник с К/О 90°, Ø120/220, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `9cab77a6-c94c-476e-90aa-839f5aed0372`; Product ID: `3e76b8ac-fb6f-4a74-bfa1-b599f2688536`.
- Семейство: `sendvich-troi-nik-s-k-o-90gr`; тип: тройник; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: 90.
- Цена: 6 536,26 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d120-220?sku=DT-SW50-19-08-D120-220): HTTP 200; Product JSON-LD содержит `DT-SW50-19-08-D120-220`.
- Параметры: Угол — 90 °.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-08-D150-250

Тройник с К/О 90°, Ø150/250, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `d5a6046b-3fb8-41a8-ac11-d22e4019362b`; Product ID: `3e76b8ac-fb6f-4a74-bfa1-b599f2688536`.
- Семейство: `sendvich-troi-nik-s-k-o-90gr`; тип: тройник; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: 90.
- Цена: 7 879,68 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-troi-nik-s-k-o-90gr-d150-250?sku=DT-SW50-19-08-D150-250): HTTP 200; Product JSON-LD содержит `DT-SW50-19-08-D150-250`.
- Параметры: Угол — 90 °.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-11-D115-215

Заглушка опорная, Ø115/215, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `047ec56f-4ba1-4a4f-b39c-c32c20ace222`; Product ID: `30f47f55-2344-4aea-b505-f2e81f8d96ec`.
- Семейство: `sendvich-zaglushka-opornaya`; тип: заглушка; материал: нержавеющая сталь.
- Поля SKU: d, мм: 115; D, мм: 215; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 1 644,50 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d115-215?sku=DT-SW50-19-11-D115-215): HTTP 200; Product JSON-LD содержит `DT-SW50-19-11-D115-215`.
- Внутренняя труба: Диаметр — 115 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 215 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-11-D120-220

Заглушка опорная, Ø120/220, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `96548086-b6ff-4fba-8c8e-e25198868974`; Product ID: `30f47f55-2344-4aea-b505-f2e81f8d96ec`.
- Семейство: `sendvich-zaglushka-opornaya`; тип: заглушка; материал: нержавеющая сталь.
- Поля SKU: d, мм: 120; D, мм: 220; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 1 644,50 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d120-220?sku=DT-SW50-19-11-D120-220): HTTP 200; Product JSON-LD содержит `DT-SW50-19-11-D120-220`.
- Внутренняя труба: Диаметр — 120 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 220 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

### DT-SW50-19-11-D150-250

Заглушка опорная, Ø150/250, AISI 304, 0.8 мм, изоляция 50 мм

- SKU ID: `24ee4e5d-185f-405f-b9c9-65ca07d1751f`; Product ID: `30f47f55-2344-4aea-b505-f2e81f8d96ec`.
- Семейство: `sendvich-zaglushka-opornaya`; тип: заглушка; материал: нержавеющая сталь.
- Поля SKU: d, мм: 150; D, мм: 250; L, мм: не указано; сталь: AISI 304; S внутренней/одностенной, мм: 0.80; изоляция, мм: 50; угол, °: не указано.
- Цена: 2 044,24 ₽; SKU и Product активны.
- [Точная ссылка на выбранное исполнение](https://dimohod-trade.pro/product/sendvich-zaglushka-opornaya-d150-250?sku=DT-SW50-19-11-D150-250): HTTP 200; Product JSON-LD содержит `DT-SW50-19-11-D150-250`.
- Внутренняя труба: Диаметр — 150 мм; Материал — нержавеющая сталь; Сталь — AISI 304; Толщина — 0,8 мм.
- Изоляция: Толщина — 50 мм.
- Наружная оболочка: Диаметр — 250 мм; Материал — нержавеющая сталь; Сталь — AISI 430; Толщина — 0,5 мм.

## Контроль полноты

- Полных BOM: 12.
- Строк во всех BOM: 150.
- Разных SKU: 39; семейств Product: 14.
- Страниц комплектов HTTP 200: 12.
- Уникальных текущих H1 / Title / Description / canonical: 12 / 12 / 12 / 12.
- Целевых товарных ссылок HTTP 200 с подтверждённым артикулом: 39.
- Все 12 вариантов есть в HTML списка комплектов и в sitemap.
- Сценарные страницы banya/dom/pech отвечают HTTP 200. Их тематический блок ведёт в общий список комплектов.
- Снимок служит основанием проверки текста. Согласование нового контента — отдельное решение владельца; в файле нет команды на интеграцию или публикацию.

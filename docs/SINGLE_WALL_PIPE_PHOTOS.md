# Одноконтурные трубы: фото по длинам — 2026-11-23

По прямому запросу владельца обновлены фото семейства `odnostennyi-truba`
(Product `b997ec77-1c59-46d1-b105-c154d639d76a`) на действующем production.
Использован штатный `POST /api/v1/admin/products/{id}/photos`, без deploy,
прямых SQL-правок, миграций или перезапуска служб. Загрузка сама инвалидирует
кеш каталога. Повторно применять при следующем релизе не нужно.

## Источники и привязка

- Скрин 2: `screens-1795423769-31d8ec5b-02.jpg` — длины 150, 250, 350 мм.
  Media ID `6d0c39c3-45a5-48d2-93f1-be81da5fadc5`.
  Основной файл `/media/catalog/categories/odnostennyi-truba/photo-1-6d0c39c3.webp`.
- Скрин 1: `screens-1795423769-9d9d32db-01.jpg` — длины 500, 750 мм.
  Media ID `a11e28ea-12af-48e2-a96e-c2f73fc1117b`.
  Основной файл `/media/catalog/categories/odnostennyi-truba/photo-1-a11e28ea.webp`.
- Для 1000 мм сохранено прежнее фото
  `/media/catalog/categories/odnostennyi-truba-truba/photo-1.png?v=1785840552771441980`.
  SHA-256 до и после: `56eeac9d1de947f04683b2cf18263815350bbce4942587e8349ddc7e2fa6e034`.

Обе новые записи имеют `role=general`, `scope=variant`, соответствующие
`lengths_mm` и пустой `diameter_keys`: распространяются на все диаметры и
исполнения указанных длин. Отдельные фото 864 SKU не дублировались.
Старые три фото не удалялись и не перезаписывались. Сэндвич-трубы не менялись.

## Сжатие

Применён существующий `app.media.images.encode_catalog_image`: WebP quality 80,
method 6, основное изображение 800×1200; миниатюра 320×480, quality 72.
Композиция и фон исходников сохранены, без обрезки.

- Скрин 1: JPEG 28 924 байта → WebP 8 946 байт, миниатюра 2 038 байт.
  SHA-256 основного WebP:
  `068e6462a56d340d9ad9032375d6d16fabfccf0c05264592a9de320d428c5251`.
- Скрин 2: JPEG 31 773 байта → WebP 8 956 байт, миниатюра 2 026 байт.
  SHA-256 основного WebP:
  `c182fda7c4c52d343c42ef5f683221cec9d4e3483b337096b7160ec5ab9aa87b`.

В каталожной выдаче используется миниатюра, в карточке — основной файл.
Все четыре публичных файла проверены: HTTP 200, `image/webp`, формат и хеши.

## Сохранность и проверки

Перед загрузкой сохранены публичная и административная карточки в закрытом
production-каталоге
`/home/dimohod-production-runtime/private/catalog-media/single-wall-20261123T085218Z`.
Там же находятся `product-after.json` и `result.json`. Исходные JPEG остаются
в приложениях Telegram; локальные снимки/проверки —
`.codex-telegram/single-wall-photos-20261123/` (вне Git).

Данные всех 864 SKU до/после равны; атрибуты Product кроме `media` равны.
Существующая функция `primary_product_image` проверена на каждом реальном SKU:
720 коротких вариантов выбирают нужный WebP, 144 метровых — прежнее фото.
Публичный API выдачи проверен с каждой из шести длин.
Целевые тесты обработки изображений, нормализации и выбора медиа:
24 passed (`test_image_processing.py`, `test_admin.py`, фильтр `image or media or photo`).

Браузерная проверка на работающем сайте охватывает каталог и карточку товара
для всех шести длин, соответствующие изображения в серверном HTML и смену
длины в карточке. Изображения декодируются, ошибок JavaScript и горизонтального
переполнения каталога на ширине 390 px нет. Цены, артикулы, описания, составы
комплектов и расчёты не менялись.

## Дополнение: прозрачный фон и одна фотография коротких труб

Следующий прямой запрос владельца в тот же день: убрать только внешний чёрный
фон двух новых изображений; для 150/250/350 и 500/750 мм оставить по одному
фото; для 1000 мм сохранить все три ракурса.

Изменения уже применены в production через штатный admin API, без релиза:

- Два cutout PNG подготовлены встроенным `image_gen` (навык `imagegen`), проверены
  на белом фоне и загружены в существующий WebP-конвейер с сохранением alpha.
  Прозрачность есть и у основного фото, и у миниатюры; тёмная внутренняя часть
  трубы и отражения остаются частью изделия.
- Новое фото 150/250/350 мм: media ID `c4883117-46d7-4ad3-9e1c-5ed9761dba75`,
  `/media/catalog/categories/odnostennyi-truba/photo-1-c4883117.webp`.
  WebP 25 366 байт, миниатюра 5 542 байта; 800×1200 и 320×480 соответственно.
- Новое фото 500/750 мм: media ID `c9f1709f-be31-429b-a615-dbd8fc02130f`,
  `/media/catalog/categories/odnostennyi-truba/photo-1-c9f1709f.webp`.
  WebP 22 676 байт, миниатюра 5 896 байт, те же размеры.
- У трёх исходных фото через `PATCH .../photos/{id}` выставлен
  `lengths_mm=[1000]`. Их URL, роли и байты не менялись. Специальные фото
  метрового SKU также сохранены. Две предыдущие записи с чёрным фоном
  удалены из галереи через `DELETE .../photos/{id}`; физические старые файлы
  не уничтожались.

Контрольные суммы исходных метровых фото после изменения:

- Общий вид: `56eeac9d1de947f04683b2cf18263815350bbce4942587e8349ddc7e2fa6e034`.
- Вид сверху: `b5ffc28fff0ad38a2716159efefa41f176e41717b66401a73b912a52b5b57edb`.
- Соединение: `b82d91fc9c1af6159ebaa361f060f6178adcaf02e58586af383b9de358c67707`.

Снимки до/после и результат:
`/home/dimohod-production-runtime/private/catalog-media/single-wall-cutouts-20261123T090251Z`.
Все 864 SKU до/после равны; остальные атрибуты Product не менялись.
На реальных данных проверены 720 коротких вариантов с одним фото и 144 метровых
с тремя. Все шесть длин проверены в публичном API каталога, серверном HTML,
Chromium и при переключении длины. В коротких карточках нет кнопок лишних
ракурсов, в метровой — три. Прозрачные WebP декодируются; 24 целевых теста
изображений/медиа прошли. Локальный отчёт и скриншоты:
`.codex-telegram/single-wall-cutouts-20261123/`.

Выбранные файлы в workspace:

- `.codex-telegram/single-wall-cutouts-20261123/short.png` и `short.webp`.
- `.codex-telegram/single-wall-cutouts-20261123/long.png` и `long.webp`.

Исходники редактирования — оригинальные JPEG предыдущего запроса, а не снимки
экрана сайта. Использован встроенный инструмент, без CLI/API fallback.
Финальные промпты:

```text
Short:
Use case: background-extraction. Edit target: the attached existing product photo. Remove ONLY the external black background and the black cast shadow beneath the metal chimney pipe, replacing that background with genuine alpha transparency. Preserve the exact pipe silhouette, its height-to-width proportion, position, camera angle, ribbed upper connector, seams, highlights, reflected dark stripes and all metal surface details. Do not regenerate or redesign the product. Keep dark areas INSIDE the pipe opening and dark reflections on the metal opaque; those belong to the product. Keep the complete pipe and original canvas framing. No crop, no extra objects, no text, no white or checkerboard painted background. Output one transparent PNG cutout of this exact pipe.

Long (selected refinement):
Precise background-extraction edit of the supplied existing photograph. COPY THE EXISTING PIPE, do not redraw it. Remove only the external black background to actual alpha transparency. Product pixels, ribbed collar, opening, highlights and all reflections must keep their original geometry and proportions. CRITICAL: retain the original full canvas composition with large empty space around the pipe. The pipe occupies approximately x=37% to 64% of the canvas and y=20% to 79% of the canvas: product width about 27% of canvas, height about 59% of canvas. Do not enlarge or elongate the pipe. Do not zoom in, crop, reframe, stretch, narrow, relight or add reflections. Keep its original ratio of about 0.30 width to height. Keep the dark pipe interior opaque. Remove the small black background shadow below the bottom edge too. Everything outside the exact original metal product silhouette must be fully transparent, no painted white backdrop or halo. Return a transparent PNG with the source pipe in the same position and size relative to the canvas.
```

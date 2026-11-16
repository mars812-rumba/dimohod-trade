# Квадратные карточки быстрого расчёта

Подготовлено 16.11.2026. Публикация выполняется отдельно штатным релизом.

## Поведение

На первом шаге «Баня» и «Дом» — крупные квадратные карточки с иконкой сверху
и подписью снизу. На мобильном они расположены вертикально, на desktop — рядом.
Такой же стиль используется для первоначального выбора маршрута.

На мобильном размер квадратов вычисляется по доступной высоте окна после вычета
шапки сайта, верхней панели шага, заголовка, отступов и кнопки «Продолжить».
`ResizeObserver` и события изменения окна/visualViewport пересчитывают размер при
изменении экрана, шрифта и высоты шапки. Минимальная сторона — 164 px; если места
меньше, страница прокручивается. Смета не ограничена высотой экрана.

После выбора маршрута карточки заменяются компактным блоком с выбранной иконкой,
названием и кнопкой «Изменить». Затем показываются прежние вопросы об этажах,
чердаке или наружной высоте. При повторном открытии выбора ответы сохраняются;
до явного выбора маршрута «Продолжить» неактивна. Фокус переводится на выбранный
маршрут/карточку без принудительной прокрутки. При новом расчёте выбор сбрасывается.

Четыре шага, расчёт БОМ, форма контакта, callback и коды целей Метрики не меняются.
Старые подробные WebP-картинки не удалялись.

## Иконки и происхождение

Два приложенных пользователем JPG обработаны встроенным `image_gen`, режим
`background-extraction`, `transparent_background=true`, отдельный вызов для каждого.
CLI/API fallback не использовался. Полученные RGBA PNG 1254×1254 скопированы в проект:

- `apps/web/public/images/home/quick-estimate/route-through-roof-icon.png`
- `apps/web/public/images/home/quick-estimate/route-along-facade-icon.png`

Исходники: `screens-1794827942-fe38ad08-01.jpg` и
`screens-1794827945-670b86d2-02.jpg` соответственно. Оригиналы не перезаписывались.
Alpha проверена по данным PNG: есть прозрачные пиксели, углы и внутреннее пустое
пространство дома имеют alpha=0. Визуальная проверка — в светлых карточках браузера.

Итоговый промпт одинаковый для двух вызовов; каждый раз единственное изображение
передавалось как edit target:

```text
Use case: background-extraction. Image 1 is the edit target, not a style reference. Asset type: website calculator route-selection icon. Remove ONLY the solid black background, including every enclosed black negative-space area inside the house, chimney cap opening and stove around the flame. Output a genuine transparent PNG cutout with alpha. Preserve exactly the existing dark teal house outline and chimney/stove shapes, the pale turquoise pipe interior, orange flame, original composition, stroke thickness, proportions and flat illustrated style. Keep the entire house and chimney fully visible, centered on a square canvas. No black or white matte, no checkerboard painted into pixels, no new details, no glow, no shadow, no text, no redesign. This is strictly background removal of the supplied icon.
```

## Проверки

`homeQuickEstimate.test.mjs` и `quickEstimateMobile.test.mjs` проверяют подключение
новых PNG, RGBA-формат, квадратные карточки, пересчёт доступного места, сворачивание
маршрута и обратимый выбор. Общий frontend-прогон включает прежние тесты расчёта,
контактной формы, callback и аналитики.

Браузерная матрица: 360×640, 375×667, 384×800, 390×844, 412×915, 320×568,
1280×900. Проверяются квадратность и вертикальное расположение на мобильном,
подпись под иконкой, доступность кнопки, выбор обоих маршрутов, сохранение ответов,
работа клавиатуры, перезапуск, изменение высоты окна и увеличенный шрифт.
Сеть API в этих тестах подменяется локальными ответами, аналитика отклонена:
production-заявки и события в Метрику не отправляются.

# Источники индивидуальных FAQ товаров

FAQ в карточках строится на уровне семейства `Product`. Значения диаметров, длин, углов, стали,
изоляции и контура вычисляются только из активных SKU нашего каталога и не копируются из внешних
прайс-листов.

Назначение типов элементов сверено с официальным каталогом FERRUM 2024 и изложено своими словами:

- отводы — страница 34: <https://catalog.pkferrum.ru/assets/catalog/files/basic-html/page34.html>;
- тройники — страница 35: <https://catalog.pkferrum.ru/assets/catalog/files/basic-html/page35.html>;
- монтажная площадка и шиберы — страница 36: <https://catalog.pkferrum.ru/assets/catalog/files/basic-html/page36.html>;
- общая структура дымоходной системы — страница 15:
  <https://catalog.pkferrum.ru/assets/catalog/files/basic-html/page15.html>;
- рекламные материалы и руководство производителя: <https://catalog.pkferrum.ru/>.

В FAQ не переносятся внешние цены, размеры, температурные режимы, гарантии и заявления о
совместимости. Если в `Product.extra_attributes.faq` редактор добавит проверенные пары
`question`/`answer`, они заменят автоматически собранный FAQ этого семейства.

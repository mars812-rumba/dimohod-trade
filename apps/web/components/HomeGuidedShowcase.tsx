"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import styles from "./HomeGuidedShowcase.module.css";

type ShowcaseSlide = {
  image: string;
  alt: string;
  title: string;
  text: string;
};

const measurementSlides: ShowcaseSlide[] = [
  {
    image: "/images/home/guided-showcase/measure-object-cropped.webp",
    alt: "Экран выбора объекта, состояния и типа отопителя",
    title: "Объект и отопитель",
    text: "Укажите, где будет установлен дымоход, выбран ли отопитель и какой именно источник тепла используется.",
  },
  {
    image: "/images/home/guided-showcase/measure-outlet-cropped.webp",
    alt: "Наглядная подсказка по измерению наружного диаметра патрубка по осям X и Y",
    title: "Размеры патрубка",
    text: "Покажем, где приложить рулетку и почему нужно измерять наружный размер по двум осям, а не внутренний диаметр.",
  },
  {
    image: "/images/home/guided-showcase/measure-height-cropped.webp",
    alt: "Наглядная подсказка по измерению высоты от чистового пола до верхней грани патрубка",
    title: "Высота подключения",
    text: "Размер снимается от чистового пола до верхней грани штатного патрубка. Установленная сверху дымовая труба в него не входит.",
  },
  {
    image: "/images/home/guided-showcase/measure-route-cropped.webp",
    alt: "Экран выбора маршрута дымохода через перекрытие и кровлю",
    title: "Маршрут дымохода",
    text: "Выберите наиболее похожий вариант прохождения. После заполнения размеров расчёт построит маршрут для вашего объекта.",
  },
];

const resultSlides: ShowcaseSlide[] = [
  {
    image: "/images/home/guided-showcase/result-route-cropped.webp",
    alt: "Индивидуальная вертикальная схема маршрута дымохода с размерами и обозначением элементов",
    title: "Индивидуальная схема маршрута",
    text: "Увидите трассу от отопителя до оголовка, длины труб, положение стыков и основные отметки вашего объекта.",
  },
  {
    image: "/images/home/guided-showcase/result-nodes-cropped.webp",
    alt: "Схемы прохода дымохода через перекрытие и кровлю",
    title: "Основные проходные узлы",
    text: "Отдельно покажем проходы перекрытия и кровли, фланцы, хомуты, утепление и расположение элементов узла.",
  },
  {
    image: "/images/home/guided-showcase/result-bom-cropped.webp",
    alt: "Спецификация совместимых изделий дымохода с количеством и ценами",
    title: "Полный перечень изделий",
    text: "Получите BOM: совместимые изделия нужного диаметра и исполнения, их количество, характеристики и цены.",
  },
  {
    image: "/images/home/guided-showcase/result-pdf-cropped.webp",
    alt: "PDF-смета дымохода с перечнем изделий, количеством, ценами и суммами",
    title: "Смета в формате PDF",
    text: "Скачайте готовый документ с размерами, составом комплекта, ценами по позициям и итоговой суммой.",
  },
];

function ShowcaseCarousel({
  id,
  title,
  description,
  slides,
  assetBasePath,
  result = false,
}: {
  id: string;
  title: string;
  description: string;
  slides: ShowcaseSlide[];
  assetBasePath: string;
  result?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeSlide = slides[activeIndex];
  const showSlide = (index: number) => setActiveIndex((index + slides.length) % slides.length);

  return (
    <section className={`${styles.section} ${result ? styles.resultSection : ""}`} aria-labelledby={id}>
      <div className={styles.shell}>
        <div className={styles.introPanel}>
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
          {result ? (
            <Link href="/zamery?edit=1">
              Получить расчёт
              <IconArrowRight aria-hidden size={19} strokeWidth={1.8} />
            </Link>
          ) : null}
        </div>

        <div
          className={styles.carousel}
          role="region"
          aria-roledescription="карусель"
          aria-label={`${title}: 4 слайда`}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            if (Math.abs(delta) > 45) showSlide(activeIndex + (delta < 0 ? 1 : -1));
            touchStartX.current = null;
          }}
        >
          <div className={styles.imageColumn}>
            <div className={styles.imageStage}>
              <Image
                key={activeSlide.image}
                alt={activeSlide.alt}
                className={styles.image}
                draggable={false}
                fill
                sizes="(max-width: 720px) calc(100vw - 32px), 360px"
                src={`${assetBasePath}${activeSlide.image}`}
                unoptimized
              />
            </div>
          </div>

          <div className={styles.slideCopy} aria-live="polite" aria-atomic="true">
            <span className={styles.counter}>{activeIndex + 1} / {slides.length}</span>
            <h3>{activeSlide.title}</h3>
            <p>{activeSlide.text}</p>

            <div className={styles.controls}>
              <button
                aria-label="Предыдущий слайд"
                onClick={() => showSlide(activeIndex - 1)}
                type="button"
              >
                <IconArrowLeft aria-hidden size={20} strokeWidth={1.8} />
              </button>
              <div className={styles.steps} aria-label="Выбор слайда" role="group">
                {slides.map((slide, index) => (
                  <button
                    aria-label={`Слайд ${index + 1}: ${slide.title}`}
                    aria-pressed={index === activeIndex}
                    className={index === activeIndex ? styles.stepActive : undefined}
                    key={slide.image}
                    onClick={() => showSlide(index)}
                    type="button"
                  >
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
              <button
                aria-label="Следующий слайд"
                onClick={() => showSlide(activeIndex + 1)}
                type="button"
              >
                <IconArrowRight aria-hidden size={20} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeGuidedShowcase({ assetBasePath = "" }: { assetBasePath?: string }) {
  return (
    <div className={styles.showcase}>
      <ShowcaseCarousel
        assetBasePath={assetBasePath}
        description="Как замерить каждый параметр, мы наглядно подскажем. Если у вас появятся вопросы, инженер на них ответит."
        id="home-measurements-showcase"
        slides={measurementSlides}
        title="Заполните необходимые размеры"
      />
      <ShowcaseCarousel
        assetBasePath={assetBasePath}
        description="Получите наглядную схему маршрута и проходных узлов, полный перечень совместимых изделий и смету в PDF с ценами."
        id="home-result-showcase"
        result
        slides={resultSlides}
        title="Что вы получите после расчёта"
      />
    </div>
  );
}

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

const previewSlides: ShowcaseSlide[] = [
  {
    image: "/images/home/guided-showcase/measure-outlet-cropped.webp",
    alt: "Вопрос о размере патрубка с раскрытой наглядной подсказкой по измерению",
    title: "Ответьте на несколько вопросов об объекте",
    text: "Подсказки и схемы покажут, какие размеры нужны. Данные можно сохранить и продолжить заполнение в удобное время.",
  },
  {
    image: "/images/home/guided-showcase/result-pdf-cropped.webp",
    alt: "Предварительный расчёт дымохода в PDF со схемой, перечнем изделий и ценами",
    title: "Получите смету по вашим размерам",
    text: "Схема трассы, совместимый комплект и смета для проверки менеджером и подготовки заказа.",
  },
];

function ShowcaseCarousel({
  id,
  title,
  description,
  note,
  slides,
  assetBasePath,
}: {
  id: string;
  title: string;
  description: string;
  note: string;
  slides: ShowcaseSlide[];
  assetBasePath: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const activeSlide = slides[activeIndex];
  const showSlide = (index: number) => setActiveIndex((index + slides.length) % slides.length);

  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.shell}>
        <div className={styles.introPanel}>
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
          <Link href="/raschet">
            Выбрать формат замера
            <IconArrowRight aria-hidden size={19} strokeWidth={1.8} />
          </Link>
        </div>

        <div
          className={styles.carousel}
          role="region"
          aria-roledescription="карусель"
          aria-label={`${title}: ${slides.length} слайда`}
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

        <p className={styles.note}>{note}</p>
      </div>
    </section>
  );
}

export function HomeGuidedShowcase({ assetBasePath = "" }: { assetBasePath?: string }) {
  return (
    <div className={styles.showcase}>
      <ShowcaseCarousel
        assetBasePath={assetBasePath}
        description="Готовите реальный заказ? Заполните размеры с наглядными подсказками. Данные сохранятся, а менеджер проверит состав комплекта и итоговую смету."
        id="home-preliminary-estimate-showcase"
        note="Для удалённых объектов предварительный расчёт может сэкономить отдельный платный выезд на первичный замер."
        slides={previewSlides}
        title="Полный замер для подготовки заказа"
      />
    </div>
  );
}

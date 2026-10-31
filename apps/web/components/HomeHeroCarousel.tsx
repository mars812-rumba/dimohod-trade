"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconFileTypePdf,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import styles from "./HomeHeroCarousel.module.css";

const slides = [
  ["designer-fireplace.webp", "Подвесной камин и дымоход в интерьере"],
  ["industrial-facade.webp", "Промышленный объект с установленными дымоходами"],
  ["roof-chimney.webp", "Дымоход на скатной кровле"],
  ["wood-house-stove.webp", "Печь и дымоход в деревянном доме"],
  ["sauna-stove-steel.webp", "Дымоход банной печи в парной"],
  ["sauna-stove-stone.webp", "Банная печь с камнями и вертикальным дымоходом"],
  ["log-house-facade.webp", "Наружный дымоход на фасаде деревянного дома"],
  ["boiler-room.webp", "Дымоход в котельной"],
  ["facade-wall-route.webp", "Наружный маршрут дымохода вдоль стены дома"],
  ["wood-stove-fire.webp", "Работающая печь с дымоходом в деревянном интерьере"],
] as const;

type HomeHeroCarouselProps = {
  assetBasePath?: string;
};

export function HomeHeroCarousel({ assetBasePath = "" }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const showSlide = (index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  };

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMediaPreferences = () => {
      setReduceMotion(motionMedia.matches);
    };
    updateMediaPreferences();
    motionMedia.addEventListener("change", updateMediaPreferences);
    return () => {
      motionMedia.removeEventListener("change", updateMediaPreferences);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  const [fileName, alt] = slides[activeIndex];
  const imagePath = `${assetBasePath}/images/home/hero-projects/${fileName}`;

  return (
    <section
      className={styles.hero}
      aria-roledescription="карусель"
      aria-label="Визуализации вариантов дымоходных систем"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(delta) > 45) showSlide(activeIndex + (delta < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      <div className={styles.carouselFrame}>
        <div className={styles.imageStage} aria-live="off">
          <link rel="preload" as="image" href={`${assetBasePath}/images/home/hero-projects/${slides[0][0]}`} fetchPriority="high" />
          <Image
            key={imagePath}
            className={styles.slideImage}
            src={imagePath}
            alt={`Концептуальная визуализация: ${alt.toLocaleLowerCase("ru-RU")}`}
            fill
            loading={activeIndex === 0 ? "eager" : "lazy"}
            fetchPriority={activeIndex === 0 ? "high" : "auto"}
            unoptimized
            sizes="100vw"
          />
        </div>

        <div className={styles.heroOffer}>
          <p className={styles.heroOfferEyebrow}>Производство дымоходов · Санкт-Петербург и Ленинградская область</p>
          <h1 className={styles.heroOfferTitle}>
            Подберём комплект дымохода для вашего дома или бани
          </h1>
          <p className={styles.heroOfferText}>
            Рассчитайте предварительную стоимость, получите список комплектующих и схему установки — прямо на сайте.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.cta} href="/bystryy-raschet">
              <IconFileTypePdf size={21} strokeWidth={1.7} aria-hidden />
              <div className={styles.ctaCopy}>
                <strong>Рассчитать комплект</strong>
              </div>
              <IconArrowRight size={18} strokeWidth={1.8} aria-hidden />
            </Link>

            <Link className={styles.catalogCta} href="/catalog">
              <span>Перейти в каталог</span>
              <IconArrowRight size={17} strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
          <ul className={styles.heroBenefits} aria-label="Результаты предварительного расчёта">
            <li>Предварительная стоимость</li>
            <li>Состав комплекта</li>
            <li>Схема и PDF-смета</li>
          </ul>
        </div>

        <div className={styles.progress} aria-hidden="true">
          {slides.map(([name], index) => (
            <span
              key={name}
              className={index === activeIndex ? styles.progressActive : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

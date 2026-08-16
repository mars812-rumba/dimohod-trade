"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./HomeHeroCarousel.module.css";

const slides = [
  ["industrial-facade.webp", "Промышленный объект с установленными дымоходами"],
  ["roof-chimney.webp", "Дымоход на скатной кровле"],
  ["wood-house-stove.webp", "Печь и дымоход в деревянном доме"],
  ["sauna-stove-steel.webp", "Дымоход банной печи в парной"],
  ["sauna-stove-stone.webp", "Банная печь с камнями и вертикальным дымоходом"],
  ["log-house-facade.webp", "Наружный дымоход на фасаде деревянного дома"],
  ["boiler-room.webp", "Дымоход в котельной"],
  ["facade-wall-route.webp", "Наружный маршрут дымохода вдоль стены дома"],
  ["wood-stove-fire.webp", "Работающая печь с дымоходом в деревянном интерьере"],
  ["designer-fireplace.webp", "Подвесной камин и дымоход в интерьере"],
] as const;

type HomeHeroCarouselProps = {
  assetBasePath?: string;
};

export function HomeHeroCarousel({ assetBasePath = "" }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const showSlide = useCallback((index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(media.matches);
    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);
    return () => media.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isPaused || reduceMotion) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [isPaused, reduceMotion]);

  const [fileName, alt] = slides[activeIndex];
  const imagePath = `${assetBasePath}/images/home/hero-projects/${fileName}`;
  const logoPath = `${assetBasePath}/brand/logo-original.jpg`;

  return (
    <section
      className={styles.hero}
      role="region"
      aria-roledescription="карусель"
      aria-label="Примеры установленных дымоходов"
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
      <div className={styles.imageStage} aria-live="off">
        <Image
          key={imagePath}
          className={styles.slideImage}
          src={imagePath}
          alt={alt}
          fill
          priority={activeIndex === 0}
          unoptimized
          sizes="100vw"
        />
      </div>
      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.content}>
        <h1>Безопасный и совместимый дымоход — без вызова замерщика</h1>
        <p>
          Замерщики обычно берут 5–7 тыс. ₽. Здесь вы бесплатно пройдёте понятный гайд,
          сделаете замеры сами и получите смету в PDF. Если возникнет вопрос, поможет инженер.
        </p>
        <Link className={styles.cta} href="/zamery?edit=1">
          Получить смету в PDF
          <IconArrowRight size={20} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>

      <div className={styles.watermark} aria-hidden="true">
        <Image src={logoPath} alt="" width={222} height={101} unoptimized />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => showSlide(activeIndex - 1)}
          aria-label="Предыдущая фотография"
        >
          <IconArrowLeft size={20} strokeWidth={1.7} aria-hidden />
        </button>
        <span className={styles.counter}>
          {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => setIsPaused((value) => !value)}
          aria-label={isPaused ? "Продолжить смену фотографий" : "Остановить смену фотографий"}
          aria-pressed={isPaused}
        >
          {isPaused ? (
            <IconPlayerPlay size={19} strokeWidth={1.7} aria-hidden />
          ) : (
            <IconPlayerPause size={19} strokeWidth={1.7} aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => showSlide(activeIndex + 1)}
          aria-label="Следующая фотография"
        >
          <IconArrowRight size={20} strokeWidth={1.7} aria-hidden />
        </button>
      </div>

      <div className={styles.progress} aria-hidden="true">
        {slides.map(([name], index) => (
          <span
            key={name}
            className={index === activeIndex ? styles.progressActive : undefined}
          />
        ))}
      </div>
    </section>
  );
}

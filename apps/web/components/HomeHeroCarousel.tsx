"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconAssembly,
  IconBuildingFactory2,
  IconFileTypePdf,
  IconSparkles,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
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

const mobileVideoCues = [
  {
    start: 0,
    end: 8,
    title: "Собственное производство",
    description: "Дымоходы высокого качества на точном оборудовании",
    Icon: IconBuildingFactory2,
  },
  {
    start: 8,
    end: 16,
    title: "Лазерная сварка в стык",
    description: "Ровный и аккуратный шов",
    Icon: IconSparkles,
  },
  {
    start: 16,
    end: 20,
    title: "Проверяем совместимость элементов",
    description: "Чтобы комплект подошёл по месту",
    Icon: IconAssembly,
  },
  {
    start: 20,
    end: 22.1,
    title: "Доставка по всей России",
    description: "Отгружаем готовые заказы",
    Icon: IconTruckDelivery,
  },
] as const;

type HomeHeroCarouselProps = {
  assetBasePath?: string;
};

export function HomeHeroCarousel({ assetBasePath = "" }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVideoFailed, setMobileVideoFailed] = useState(false);
  const [mobileVideoPlaying, setMobileVideoPlaying] = useState(false);
  const [activeVideoCue, setActiveVideoCue] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);

  const showSlide = (index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  };

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMedia = window.matchMedia("(max-width: 720px)");
    const updateMediaPreferences = () => {
      setReduceMotion(motionMedia.matches);
      setIsMobile(mobileMedia.matches);
    };
    updateMediaPreferences();
    motionMedia.addEventListener("change", updateMediaPreferences);
    mobileMedia.addEventListener("change", updateMediaPreferences);
    return () => {
      motionMedia.removeEventListener("change", updateMediaPreferences);
      mobileMedia.removeEventListener("change", updateMediaPreferences);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || (isMobile && !mobileVideoFailed)) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [isMobile, mobileVideoFailed, reduceMotion]);

  useEffect(() => {
    const video = mobileVideoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [isMobile, mobileVideoFailed, reduceMotion]);

  const [fileName, alt] = slides[activeIndex];
  const imagePath = `${assetBasePath}/images/home/hero-projects/${fileName}`;
  const mobileVideoPosterPath = `${assetBasePath}/images/home/hero-projects/0826-poster.webp`;
  const videoCue = activeVideoCue === null ? null : mobileVideoCues[activeVideoCue];
  const displayedVideoCue = videoCue ?? mobileVideoCues[0];
  const usesMobileVideo = isMobile && !reduceMotion && !mobileVideoFailed;

  const syncVideoCue = (currentTime: number) => {
    const cueIndex = mobileVideoCues.findIndex(
      ({ start, end }) => currentTime >= start && currentTime < end,
    );
    setActiveVideoCue(cueIndex >= 0 ? cueIndex : null);
  };

  return (
    <section
      className={styles.hero}
      role="region"
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
      {usesMobileVideo ? (
        <div className={styles.mobileCueSlot} aria-live="off">
          <div key={activeVideoCue ?? "initial"} className={styles.videoCue}>
            <span className={styles.videoCueIcon} aria-hidden="true">
              <displayedVideoCue.Icon size={25} strokeWidth={1.7} />
            </span>
            <span className={styles.videoCueCopy}>
              <strong>{displayedVideoCue.title}</strong>
              <span>{displayedVideoCue.description}</span>
            </span>
          </div>
        </div>
      ) : null}

      {!usesMobileVideo ? (
        <h1 className={styles.headline}>
          Дымоход под ваш отопитель — со схемой и проверкой комплекта.
        </h1>
      ) : null}

      <div className={styles.carouselFrame}>
        <div className={styles.imageStage} aria-live="off">
          <Image
            key={imagePath}
            className={styles.slideImage}
            src={imagePath}
            alt={`Концептуальная визуализация: ${alt.toLocaleLowerCase("ru-RU")}`}
            fill
            priority={activeIndex === 0}
            unoptimized
            sizes="100vw"
          />
          <Image
            className={styles.mobilePoster}
            src={mobileVideoPosterPath}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 720px) 100vw, 0px"
            aria-hidden="true"
          />
          {usesMobileVideo ? (
            <video
              ref={mobileVideoRef}
              className={`${styles.mobileVideo} ${mobileVideoPlaying ? styles.mobileVideoPlaying : ""}`}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster={mobileVideoPosterPath}
              aria-hidden="true"
              onPlaying={(event) => {
                setMobileVideoPlaying(true);
                syncVideoCue(event.currentTarget.currentTime);
              }}
              onTimeUpdate={(event) => syncVideoCue(event.currentTarget.currentTime)}
              onPause={() => {
                setMobileVideoPlaying(false);
              }}
              onWaiting={() => {
                setMobileVideoPlaying(false);
              }}
              onError={() => {
                setMobileVideoPlaying(false);
                setMobileVideoFailed(true);
                setActiveVideoCue(null);
              }}
            >
              <source src={`${assetBasePath}/videos/home/0826.mp4`} type="video/mp4" />
            </video>
          ) : null}
        </div>

        {!(isMobile && mobileVideoPlaying) ? (
          <span className={styles.renderDisclosure}>Концептуальная визуализация</span>
        ) : null}

        <div className={styles.heroActions}>
          <Link className={styles.cta} href="/raschet">
            <IconFileTypePdf size={21} strokeWidth={1.7} aria-hidden />
            <div className={styles.ctaCopy}>
              {usesMobileVideo ? (
                <>
                  <h1 className={styles.ctaHeroTitle}>Дымоход под ваш отопитель</h1>
                  <strong>Начать замер</strong>
                </>
              ) : (
                <>
                  <strong>Начать замер</strong>
                  <span>Быстрый расчёт или глубокий замер</span>
                </>
              )}
            </div>
            <IconArrowRight size={18} strokeWidth={1.8} aria-hidden />
          </Link>

          <Link className={styles.catalogCta} href="/catalog">
            <span>Открыть каталог</span>
            <IconArrowRight size={17} strokeWidth={1.8} aria-hidden />
          </Link>
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

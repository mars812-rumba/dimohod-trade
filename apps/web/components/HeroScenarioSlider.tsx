"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./HeroScenarioSlider.module.css";

type HeroScenario = {
  title: string;
  shortTitle: string;
  image: string;
  href: string;
};

type HeroScenarioSliderProps = {
  items: HeroScenario[];
};

function setScrollPosition(viewport: HTMLDivElement, left: number) {
  const previousBehavior = viewport.style.scrollBehavior;
  viewport.style.scrollBehavior = "auto";
  viewport.scrollLeft = left;
  viewport.style.scrollBehavior = previousBehavior;
}

export function HeroScenarioSlider({ items }: HeroScenarioSliderProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loopedItems = useMemo(() => [...items, ...items, ...items], [items]);

  const loopMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return null;

    const middle = viewport.querySelector<HTMLElement>('[data-loop-start="1"]');
    const end = viewport.querySelector<HTMLElement>('[data-loop-start="2"]');
    if (!middle || !end) return null;

    return {
      middleStart: middle.offsetLeft,
      cycleWidth: end.offsetLeft - middle.offsetLeft,
    };
  }, []);

  const normalizeLoop = useCallback(() => {
    const viewport = viewportRef.current;
    const metrics = loopMetrics();
    if (!viewport || !metrics) return;

    const lowerBoundary = metrics.middleStart - metrics.cycleWidth * 0.45;
    const upperBoundary = metrics.middleStart + metrics.cycleWidth * 0.55;

    if (viewport.scrollLeft < lowerBoundary) {
      setScrollPosition(viewport, viewport.scrollLeft + metrics.cycleWidth);
    } else if (viewport.scrollLeft > upperBoundary) {
      setScrollPosition(viewport, viewport.scrollLeft - metrics.cycleWidth);
    }
  }, [loopMetrics]);

  const updateActiveIndex = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-scenario-card]"));
    if (!cards.length) return;

    const closest = cards.reduce((current, card) =>
      Math.abs(card.offsetLeft - viewport.scrollLeft) <
      Math.abs(current.offsetLeft - viewport.scrollLeft)
        ? card
        : current,
    );
    const itemIndex = Number(closest.dataset.itemIndex);
    if (Number.isInteger(itemIndex)) setActiveIndex(itemIndex);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || items.length < 2) return;

    const resetToMiddle = () => {
      const metrics = loopMetrics();
      if (metrics) {
        setScrollPosition(viewport, metrics.middleStart);
        setActiveIndex(0);
      }
    };

    resetToMiddle();
    const resizeObserver = new ResizeObserver(resetToMiddle);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [items.length, loopMetrics]);

  const handleScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      normalizeLoop();
      updateActiveIndex();
    }, 120);
  };

  const goTo = (itemIndex: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const target = viewport.querySelector<HTMLElement>(
      `[data-loop-set="1"][data-item-index="${itemIndex}"]`,
    );
    if (!target) return;

    setActiveIndex(itemIndex);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    viewport.scrollTo({ left: target.offsetLeft, behavior });
  };

  const move = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const cards = viewport.querySelectorAll<HTMLElement>("[data-scenario-card]");
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : viewport.clientWidth;
    const nextLeft = viewport.scrollLeft + direction * step;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScrollPosition(viewport, nextLeft);
    } else {
      viewport.scrollTo({ left: nextLeft, behavior: "smooth" });
    }
  };

  if (!items.length) return null;

  return (
    <section
      className={styles.slider}
      aria-label="Сценарии подбора дымохода"
      aria-roledescription="карусель"
    >
      <div className={styles.controls}>
        <button type="button" onClick={() => move(-1)} aria-label="Предыдущий сценарий">
          <ChevronLeft size={19} aria-hidden />
        </button>
        <button type="button" onClick={() => move(1)} aria-label="Следующий сценарий">
          <ChevronRight size={19} aria-hidden />
        </button>
      </div>

      <div
        className={styles.viewport}
        ref={viewportRef}
        onScroll={handleScroll}
        aria-live="off"
      >
        <div className={styles.track}>
          {loopedItems.map((scenario, index) => {
            const setIndex = Math.floor(index / items.length);
            const itemIndex = index % items.length;
            const isAccessibleSet = setIndex === 1;

            return (
              <Link
                className={styles.card}
                href={scenario.href}
                key={`${setIndex}-${scenario.href}`}
                data-scenario-card
                data-item-index={itemIndex}
                data-loop-set={setIndex}
                data-loop-start={itemIndex === 0 ? setIndex : undefined}
                tabIndex={isAccessibleSet ? undefined : -1}
                aria-hidden={isAccessibleSet ? undefined : true}
              >
                <Image
                  src={scenario.image}
                  alt=""
                  fill
                  sizes="(max-width: 720px) 42vw, 190px"
                />
                <span>{scenario.title}</span>
                <ChevronRight size={16} aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.thumbnails} role="group" aria-label="Выбор сценария">
        {items.map((scenario, itemIndex) => (
          <button
            className={styles.thumbnail}
            type="button"
            key={scenario.href}
            onClick={() => goTo(itemIndex)}
            aria-label={`Показать сценарий: ${scenario.title}`}
            aria-pressed={activeIndex === itemIndex}
          >
            <span className={styles.thumbnailImage}>
              <Image src={scenario.image} alt="" fill sizes="52px" />
            </span>
            <small>{scenario.shortTitle}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

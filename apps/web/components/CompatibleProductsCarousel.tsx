"use client";

import { Children, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "../app/page.module.css";

type CompatibleProductsCarouselProps = {
  children: ReactNode;
};

const ITEMS_PER_PAGE = 2;
const AUTOPLAY_DELAY_MS = 7000;

export function CompatibleProductsCarousel({ children }: CompatibleProductsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const itemCount = Children.count(children);
  const pageCount = Math.ceil(itemCount / ITEMS_PER_PAGE);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const scrollToPage = useCallback((nextPage: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    const target = track?.children.item(nextPage * ITEMS_PER_PAGE) as HTMLElement | null;
    if (!track || !target) return;
    track.scrollTo({ left: target.offsetLeft, behavior });
    setPage(nextPage);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.45,
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pageCount < 2 || paused || hovered || focused || reducedMotion || !visible) return;
    const timer = window.setInterval(() => {
      setPage((current) => {
        const next = (current + 1) % pageCount;
        const track = trackRef.current;
        const target = track?.children.item(next * ITEMS_PER_PAGE) as HTMLElement | null;
        if (track && target) track.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
        return next;
      });
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearInterval(timer);
  }, [focused, hovered, pageCount, paused, reducedMotion, visible]);

  const syncPageFromScroll = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      let nearestPage = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < pageCount; index += 1) {
        const target = track.children.item(index * ITEMS_PER_PAGE) as HTMLElement | null;
        if (!target) continue;
        const distance = Math.abs(track.scrollLeft - target.offsetLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = index;
        }
      }
      setPage(nearestPage);
    });
  };

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div
      className={styles.compatibleCarousel}
      aria-label="Карусель совместимых товаров"
      role="region"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className={styles.compatibleTrack}
        ref={trackRef}
        onPointerDown={() => setPaused(true)}
        onScroll={syncPageFromScroll}
      >
        {children}
      </div>

      {pageCount > 1 ? (
        <div className={styles.compatibleCarouselControls}>
          <div className={styles.compatibleCarouselDots} aria-label="Страницы товаров">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                aria-label={`Показать товары ${index * ITEMS_PER_PAGE + 1}–${Math.min((index + 1) * ITEMS_PER_PAGE, itemCount)}`}
                aria-current={page === index ? "true" : undefined}
                className={page === index ? styles.compatibleCarouselDotActive : ""}
                key={index}
                onClick={() => {
                  setPaused(true);
                  scrollToPage(index);
                }}
                type="button"
              />
            ))}
          </div>
          {!reducedMotion ? (
            <button
              className={styles.compatibleCarouselPause}
              onClick={() => setPaused((current) => !current)}
              type="button"
            >
              {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              {paused ? "Продолжить" : "Пауза"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

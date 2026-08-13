"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "../app/page.module.css";

type CompatibleProductsCarouselProps = {
  children: ReactNode;
};

const ITEMS_PER_PAGE = 2;
const AUTOPLAY_DELAY_MS = 7000;

export function CompatibleProductsCarousel({ children }: CompatibleProductsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const scrollEndRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const items = Children.toArray(children);
  const itemCount = items.length;
  const loopItems = itemCount > ITEMS_PER_PAGE
    ? [
        ...items,
        ...items.slice(0, ITEMS_PER_PAGE).map((child, index) =>
          isValidElement(child)
            ? cloneElement(child as ReactElement<Record<string, unknown>>, {
                "data-carousel-clone": "true",
                key: `carousel-clone-${index}`,
              })
            : child,
        ),
      ]
    : items;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    track.querySelectorAll<HTMLElement>("[data-carousel-clone]").forEach((clone) => {
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("inert", "");
    });
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.45,
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (itemCount <= ITEMS_PER_PAGE || hovered || focused || reducedMotion || !visible) return;
    const timer = window.setInterval(() => {
      const next = Math.min(stepRef.current + 1, itemCount);
      const track = trackRef.current;
      const target = track?.children.item(next) as HTMLElement | null;
      if (track && target) track.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
      stepRef.current = next;
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearInterval(timer);
  }, [focused, hovered, itemCount, reducedMotion, visible]);

  const resetLoopIfNeeded = () => {
    const track = trackRef.current;
    if (!track || stepRef.current !== itemCount) return;
    track.scrollTo({ left: 0, behavior: "auto" });
    stepRef.current = 0;
  };

  const syncPageFromScroll = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      let nearestStep = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index <= itemCount; index += 1) {
        const target = track.children.item(index) as HTMLElement | null;
        if (!target) continue;
        const distance = Math.abs(track.scrollLeft - target.offsetLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestStep = index;
        }
      }
      stepRef.current = nearestStep;
    });
    if (scrollEndRef.current !== null) window.clearTimeout(scrollEndRef.current);
    scrollEndRef.current = window.setTimeout(resetLoopIfNeeded, 180);
  };

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    if (scrollEndRef.current !== null) window.clearTimeout(scrollEndRef.current);
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
        onScroll={syncPageFromScroll}
      >
        {loopItems}
      </div>
    </div>
  );
}

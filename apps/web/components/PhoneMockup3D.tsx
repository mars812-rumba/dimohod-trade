"use client";

import Image from "next/image";
import {
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./PhoneMockup3D.module.css";

const slides = [
  { src: "/images/home/phone-mockup/screen-1.webp", alt: "Экран выбора объекта для замера дымохода" },
  { src: "/images/home/phone-mockup/screen-2.webp", alt: "Экран выбора отопителя и его подключения" },
  { src: "/images/home/phone-mockup/screen-3.webp", alt: "Экран выбора маршрута дымохода" },
  { src: "/images/home/phone-mockup/screen-4.webp", alt: "Экран заполнения размеров для расчёта" },
] as const;

type Rotation = { x: number; y: number; z: number };
type DragState = {
  active: boolean;
  pointerId: number;
  onScreen: boolean;
  moved: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

const initialRotation: Rotation = { x: -6, y: 14, z: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function PhoneMockup3D({ assetBasePath = "" }: { assetBasePath?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const currentRotation = useRef<Rotation>({ ...initialRotation });
  const targetRotation = useRef<Rotation>({ ...initialRotation });
  const drag = useRef<DragState>({
    active: false,
    pointerId: -1,
    onScreen: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const floatTime = useRef(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const goTo = useCallback((index: number) => {
    setActiveSlide(((index % slides.length) + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setDocumentVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.08 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    if (!isVisible || !documentVisible || reducedMotion) {
      currentRotation.current = { ...initialRotation };
      targetRotation.current = { ...initialRotation };
      rig.style.transform = `rotateX(${initialRotation.x}deg) rotateY(${initialRotation.y}deg)`;
      return;
    }

    let frame = 0;
    let previous = performance.now();
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const delta = Math.min(32, now - previous);
      previous = now;

      if (!drag.current.active || drag.current.onScreen) {
        floatTime.current += delta * 0.00115;
        targetRotation.current.y = clamp(12 + Math.sin(floatTime.current) * 23, -30, 34);
        targetRotation.current.x = -6 + Math.cos(floatTime.current * 0.65) * 4;
        targetRotation.current.z *= 0.985;
      }

      const current = currentRotation.current;
      const target = targetRotation.current;
      current.x += (target.x - current.x) * 0.065;
      current.y += (target.y - current.y) * 0.065;
      current.z += (target.z - current.z) * 0.065;
      rig.style.transform = `rotateX(${current.x}deg) rotateY(${current.y}deg) rotateZ(${current.z}deg)`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [documentVisible, isVisible, reducedMotion]);

  useEffect(() => {
    if (!isVisible || !documentVisible || reducedMotion) return;
    const interval = window.setInterval(() => {
      if (!drag.current.active) setActiveSlide((current) => (current + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [documentVisible, isVisible, reducedMotion]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as Element).closest("button")) return;
    const onScreen = Boolean(screenRef.current?.contains(event.target as Node));
    drag.current = {
      active: true,
      pointerId: event.pointerId,
      onScreen,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    const totalX = event.clientX - state.startX;
    const totalY = event.clientY - state.startY;
    if (Math.abs(totalX) + Math.abs(totalY) > 4) state.moved = true;

    if (!state.onScreen) {
      const deltaX = event.clientX - state.lastX;
      const deltaY = event.clientY - state.lastY;
      targetRotation.current.y = clamp(targetRotation.current.y + deltaX * 0.34, -34, 34);
      targetRotation.current.x = clamp(targetRotation.current.x - deltaY * 0.28, -14, 14);
    }

    state.lastX = event.clientX;
    state.lastY = event.clientY;
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    if (state.onScreen) {
      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      if (Math.abs(deltaX) > 38 && Math.abs(deltaX) > Math.abs(deltaY)) {
        goTo(activeSlide + (deltaX < 0 ? 1 : -1));
      }
    }
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const shouldAnimate = isVisible && documentVisible && !reducedMotion;

  return (
    <div
      aria-label="Интерактивная модель телефона с экранами полного замера"
      className={styles.stage}
      data-animating={shouldAnimate}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      ref={stageRef}
      role="group"
    >
      <div className={styles.scene}>
        <div className={styles.scaleFrame}>
          <div className={styles.rig} ref={rigRef}>
            <div className={styles.phone}>
              <div aria-hidden className={`${styles.face} ${styles.backFace}`} />

              <div className={`${styles.face} ${styles.frontFace}`}>
                <div aria-hidden className={styles.notch} />
                <div className={styles.screen} ref={screenRef}>
                  <div
                    aria-live="polite"
                    className={styles.track}
                    id="phone-mockup-track"
                    style={{ transform: `translate3d(${-activeSlide * 100}%, 0, 0)` }}
                  >
                    {slides.map((slide, index) => (
                      <div aria-hidden={index !== activeSlide} className={styles.slide} key={slide.src}>
                        <Image
                          alt={index === activeSlide ? slide.alt : ""}
                          fill
                          sizes="(max-width: 720px) 206px, 272px"
                          src={`${assetBasePath}${slide.src}`}
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>

                  <div className={styles.dots} role="group" aria-label="Выбор экрана замера">
                    {slides.map((slide, index) => (
                      <button
                        aria-label={`Показать экран ${index + 1}`}
                        aria-pressed={index === activeSlide}
                        className={index === activeSlide ? styles.activeDot : undefined}
                        key={slide.src}
                        onClick={(event) => {
                          event.stopPropagation();
                          goTo(index);
                        }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div aria-hidden className={styles.sideButtons}>
                <span className={styles.powerButton} />
                <span className={styles.volumeButtonOne} />
                <span className={styles.volumeButtonTwo} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        aria-controls="phone-mockup-track"
        aria-label="Предыдущий экран"
        className={`${styles.arrow} ${styles.previous}`}
        onClick={(event) => {
          event.stopPropagation();
          goTo(activeSlide - 1);
        }}
        type="button"
      >
        <IconChevronLeft aria-hidden size={23} strokeWidth={1.8} />
      </button>
      <button
        aria-controls="phone-mockup-track"
        aria-label="Следующий экран"
        className={`${styles.arrow} ${styles.next}`}
        onClick={(event) => {
          event.stopPropagation();
          goTo(activeSlide + 1);
        }}
        type="button"
      >
        <IconChevronRight aria-hidden size={23} strokeWidth={1.8} />
      </button>

      <p className={styles.hint}>Свайпните экран, чтобы листать · потяните корпус, чтобы повернуть</p>
    </div>
  );
}

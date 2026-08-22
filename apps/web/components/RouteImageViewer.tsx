"use client";

import Image from "next/image";
import {
  IconArrowLeft as ArrowLeft,
  IconZoomIn as ZoomIn,
  IconZoomOut as ZoomOut,
} from "@tabler/icons-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import styles from "./RouteImageViewer.module.css";

type RouteImageViewerProps = {
  src: string;
  alt: string;
  title: string;
  previewClassName?: string;
  previewSizes: string;
  quality?: number;
};

export function RouteImageViewer({
  src,
  alt,
  title,
  previewClassName = "",
  previewSizes,
  quality = 76,
}: RouteImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const historyPushedRef = useRef(false);
  const previousScaleRef = useRef(1);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    backButtonRef.current?.focus();
    if (!historyPushedRef.current) {
      window.history.pushState({ ...window.history.state, routeImageViewer: true }, "");
      historyPushedRef.current = true;
    }

    const handlePopState = () => {
      if (dialog.open) dialog.close();
      historyPushedRef.current = false;
      setIsOpen(false);
      setIsZoomed(false);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const nextScale = isZoomed ? 1.75 : 1;
    if (!isOpen) {
      previousScaleRef.current = nextScale;
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const previousScale = previousScaleRef.current;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / previousScale;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / previousScale;

    viewport.scrollLeft = centerX * nextScale - viewport.clientWidth / 2;
    viewport.scrollTop = centerY * nextScale - viewport.clientHeight / 2;
    previousScaleRef.current = nextScale;
  }, [isOpen, isZoomed]);

  const closeViewer = () => {
    if (historyPushedRef.current && window.history.state?.routeImageViewer) {
      window.history.back();
      return;
    }
    dialogRef.current?.close();
    setIsOpen(false);
    setIsZoomed(false);
    historyPushedRef.current = false;
    triggerRef.current?.focus();
  };

  const handleClosed = () => {
    setIsOpen(false);
    setIsZoomed(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const viewerStyle = {
    "--route-viewer-scale": isZoomed ? "1.75" : "1",
  } as CSSProperties;

  return (
    <>
      <button
        aria-label={`Открыть схему «${title}» на весь экран`}
        className={`${styles.previewButton} ${previewClassName}`}
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Image
          alt={alt}
          fill
          loading="lazy"
          quality={quality}
          sizes={previewSizes}
          src={src}
        />
        <span className={styles.previewHint} aria-hidden>
          <ZoomIn size={16} />
          Увеличить
        </span>
      </button>

      <dialog
        aria-labelledby={titleId}
        className={styles.dialog}
        onCancel={(event) => {
          event.preventDefault();
          closeViewer();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeViewer();
        }}
        onClose={handleClosed}
        ref={dialogRef}
      >
        <div className={styles.viewer} style={viewerStyle}>
          <header className={styles.viewerHeader}>
            <button
              aria-label="Вернуться к выбору маршрута"
              className={styles.backButton}
              onClick={closeViewer}
              ref={backButtonRef}
              type="button"
            >
              <ArrowLeft size={22} aria-hidden />
              <span>Назад</span>
            </button>
            <strong id={titleId}>{title}</strong>
            <button
              aria-label={isZoomed ? "Уменьшить схему" : "Увеличить схему"}
              aria-pressed={isZoomed}
              className={styles.zoomButton}
              onClick={() => setIsZoomed((current) => !current)}
              type="button"
            >
              {isZoomed ? <ZoomOut size={21} aria-hidden /> : <ZoomIn size={21} aria-hidden />}
            </button>
          </header>
          <div className={styles.viewport} ref={viewportRef}>
            <button
              aria-label={isZoomed ? "Уменьшить схему" : "Увеличить схему"}
              className={styles.imageCanvas}
              onClick={() => setIsZoomed((current) => !current)}
              type="button"
            >
              <Image alt={alt} fill priority quality={88} sizes="100vw" src={src} />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

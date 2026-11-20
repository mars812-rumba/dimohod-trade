"use client";

import Image from "next/image";
import { ArrowLeft, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import styles from "./RouteImageViewer.module.css";
import { useRouteImageZoom } from "./useRouteImageZoom";

type RouteImageViewerProps = {
  src: string;
  alt: string;
  title: string;
  previewClassName?: string;
  previewSizes: string;
  quality?: number;
  previewLabel?: string;
};

export function RouteImageViewer({
  src,
  alt,
  title,
  previewClassName = "",
  previewSizes,
  quality = 76,
  previewLabel,
}: RouteImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const historyPushedRef = useRef(false);
  const closingRef = useRef(false);
  const previousScaleRef = useRef(1);
  const titleId = useId();
  const zoom = useRouteImageZoom(viewportRef, Boolean(previewLabel), isOpen);
  const enlarged = previewLabel ? zoom.scale > 1 : isZoomed;
  const [imageAvailable, setImageAvailable] = useState(true);
  const toggleZoom = previewLabel ? zoom.toggle : () => setIsZoomed(current => !current);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    closingRef.current = false;

    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    backButtonRef.current?.focus({ preventScroll: true });
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
    if (previewLabel) return;
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
  }, [isOpen, isZoomed, previewLabel]);

  const closeViewer = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (historyPushedRef.current && window.history.state?.routeImageViewer) {
      window.history.back();
      return;
    }
    dialogRef.current?.close();
    setIsOpen(false);
    setIsZoomed(false);
    historyPushedRef.current = false;
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleClosed = () => {
    setIsOpen(false);
    setIsZoomed(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  const viewerStyle = {
    "--route-viewer-scale": previewLabel ? String(zoom.scale) : isZoomed ? "1.75" : "1",
  } as CSSProperties;

  if (previewLabel && !imageAvailable) return null;

  return (
    <>
      {previewLabel ? <a href={src} aria-haspopup="dialog" className={styles.rowPreview} ref={node => { triggerRef.current = node; }}
        onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); setIsOpen(true);
        }}>
        <span className={styles.rowThumbnail}><Image src={src} alt={alt} fill sizes={previewSizes} quality={quality} unoptimized onError={() => setImageAvailable(false)} /></span>
        <span>{previewLabel}</span><ZoomIn aria-hidden size={20} />
      </a> : <button
        aria-label={`Открыть схему «${title}» на весь экран`}
        className={`${styles.previewButton} ${previewClassName}`}
        onClick={() => setIsOpen(true)}
        ref={node => { triggerRef.current = node; }}
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
      </button>}

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
              aria-label={previewLabel ? "Закрыть схему" : "Вернуться к выбору маршрута"}
              className={styles.backButton}
              onClick={closeViewer}
              onPointerUp={previewLabel ? event => {
                if (event.pointerType === "touch") { event.preventDefault(); closeViewer(); }
              } : undefined}
              ref={backButtonRef}
              type="button"
            >
              {previewLabel ? <X size={22} aria-hidden /> : <ArrowLeft size={22} aria-hidden />}
              <span>{previewLabel ? "Закрыть" : "Назад"}</span>
            </button>
            <strong id={titleId}>{title}</strong>
            <button
              aria-label={enlarged ? "Уменьшить схему" : "Увеличить схему"}
              aria-pressed={enlarged}
              className={styles.zoomButton}
              onClick={toggleZoom}
              type="button"
            >
              {enlarged ? <ZoomOut size={21} aria-hidden /> : <ZoomIn size={21} aria-hidden />}
            </button>
          </header>
          <div className={`${styles.viewport} ${previewLabel ? styles.gestureViewport : ""}`} ref={viewportRef} {...zoom.handlers} data-route-viewport
            onClick={previewLabel ? event => { if (event.target === event.currentTarget) zoom.imageClick(); } : undefined}>
            <button
              aria-label={enlarged ? "Уменьшить схему" : "Увеличить схему"}
              className={styles.imageCanvas}
              onClick={previewLabel ? zoom.imageClick : toggleZoom}
              type="button"
            >
              <Image alt={alt} fill priority quality={88} sizes="100vw" src={src} unoptimized={Boolean(previewLabel)} draggable={false} />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

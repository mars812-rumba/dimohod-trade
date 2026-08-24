"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useRef, useState } from "react";
import styles from "./ScenarioPageTemplate.module.css";

type GalleryImage = {
  src: string;
  alt: string;
};

type SolutionHouseGalleryProps = {
  images: GalleryImage[];
  label?: string;
  equalItems?: boolean;
};

export function SolutionHouseGallery({
  images,
  label = "Фотографии дымохода в доме",
  equalItems = false,
}: SolutionHouseGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectPrevious = () => {
    setSelectedIndex((current) => (current - 1 + images.length) % images.length);
  };

  const selectNext = () => {
    setSelectedIndex((current) => (current + 1) % images.length);
  };

  const openGallery = (index: number) => {
    setSelectedIndex(index);
    window.requestAnimationFrame(() => {
      dialogRef.current?.showModal();
      closeButtonRef.current?.focus();
    });
  };

  const closeGallery = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <div className={styles.houseGallery} aria-label={label}>
        {images.map((image, index) => (
          <button
            aria-label={`Увеличить фотографию ${index + 1} из ${images.length}`}
            aria-haspopup="dialog"
            className={styles.houseGalleryItem}
            key={image.src}
            onClick={() => openGallery(index)}
            type="button"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              loading="lazy"
              quality={78}
              sizes={
                equalItems
                  ? "(max-width: 620px) 100vw, (max-width: 820px) 50vw, 33vw"
                  : index === 0
                  ? "(max-width: 620px) 62vw, 350px"
                  : "(max-width: 620px) 32vw, 190px"
              }
            />
            {index === 0 ? (
              <span className={styles.houseGalleryHint} aria-hidden="true">
                <Maximize2 size={15} />
                Смотреть
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <dialog
        aria-label={`Просмотр: ${label}`}
        className={styles.houseGalleryDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeGallery();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") selectPrevious();
          if (event.key === "ArrowRight") selectNext();
        }}
        ref={dialogRef}
      >
        <div
          className={styles.houseGalleryDialogInner}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const distance = event.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(distance) < 50) return;
            if (distance > 0) selectPrevious();
            else selectNext();
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0].clientX;
          }}
        >
          <button
            aria-label="Закрыть просмотр"
            className={styles.houseGalleryClose}
            onClick={closeGallery}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden size={22} />
          </button>

          <div className={styles.houseGalleryFullImage}>
            <Image
              src={images[selectedIndex].src}
              alt={images[selectedIndex].alt}
              fill
              priority
              quality={82}
              sizes="100vw"
            />
          </div>

          <button
            aria-label="Предыдущая фотография"
            className={`${styles.houseGalleryArrow} ${styles.houseGalleryArrowPrevious}`}
            onClick={selectPrevious}
            type="button"
          >
            <ChevronLeft aria-hidden size={26} />
          </button>
          <button
            aria-label="Следующая фотография"
            className={`${styles.houseGalleryArrow} ${styles.houseGalleryArrowNext}`}
            onClick={selectNext}
            type="button"
          >
            <ChevronRight aria-hidden size={26} />
          </button>

          <span className={styles.houseGalleryCounter} aria-live="polite">
            {selectedIndex + 1} / {images.length}
          </span>
        </div>
      </dialog>
    </>
  );
}

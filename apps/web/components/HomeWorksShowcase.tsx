"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useRef, useState } from "react";
import styles from "./HomeWorksShowcase.module.css";

type WorkPhoto = {
  src: string;
  alt: string;
};

type WorkObject = {
  id: number;
  photos: WorkPhoto[];
};

const workObjects: WorkObject[] = [
  {
    id: 1,
    photos: [
      { src: "/images/works/object-1/07.webp", alt: "Дымоход на зелёной кровле частного дома" },
      { src: "/images/works/object-1/01.webp", alt: "Выход дымохода над кровлей" },
      { src: "/images/works/object-1/04.webp", alt: "Подключение металлической печи к дымоходу внутри дома" },
      { src: "/images/works/object-1/02.webp", alt: "Проход дымохода через перекрытие" },
      { src: "/images/works/object-1/03.webp", alt: "Кровельный узел дымохода" },
      { src: "/images/works/object-1/05.webp", alt: "Дымоход на кровле, вид с участка" },
      { src: "/images/works/object-1/06.webp", alt: "Вертикальный участок дымохода на чердаке" },
      { src: "/images/works/object-1/08.webp", alt: "Проход вертикального дымохода через чердак" },
    ],
  },
  {
    id: 2,
    photos: [
      { src: "/images/works/object-2/05.webp", alt: "Печь и дымоход в деревянном помещении" },
      { src: "/images/works/object-2/01.webp", alt: "Печь в кирпичном портале" },
      { src: "/images/works/object-2/02.webp", alt: "Печь с баком и вертикальным дымоходом" },
      { src: "/images/works/object-2/03.webp", alt: "Дымоход на металлической кровле" },
      { src: "/images/works/object-2/04.webp", alt: "Окрашенный дымоход над кровлей" },
      { src: "/images/works/object-2/06.webp", alt: "Металлическая печь с вертикальным дымоходом" },
    ],
  },
  {
    id: 3,
    photos: [
      { src: "/images/works/object-3/01.webp", alt: "Дом с выведенным над кровлей дымоходом" },
      { src: "/images/works/object-3/02.webp", alt: "Тёмный дымоход на кровле" },
      { src: "/images/works/object-3/03.webp", alt: "Проход дымохода через перекрытие" },
      { src: "/images/works/object-3/04.webp", alt: "Подключение оборудования к дымоходу в техническом помещении" },
      { src: "/images/works/object-3/05.webp", alt: "Вертикальный участок дымохода внутри помещения" },
      { src: "/images/works/object-3/06.webp", alt: "Узел прохода металлического дымохода" },
      { src: "/images/works/object-3/07.webp", alt: "Дымоход над кровлей на фоне деревьев" },
    ],
  },
  {
    id: 4,
    photos: [
      { src: "/images/works/object-4/05.webp", alt: "Печь с тёмным дымоходом у окна" },
      { src: "/images/works/object-4/01.webp", alt: "Отдельно стоящая печь с вертикальным дымоходом" },
      { src: "/images/works/object-4/02.webp", alt: "Подключение печи к стеновому участку дымохода" },
      { src: "/images/works/object-4/03.webp", alt: "Тёмный дымоход внутри жилого помещения" },
      { src: "/images/works/object-4/04.webp", alt: "Печь и дымоход рядом с оконным проёмом" },
    ],
  },
  {
    id: 5,
    photos: [
      { src: "/images/works/object-5/03.webp", alt: "Дымоход на кровле рядом с кирпичной трубой" },
      { src: "/images/works/object-5/01.webp", alt: "Печь с дымоходом в готовом интерьере" },
      { src: "/images/works/object-5/02.webp", alt: "Печь с огнём и вертикальным дымоходом" },
      { src: "/images/works/object-5/04.webp", alt: "Печь и защитный экран на стене" },
      { src: "/images/works/object-5/05.webp", alt: "Установленная у стены печь с дымоходом" },
    ],
  },
];

export function HomeWorksShowcase() {
  const [objectIndex, setObjectIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const activeObject = workObjects[objectIndex];
  const activePhoto = activeObject.photos[photoIndex];

  const selectObject = (index: number) => {
    setObjectIndex(index);
    setPhotoIndex(0);
  };

  const selectPrevious = () => {
    setPhotoIndex((current) => (current - 1 + activeObject.photos.length) % activeObject.photos.length);
  };

  const selectNext = () => {
    setPhotoIndex((current) => (current + 1) % activeObject.photos.length);
  };

  const openDialog = () => {
    dialogRef.current?.showModal();
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
  };

  const closeDialog = () => dialogRef.current?.close();

  return (
    <>
      <div className={styles.showcase}>
        <div className={styles.objectList} aria-label="Выбор объекта">
          {workObjects.map((workObject, index) => (
            <button
              aria-controls="home-work-stage"
              aria-pressed={index === objectIndex}
              className={styles.objectButton}
              key={workObject.id}
              onClick={() => selectObject(index)}
              type="button"
            >
              <span className={styles.objectThumb}>
                <Image
                  alt=""
                  aria-hidden
                  fill
                  sizes="72px"
                  src={workObject.photos[0].src}
                />
              </span>
              <span className={styles.objectMeta}>
                <strong>Объект {workObject.id}</strong>
                <small>{workObject.photos.length} фотографий</small>
              </span>
              <ChevronRight aria-hidden size={18} />
            </button>
          ))}
        </div>

        <div className={styles.viewer} id="home-work-stage">
          <button
            aria-label={`Открыть объект ${activeObject.id}, фотография ${photoIndex + 1}`}
            aria-haspopup="dialog"
            className={styles.stage}
            onClick={openDialog}
            type="button"
          >
            <Image
              alt={activePhoto.alt}
              fill
              priority={false}
              quality={84}
              sizes="(max-width: 720px) 100vw, (max-width: 1020px) 72vw, 900px"
              src={activePhoto.src}
            />
            <span className={styles.stageShade} aria-hidden="true" />
            <span className={styles.stageCaption}>
              <span>
                <strong>Объект {activeObject.id}</strong>
                <small>{photoIndex + 1} из {activeObject.photos.length}</small>
              </span>
              <span className={styles.openLabel}><Maximize2 aria-hidden size={17} /> Смотреть</span>
            </span>
          </button>

          <div className={styles.photoStrip} aria-label={`Фотографии объекта ${activeObject.id}`}>
            {activeObject.photos.map((photo, index) => (
              <button
                aria-label={`Показать фотографию ${index + 1}`}
                aria-pressed={index === photoIndex}
                className={styles.photoButton}
                key={photo.src}
                onClick={() => setPhotoIndex(index)}
                type="button"
              >
                <Image alt="" aria-hidden fill sizes="88px" src={photo.src} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <dialog
        aria-label={`Фотографии объекта ${activeObject.id}`}
        className={styles.dialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") selectPrevious();
          if (event.key === "ArrowRight") selectNext();
        }}
        ref={dialogRef}
      >
        <div
          className={styles.dialogInner}
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
            className={styles.closeButton}
            onClick={closeDialog}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden size={22} />
          </button>
          <div className={styles.fullImage}>
            <Image
              alt={activePhoto.alt}
              fill
              priority
              quality={88}
              sizes="100vw"
              src={activePhoto.src}
            />
          </div>
          <button
            aria-label="Предыдущая фотография"
            className={`${styles.dialogArrow} ${styles.dialogArrowPrevious}`}
            onClick={selectPrevious}
            type="button"
          >
            <ChevronLeft aria-hidden size={28} />
          </button>
          <button
            aria-label="Следующая фотография"
            className={`${styles.dialogArrow} ${styles.dialogArrowNext}`}
            onClick={selectNext}
            type="button"
          >
            <ChevronRight aria-hidden size={28} />
          </button>
          <span className={styles.dialogCounter} aria-live="polite">
            Объект {activeObject.id} · {photoIndex + 1} / {activeObject.photos.length}
          </span>
        </div>
      </dialog>
    </>
  );
}

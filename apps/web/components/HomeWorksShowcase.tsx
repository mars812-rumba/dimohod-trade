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
  published?: boolean;
  scenario?: string;
  photos: WorkPhoto[];
  details?: {
    location: string;
    title: string;
    description: string;
    specifications: string[];
    prices: Array<{
      label: string;
      value: string;
    }>;
  };
};

const workObjects: WorkObject[] = [
  {
    id: 1,
    scenario: "Дымоход для дома",
    details: {
      location: "СНТ «Дунай»",
      title: "Монтаж дымохода с установкой печи Dacha 2",
      description: "Установка в каркасном доме. Дымоход с порошковой покраской.",
      specifications: [
        "Диаметр 120/220 мм",
        "Нержавеющая сталь AISI 304",
        "Толщина стали 0,8 мм",
      ],
      prices: [
        { label: "Комплект дымохода", value: "97 500 ₽" },
        { label: "Монтаж", value: "35 000 ₽" },
      ],
    },
    photos: [
      { src: "/images/works/object-1/07.webp", alt: "Дымоход на зелёной кровле частного дома" },
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
    published: false,
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
    scenario: "Дымоход для ТТ-котла",
    details: {
      location: "Медное озеро",
      title: "Дымоход для твердотопливного котла",
      description: "Монтаж дымохода для твердотопливного котла.",
      specifications: [
        "Диаметр 200/300 мм",
        "Нержавеющая сталь AISI 321",
        "Толщина стали 0,8 мм",
      ],
      prices: [
        { label: "Комплект дымохода", value: "87 000 ₽" },
        { label: "Монтаж дымохода", value: "60 000 ₽" },
      ],
    },
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
    published: false,
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
    scenario: "Дымоход для деревянного дома",
    details: {
      location: "Остров Большой Берёзовый",
      title: "Монтаж дымохода в одноэтажном деревянном доме",
      description: "Дымоход с порошковой покраской в чёрный цвет.",
      specifications: ["Печь Everest T6", "Порошковая покраска — чёрный цвет"],
      prices: [
        { label: "Комплект дымохода", value: "65 000 ₽" },
        { label: "Печь Everest T6", value: "62 500 ₽" },
        {
          label: "Монтаж с доставкой и расходными материалами",
          value: "42 000 ₽",
        },
      ],
    },
    photos: [
      { src: "/images/works/object-5/03.webp", alt: "Печь Everest T6 с вертикальным дымоходом" },
      { src: "/images/works/object-5/02.webp", alt: "Чёрный дымоход на кровле деревянного дома" },
      { src: "/images/works/object-5/04.webp", alt: "Печь и защитный экран на стене" },
      { src: "/images/works/object-5/05.webp", alt: "Установленная у стены печь с дымоходом" },
    ],
  },
];

export function HomeWorksShowcase({ objectIds }: { objectIds?: number[] } = {}) {
  const publishedObjects = workObjects.filter((workObject) => workObject.published !== false);
  const filteredObjects = objectIds?.length
    ? publishedObjects.filter((workObject) => objectIds.includes(workObject.id))
    : publishedObjects;
  const visibleObjects = filteredObjects.length ? filteredObjects : publishedObjects;
  const [objectIndex, setObjectIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const activeObject = visibleObjects[objectIndex] ?? visibleObjects[0];
  const activePhoto = activeObject.photos[photoIndex];
  const activeLabel = activeObject.scenario ?? `Объект ${activeObject.id}`;

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
      <div className={`${styles.showcase} ${visibleObjects.length === 1 ? styles.singleObject : ""}`}>
        {visibleObjects.length > 1 ? <div className={styles.objectList} aria-label="Выбор объекта">
          {visibleObjects.map((workObject, index) => (
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
                <strong>{workObject.scenario ?? `Объект ${workObject.id}`}</strong>
                <small>
                  {workObject.details
                    ? `${workObject.details.location} · ${workObject.photos.length} фото`
                    : `${workObject.photos.length} фотографий`}
                </small>
              </span>
              <ChevronRight aria-hidden size={18} />
            </button>
          ))}
        </div> : null}

        <div className={styles.viewer} id="home-work-stage">
          <button
            aria-label={`Открыть ${activeLabel}, фотография ${photoIndex + 1}`}
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
                <strong>{activeLabel}</strong>
                <small>{photoIndex + 1} из {activeObject.photos.length}</small>
              </span>
              <span className={styles.openLabel}><Maximize2 aria-hidden size={17} /> Смотреть</span>
            </span>
          </button>

          {activeObject.details ? (
            <section
              aria-label={`Описание: ${activeLabel}`}
              className={styles.objectDetails}
            >
              <div className={styles.objectDescription}>
                <p className={styles.objectLocation}>{activeObject.details.location}</p>
                <h3>{activeObject.details.title}</h3>
                <p>{activeObject.details.description}</p>
                <ul aria-label="Характеристики дымохода">
                  {activeObject.details.specifications.map((specification) => (
                    <li key={specification}>{specification}</li>
                  ))}
                </ul>
              </div>
              <dl className={styles.objectPrices}>
                {activeObject.details.prices.map((price) => (
                  <div key={price.label}>
                    <dt>{price.label}</dt>
                    <dd>{price.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <div className={styles.photoStrip} aria-label={`Фотографии: ${activeLabel}`}>
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
        aria-label={`Фотографии: ${activeLabel}`}
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
            {activeLabel} · {photoIndex + 1} / {activeObject.photos.length}
          </span>
        </div>
      </dialog>
    </>
  );
}

import Image from "next/image";

export const YANDEX_MAPS_RATING = "4,9";

export function YandexRatingBadge() {
  return (
    <span
      className="yandex-rating-badge"
      aria-label={`Рейтинг компании ${YANDEX_MAPS_RATING} из 5 на Яндекс Картах`}
    >
      <Image
        className="yandex-rating-badge-icon"
        src="/images/home/yandex-maps-icon-user-v6.png"
        alt=""
        width={20}
        height={20}
        sizes="20px"
        aria-hidden="true"
      />
      <strong>{YANDEX_MAPS_RATING}</strong>
      <span>Яндекс Карты</span>
    </span>
  );
}

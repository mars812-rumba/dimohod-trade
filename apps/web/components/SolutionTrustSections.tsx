import Image from "next/image";
import {
  IconArrowUpRight as ArrowUpRight,
  IconBuildingFactory2 as Factory,
  IconChecklist as Checklist,
  IconShieldCheck as ShieldCheck,
  IconTruckDelivery as Truck,
} from "@tabler/icons-react";
import { solutionCertificates } from "@/lib/solutionTrust";
import styles from "./SolutionTrustSections.module.css";
import { InstallationTermsSection } from "./InstallationTermsSection";

const advantages = [
  {
    icon: Factory,
    title: "Собственное производство",
    text: "Изготавливаем дымоходы и комплектующие, поэтому знаем конструкцию каждого элемента.",
  },
  {
    icon: Checklist,
    title: "Состав комплекта и цены",
    text: "В расчёте — детали дымохода, их количество и доступные цены.",
  },
  {
    icon: ShieldCheck,
    title: "Проверка перед заказом",
    text: "Перед оформлением сверяем состав, параметры выбранных изделий и исходные данные объекта.",
  },
  {
    icon: Truck,
    title: "Доставка по России",
    text: "Способ и стоимость доставки уточняем после проверки состава и адреса получения.",
  },
] as const;

export function SolutionTrustSections({ assetBasePath = "", fireplace = false }: { assetBasePath?: string; fireplace?: boolean }) {
  const assetUrl = (path: string) => `${assetBasePath}${path}`;

  return (
    <>
      <InstallationTermsSection fireplace={fireplace} />
      <section className={styles.advantagesSection} aria-labelledby="advantages-title">
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <h2 id="advantages-title">Почему комплект заказывают у нас</h2>
            <p>
              От расчёта до отправки заказа работаем с одной системой изделий и проверяем состав
              перед оформлением.
            </p>
          </div>
          <div className={styles.advantageList}>
            {advantages.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon aria-hidden size={25} strokeWidth={1.65} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.certificatesSection} aria-labelledby="certificates-title">
        <div className={`${styles.shell} ${styles.certificatesLayout}`}>
          <div className={styles.certificatesIntro}>
            <h2 id="certificates-title">Документы на дымоходные системы</h2>
            <p>
              Показываем действующие документы открыто. Они относятся только к продукции,
              материалам и исполнениям, перечисленным внутри.
            </p>
            <p className={styles.certificateNote}>
              Безопасность готовой системы также зависит от корректного подбора, монтажа и условий
              эксплуатации.
            </p>
          </div>
          <div className={styles.certificateList}>
            {solutionCertificates.map((certificate) => (
              <article className={styles.certificate} key={certificate.id}>
                <a
                  className={styles.certificatePreview}
                  href={assetUrl(certificate.originalUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Открыть документ: ${certificate.title}`}
                >
                  <Image
                    alt={`Превью документа «${certificate.title}»`}
                    fill
                    sizes="(max-width: 680px) 38vw, 180px"
                    src={assetUrl(certificate.previewUrl)}
                  />
                </a>
                <div className={styles.certificateBody}>
                  <span>{certificate.validity}</span>
                  <h3>{certificate.title}</h3>
                  <p>{certificate.description}</p>
                  <a href={assetUrl(certificate.originalUrl)} target="_blank" rel="noopener noreferrer">
                    Открыть документ <ArrowUpRight aria-hidden size={17} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

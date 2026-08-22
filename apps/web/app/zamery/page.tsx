import type { Metadata } from "next";
import Link from "next/link";
import { MeasurementsWorkspace } from "@/components/MeasurementsWorkspace";
import type { MeasurementObjectType } from "@/lib/configuratorDraft";
import styles from "@/components/ScenarioPageTemplate.module.css";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Мои замеры для расчёта дымохода — Дымоход Трейд",
  description: "Создавайте, редактируйте и сохраняйте на этом устройстве замеры объектов для дальнейшей загрузки в конфигуратор дымохода.",
  alternates: { canonical: "/zamery" },
  openGraph: {
    type: "website",
    url: "/zamery",
    title: "Мои замеры для расчёта дымохода",
    description: "Сохранённые на устройстве размеры объекта, отопителя и выбранного маршрута дымохода.",
  },
};

type MeasurementsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const objectTypes: MeasurementObjectType[] = ["banya", "house", "boiler-room", "other"];

export default async function MeasurementsPage({ searchParams }: MeasurementsPageProps) {
  const params = await searchParams;
  const profileId = typeof params.profile === "string" ? params.profile : "";
  const objectParam = typeof params.object === "string" ? params.object : "";
  const initialRoute = typeof params.route === "string" ? params.route : "";
  const initialObjectType = objectTypes.includes(objectParam as MeasurementObjectType)
    ? objectParam as MeasurementObjectType
    : undefined;
  const edit = params.edit === "1" || Boolean(profileId);

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Мои замеры</span>
        </nav>
      </div>
      <header className={styles.measurementsPageHeader}>
        <div className={styles.shell}>
          <h1>{edit ? (profileId ? "Редактирование замеров" : "Новый замер") : "Мои замеры"}</h1>
          <p>
            {edit
              ? "Заполните известные размеры выбранного маршрута. Профиль можно сохранить и позже открыть снова."
              : "Храните несколько объектов и вариантов маршрута под понятными именами, а затем загружайте нужный профиль в конфигуратор."}
          </p>
        </div>
      </header>
      <MeasurementsWorkspace
        assetBasePath={assetBasePath}
        edit={edit}
        initialObjectType={initialObjectType}
        initialRoute={initialRoute}
        profileId={profileId}
      />
    </main>
  );
}

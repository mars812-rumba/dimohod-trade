"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowRight as ArrowRight,
  IconCopy as Copy,
  IconHome as House,
  IconPencil as Pencil,
  IconPlus as Plus,
  IconRuler as Ruler,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  calculationProfileConfiguratorHref,
  calculationProfileMeasurementsHref,
  deleteCalculationProfile,
  duplicateCalculationProfile,
  readCalculationProfiles,
  type CalculationProfile,
} from "@/lib/calculationProfiles";
import type { MeasurementObjectType } from "@/lib/configuratorDraft";
import { banyaScenario } from "@/lib/scenarioPages";
import { BanyaIntakeFlow } from "./BanyaIntakeFlow";
import styles from "./MeasurementsWorkspace.module.css";

const objectLabels: Record<MeasurementObjectType, string> = {
  banya: "Баня",
  house: "Дом",
  "boiler-room": "Котельная",
  other: "Другой объект",
};

const routeLabels: Record<CalculationProfile["routeMeasurements"]["kind"], string> = {
  ceiling: "Через перекрытия и кровлю",
  "wall-top": "Верхний патрубок → через стену",
  "wall-rear": "Задний патрубок → через стену",
  unknown: "Маршрут ещё не выбран",
};

type MeasurementsWorkspaceProps = {
  assetBasePath?: string;
  edit?: boolean;
  initialObjectType?: MeasurementObjectType;
  initialRoute?: string;
  profileId?: string;
};

export function MeasurementsWorkspace({
  assetBasePath = "",
  edit = false,
  initialObjectType,
  initialRoute = "",
  profileId = "",
}: MeasurementsWorkspaceProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<CalculationProfile[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [ready, setReady] = useState(false);

  const refresh = () => {
    try {
      setProfiles(readCalculationProfiles(window.localStorage));
    } catch {
      setProfiles([]);
    }
  };

  useEffect(() => {
    refresh();
    setReady(true);
    const handleChange = () => refresh();
    window.addEventListener("dimohod-trade:measurement-profiles-changed", handleChange);
    return () => window.removeEventListener("dimohod-trade:measurement-profiles-changed", handleChange);
  }, []);

  if (edit) {
    return (
      <>
        <div className={styles.editorBar}>
          <Link href="/zamery">← Вернуться к моим замерам</Link>
          <span>Сохранение доступно только в этом браузере</span>
        </div>
        <BanyaIntakeFlow
          assetBasePath={assetBasePath}
          content={banyaScenario}
          initialObjectType={initialObjectType}
          initialProfileId={profileId}
          initialRoute={initialRoute}
          onProfileSaved={refresh}
        />
      </>
    );
  }

  const removeProfile = (profileIdToDelete: string) => {
    if (confirmDeleteId !== profileIdToDelete) {
      setConfirmDeleteId(profileIdToDelete);
      return;
    }
    deleteCalculationProfile(window.localStorage, profileIdToDelete);
    setConfirmDeleteId("");
    refresh();
  };

  const duplicateProfile = (profileIdToDuplicate: string) => {
    const copy = duplicateCalculationProfile(window.localStorage, profileIdToDuplicate);
    if (copy) router.push(calculationProfileMeasurementsHref(copy.id));
  };

  return (
    <section className={styles.workspace} aria-labelledby="measurements-list-title">
      <div className={styles.workspaceHead}>
        <div>
          <h2 id="measurements-list-title">Сохранённые объекты</h2>
          <p>Каждый вариант хранит один маршрут. Создайте копию, чтобы сравнить другой способ прокладки.</p>
        </div>
        <Link className={styles.newButton} href="/zamery?edit=1&object=banya">
          <Plus aria-hidden size={18} />
          Новый замер
        </Link>
      </div>

      {!ready ? <p className={styles.status} role="status">Загружаем замеры…</p> : null}

      {ready && profiles.length === 0 ? (
        <div className={styles.emptyState}>
          <Ruler aria-hidden size={34} />
          <h3>Замеров пока нет</h3>
          <p>Создайте первый объект. Неизвестные размеры можно оставить на потом и дополнить при следующем открытии.</p>
          <div className={styles.objectStarts}>
            <Link href="/zamery?edit=1&object=banya">Начать с бани</Link>
            <Link href="/zamery?edit=1&object=house">Начать с дома</Link>
            <Link href="/zamery?edit=1&object=boiler-room">Начать с котельной</Link>
          </div>
        </div>
      ) : null}

      {profiles.length ? (
        <ul className={styles.profileList}>
          {profiles.map((profile) => (
            <li className={styles.profileRow} key={profile.id}>
              <div className={styles.profileIcon} aria-hidden>
                {profile.objectType === "house" ? <House size={22} /> : <Ruler size={22} />}
              </div>
              <div className={styles.profileSummary}>
                <h3>{profile.name}</h3>
                <p>{objectLabels[profile.objectType]} · {routeLabels[profile.routeMeasurements.kind]}</p>
                <small>Изменён {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(profile.updatedAt))}</small>
              </div>
              <div className={styles.profileActions}>
                <Link href={calculationProfileMeasurementsHref(profile.id)}>
                  <Pencil aria-hidden size={16} />
                  Редактировать
                </Link>
                <button onClick={() => duplicateProfile(profile.id)} type="button">
                  <Copy aria-hidden size={16} />
                  Создать вариант
                </button>
                <Link className={styles.primaryAction} href={calculationProfileConfiguratorHref(profile.id)}>
                  В конфигуратор
                  <ArrowRight aria-hidden size={16} />
                </Link>
                <button
                  aria-label={confirmDeleteId === profile.id ? `Подтвердить удаление замера ${profile.name}` : `Удалить замер ${profile.name}`}
                  className={styles.deleteAction}
                  data-confirm={confirmDeleteId === profile.id || undefined}
                  onClick={() => removeProfile(profile.id)}
                  type="button"
                >
                  <Trash2 aria-hidden size={16} />
                  {confirmDeleteId === profile.id ? "Удалить точно" : "Удалить"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className={styles.storageNote}>Замеры находятся только на этом устройстве и не передаются на сервер. После очистки данных браузера они будут удалены.</p>
    </section>
  );
}

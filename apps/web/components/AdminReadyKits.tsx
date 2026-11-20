"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { kitPath, kitRub, type ReadyKit, type ReadyKitContent } from "@/lib/readyKits";
import styles from "./AdminReadyKits.module.css";

type Definition = {
  slug: string; route: string; height_m: number; diameter_mm: number; revision: number;
  status: "draft" | "approved"; published: boolean; source_revision: number | null;
  description: string; limitations: string[]; lines: { sku_id: string; quantity: number; label: string }[];
  preparation_basis: string | null; approval_notes: string[];
  content?: ReadyKitContent | null;
};
type Entry = { definition: Definition; name: string; problems: string[]; preview: ReadyKit };
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function KitEditor({ entry, onSaved }: { entry: Entry; onSaved: (next: Entry) => void }) {
  const { definition: d } = entry;
  const [lines, setLines] = useState(JSON.stringify(d.lines, null, 2));
  const [description, setDescription] = useState(d.content?.application_description ?? d.description);
  const [content, setContent] = useState<ReadyKitContent>(d.content ?? {
    short_description: "", application_description: d.description, composition_description: "",
    selection_checklist: [], faq: [], seo_description: "",
  });
  const [checklist, setChecklist] = useState(d.content?.selection_checklist.join("\n") ?? "");
  const [limitations, setLimitations] = useState(d.limitations.join("\n"));
  const [approved, setApproved] = useState(d.status === "approved");
  const [published, setPublished] = useState(d.published);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setMessage(""); setBusy(true);
    try {
      const parsed: unknown = JSON.parse(lines);
      if (!Array.isArray(parsed)) throw new Error("BOM должен быть массивом строк");
      if (content.faq.some(item => !item.question.trim() || !item.answer.trim())) {
        throw new Error("Заполните вопрос и ответ для каждого пункта FAQ или удалите пустой пункт");
      }
      const response = await fetch(`${base}/api/v1/admin/ready-kits/${d.slug}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: d.revision, lines: parsed, description,
          content: { ...content, application_description: description,
            selection_checklist: checklist.split("\n").map(text => text.trim()).filter(Boolean) },
          limitations: limitations.split("\n").map(text => text.trim()).filter(Boolean), approved, published }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail));
      onSaved(data); setMessage("Сохранено");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка сохранения"); }
    finally { setBusy(false); }
  }
  return <details className={styles.entry}>
    <summary><strong>{entry.name}</strong><span>{d.status === "approved" ? "СОГЛАСОВАН" : "НЕ СОГЛАСОВАН"} · {d.published && !entry.problems.length ? "Опубликован" : "Не опубликован"}</span><span>{kitRub(entry.preview.total_rub)} · редакция {d.revision}</span></summary>
    <div className={styles.editor}>
      <p>{d.source_revision ? `Основа: очищенный снимок согласованной сметы, редакция ${d.source_revision}.` : d.preparation_basis ? `Подготовлен по составу ${d.preparation_basis}: сохранены количества и исполнения, диаметрозависимые позиции заменены точными SKU каталога. ${d.status === "approved" ? "Этот диаметр согласован владельцем; проходной стакан, фланцы 600×600 и мастер-флеш оставлены как в Ø115." : "Требуется согласование этого диаметра."}` : "Собственный состав этого варианта ещё необходимо согласовать."}</p>
      {d.status === "draft" && d.approval_notes.length ? <section><h3>Что проверить перед согласованием</h3><ul>{d.approval_notes.map((note, index) => <li key={index}>{note}</li>)}</ul></section> : null}
      {entry.problems.length ? <ul role="status">{entry.problems.map((text, index) => <li key={index}>{text}</li>)}</ul> : null}
      {entry.preview.lines.length ? <div className={styles.preview}>{entry.preview.lines.map((line, index) => <p key={index}><strong>{line.quantity} × {line.label}</strong><br />{line.article} · {line.characteristics.join(" · ")}<br />{kitRub(line.unit_price_rub)} / шт. → {kitRub(line.line_total_rub)}</p>)}<strong>Итого по текущим ценам: {kitRub(entry.preview.total_rub)}</strong></div> : null}
      <label>Состав BOM — конкретные SKU и количества
        <textarea rows={14} spellCheck={false} value={lines} onChange={event => { setLines(event.target.value); setApproved(false); setPublished(false); }} />
      </label>
      <p>Формат строки: <code>{'{"sku_id":"UUID существующего SKU","quantity":1,"label":"Название строки"}'}</code>. Цены здесь не сохраняются — они берутся из каталога. Неизвестные SKU можно оставить в черновике, но согласование будет запрещено.</p>
      <h3>Тексты карточки</h3>
      <p>Редактируется выбранный диаметр. Цены и характеристики в спецификации по-прежнему берутся из каталога. При изменении BOM проверьте соответствие текстов новому составу.</p>
      <label>Короткое описание<textarea aria-label="Короткое описание" rows={3} maxLength={1200} value={content.short_description} onChange={event => setContent({ ...content, short_description: event.target.value })} /></label>
      <label>Описание применения<textarea aria-label="Описание применения" rows={6} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label>Пояснение к составу<textarea aria-label="Пояснение к составу" rows={4} maxLength={2400} value={content.composition_description} onChange={event => setContent({ ...content, composition_description: event.target.value })} /></label>
      <label>Что подготовить перед заказом — по одному пункту на строку<textarea aria-label="Что подготовить перед заказом — по одному пункту на строку" rows={6} value={checklist} onChange={event => setChecklist(event.target.value)} /></label>
      <label>SEO Description<textarea aria-label="SEO Description" rows={3} maxLength={320} value={content.seo_description} onChange={event => setContent({ ...content, seo_description: event.target.value })} /></label>
      <p>В SEO Description можно использовать <code>{"{diameter}"}</code> — подставится диаметр этого комплекта. Пустое поле использует прежнее SEO-описание. URL, H1, Title и canonical не меняются.</p>
      <section className={styles.faqEditor} aria-label="Редактор FAQ">
        <h3>Вопросы и ответы</h3>
        {content.faq.map((item, index) => <div key={index} className={styles.faqRow}>
          <label>Вопрос {index + 1}<textarea aria-label={`Вопрос ${index + 1}`} rows={2} maxLength={240} value={item.question} onChange={event => setContent({ ...content, faq: content.faq.map((row, i) => i === index ? { ...row, question: event.target.value } : row) })} /></label>
          <label>Ответ {index + 1}<textarea aria-label={`Ответ ${index + 1}`} rows={4} maxLength={2400} value={item.answer} onChange={event => setContent({ ...content, faq: content.faq.map((row, i) => i === index ? { ...row, answer: event.target.value } : row) })} /></label>
          <button type="button" onClick={() => setContent({ ...content, faq: content.faq.filter((_, i) => i !== index) })}>Удалить вопрос {index + 1}</button>
        </div>)}
        <button type="button" disabled={content.faq.length >= 20} onClick={() => setContent({ ...content, faq: [...content.faq, { question: "", answer: "" }] })}>Добавить вопрос</button>
      </section>
      <label>Условия и ограничения — по одному на строку<textarea rows={5} value={limitations} onChange={event => setLimitations(event.target.value)} /></label>
      <label className={styles.check}><input type="checkbox" checked={approved} onChange={event => { setApproved(event.target.checked); if (!event.target.checked) setPublished(false); }} />Подтверждаю согласование именно этого состава и диаметра</label>
      <label className={styles.check}><input type="checkbox" checked={published} disabled={!approved} onChange={event => setPublished(event.target.checked)} />Публиковать покупателям</label>
      <div className={styles.actions}><button onClick={() => void save()} disabled={busy}>{busy ? "Сохраняем…" : "Сохранить комплект"}</button>{d.status === "approved" && d.published && !entry.problems.length ? <Link href={kitPath(d.slug)} target="_blank">Открыть публичную карточку ↗</Link> : null}</div>
      <p role="status">{message}</p>
    </div>
  </details>;
}

export function AdminReadyKits() {
  const router = useRouter();
  const [items, setItems] = useState<Entry[]>([]);
  const [message, setMessage] = useState("Загружаем комплекты…");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${base}/api/v1/admin/ready-kits`, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (response.status === 401) { router.replace("/admin/login?next=/admin/ready-kits"); return null; }
        if (!response.ok) throw new Error("Не удалось загрузить комплекты");
        return response.json() as Promise<{ items: Entry[] }>;
      }).then(data => { if (data) { setItems(data.items); setMessage(""); } })
      .catch(error => { if (error.name !== "AbortError") setMessage(error.message); });
    return () => controller.abort();
  }, [router]);
  return <main className={styles.page}>
    <nav><Link href="/admin/catalog">← Каталог</Link><Link href="/komplekty">Публичные комплекты ↗</Link></nav>
    <h1>Готовые комплекты</h1><p>4 состава × 3 диаметра. Черновики и неподтверждённые составы покупателям не выдаются. Изменение BOM снимает согласование в форме до явного подтверждения.</p>
    <p role="status">{message}</p>
    {items.map(entry => <KitEditor key={entry.definition.slug} entry={entry} onSaved={next => setItems(current => current.map(item => item.definition.slug === next.definition.slug ? next : item))} />)}
  </main>;
}

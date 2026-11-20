// Presentation only: preserve every supplied sentence and numeric value.
const breaks: Record<string, [string, string][]> = {
  "roof-4": [["Для подбора полезен разрез", "Данные для подбора"], ["Обозначение «4 м»", "Что означает высота"]],
  "roof-6": [["Нанесите место установки отопителя", "Данные для подбора"], ["Для сравнения с коротким комплектом", "Что означает высота"], ["Для заказа запросите", "Перед заказом"]],
  "wall-3": [["Затем посмотрите на это место снаружи", "Проход и опора"], ["Обозначение «3 м»", "Что означает высота"], ["Для подбора передайте", "Данные для подбора"]],
  "wall-6": [["Покажите материал основания", "Данные для подбора"], ["Величина «6 м»", "Что означает высота"]],
};

export function kitApplicationSections(text: string, route: string, height: number) {
  const boundaries = [{ start: 0, title: "Маршрут дымохода" }, ...(breaks[`${route}-${height}`] ?? [])
    .map(([marker, title]) => ({ start: text.indexOf(marker), title })).filter(item => item.start > 0)]
    .sort((a, b) => a.start - b.start);
  return boundaries.map((item, index) => {
    const body = text.slice(item.start, boundaries[index + 1]?.start).trim();
    // Respect editor paragraphs; split long custom paragraphs at sentence boundaries.
    const paragraphs = body.split(/\n\s*\n/).flatMap(paragraph => {
      const sentences = paragraph.trim().split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«])/u);
      const chunks: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) chunks.push(sentences.slice(i, i + 2).join(" "));
      return chunks.filter(Boolean);
    });
    return { title: item.title, paragraphs };
  }).filter(item => item.paragraphs.length);
}

export function kitChecklistIcon(text: string): "camera" | "ruler" | "clipboard" {
  if (/фото|сним|сфотограф/iu.test(text)) return "camera";
  if (/измер|высот|расстояни|толщин|размер|уклон|уровн|отмет/iu.test(text)) return "ruler";
  return "clipboard";
}

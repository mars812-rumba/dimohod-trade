export default function ProductLoading() {
  return (
    <main className="page product-loading" aria-busy="true" aria-label="Загружается карточка товара">
      <div className="product-loading-line product-loading-breadcrumb" />

      <div className="product-layout">
        <div className="product-main">
          <div className="product-loading-image" aria-hidden="true">
            <span />
          </div>
          <div className="product-loading-line product-loading-eyebrow" />
          <div className="product-loading-line product-loading-title" />
          <div className="product-loading-line product-loading-lead" />
          <div className="product-loading-line product-loading-lead product-loading-lead-short" />

          <section className="product-loading-specs" aria-hidden="true">
            <div className="product-loading-line product-loading-section-title" />
            {Array.from({ length: 5 }, (_, index) => (
              <div className="product-loading-spec-row" key={index}>
                <span className="product-loading-line" />
                <strong className="product-loading-line" />
              </div>
            ))}
          </section>
        </div>

        <aside className="product-loading-panel" aria-hidden="true">
          <div className="product-loading-line product-loading-panel-title" />
          <div className="product-loading-line product-loading-select" />
          <div className="product-loading-line product-loading-select" />
          <div className="product-loading-line product-loading-price" />
          <div className="product-loading-line product-loading-button" />
        </aside>
      </div>
      <span className="sr-only">Загружаем товар и доступные исполнения…</span>
    </main>
  );
}

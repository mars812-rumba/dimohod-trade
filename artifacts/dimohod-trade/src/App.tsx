import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { Search, Phone } from "lucide-react";
import { Link } from "wouter";
import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import ProductPage from "@/pages/ProductPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient();

function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Дымоход Трейд — главная">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Дымоход Трейд" className="brand-logo" />
        <span className="brand-name">
          <span className="brand-name-top">Дымоход Трейд</span>
          <span className="brand-name-sub">Санкт-Петербург</span>
        </span>
      </Link>

      <nav className="top-nav" aria-label="Основная навигация">
        <Link href="/catalog">Каталог</Link>
        <Link href="/catalog?scenario=banya">Для бани</Link>
        <Link href="/catalog?scenario=kamin">Для камина</Link>
        <Link href="/catalog?scenario=gaz">Для газа</Link>
      </nav>

      <div className="header-right">
        <a href="tel:+79650756555" className="header-phone">
          <Phone size={14} />
          +7 (965) 075-65-55
        </a>
        <button type="button" className="icon-button" aria-label="Поиск">
          <Search size={17} />
        </button>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/catalog" component={CatalogPage} />
      <Route path="/product/:slug" component={ProductPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <SiteHeader />
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

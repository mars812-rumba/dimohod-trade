import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { Flame, Search, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import ProductPage from "@/pages/ProductPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient();

function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Dimohod Trade">
        <span className="brand-mark">
          <Flame size={18} strokeWidth={2.2} />
        </span>
        <span>Dimohod Trade</span>
      </Link>
      <nav className="top-nav" aria-label="Основная навигация">
        <Link href="/catalog">Каталог</Link>
        <button type="button" aria-label="Поиск" title="Поиск">
          <Search size={18} />
        </button>
        <button type="button" aria-label="Корзина" title="Корзина">
          <ShoppingCart size={18} />
        </button>
      </nav>
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

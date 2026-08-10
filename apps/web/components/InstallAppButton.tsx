"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function InstallAppButton({ basePath = "" }: { basePath?: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [helpText, setHelpText] = useState("");

  useEffect(() => {
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => {
      setIsInstalled(standaloneMedia.matches || Boolean((navigator as NavigatorWithStandalone).standalone));
    };
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setHelpText("");
    };
    const markInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setHelpText("");
    };
    const registerServiceWorker = () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => undefined);
      }
    };

    updateInstalledState();
    standaloneMedia.addEventListener("change", updateInstalledState);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);
    if (document.readyState === "complete") registerServiceWorker();
    else window.addEventListener("load", registerServiceWorker, { once: true });

    return () => {
      standaloneMedia.removeEventListener("change", updateInstalledState);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
      window.removeEventListener("load", registerServiceWorker);
    };
  }, [basePath]);

  if (isInstalled) return null;

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setHelpText(
      isIos
        ? "В Safari нажмите «Поделиться», затем «На экран Домой»."
        : "Откройте меню браузера и выберите «Установить приложение».",
    );
  }

  return (
    <div className="install-app">
      <button
        aria-controls="install-app-help"
        aria-expanded={Boolean(helpText)}
        className="install-app-button"
        onClick={installApp}
        title="Установить веб-приложение"
        type="button"
      >
        <Download aria-hidden size={16} />
        <span className="install-app-label">Установить</span>
      </button>
      {helpText ? (
        <div className="install-app-help" id="install-app-help" role="status">
          {helpText}
        </div>
      ) : null}
    </div>
  );
}

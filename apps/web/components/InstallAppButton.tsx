"use client";

import { Download } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

declare global {
  interface Window {
    __dimohodInstallPrompt?: BeforeInstallPromptEvent;
    __dimohodInstallPromptPath?: string;
  }
}

function isAdminPath(pathname: string) {
  return /(^|\/)admin(?:\/|$)/.test(pathname);
}

export function InstallAppButton() {
  const pathname = usePathname();
  const installsAdmin = isAdminPath(pathname);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => {
      setIsInstalled(standaloneMedia.matches || Boolean((navigator as NavigatorWithStandalone).standalone));
    };
    const captureInstallPrompt = () => {
      const prompt = window.__dimohodInstallPrompt ?? null;
      const promptPath = window.__dimohodInstallPromptPath ?? window.location.pathname;
      setInstallPrompt(prompt && isAdminPath(promptPath) === installsAdmin ? prompt : null);
    };
    const markInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    updateInstalledState();
    captureInstallPrompt();
    standaloneMedia.addEventListener("change", updateInstalledState);
    window.addEventListener("dimohod:pwa-install-ready", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);

    return () => {
      standaloneMedia.removeEventListener("change", updateInstalledState);
      window.removeEventListener("dimohod:pwa-install-ready", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, [installsAdmin]);

  if (isInstalled || !installPrompt) return null;

  async function installApp() {
    const prompt = installPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    window.__dimohodInstallPrompt = undefined;
    window.__dimohodInstallPromptPath = undefined;
    setInstallPrompt(null);
  }

  return (
    <div className="install-app">
      <button
        className="install-app-button"
        onClick={installApp}
        title={installsAdmin ? "Установить админку" : "Установить веб-приложение"}
        type="button"
      >
        <Download aria-hidden size={16} />
        <span className="install-app-label">
          {installsAdmin ? "Установить админку" : "Установить"}
        </span>
      </button>
    </div>
  );
}

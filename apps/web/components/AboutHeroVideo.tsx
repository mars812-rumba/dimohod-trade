"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AboutHeroVideo.module.css";

export function AboutHeroVideo({ assetBasePath = "" }: { assetBasePath?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: 0.1 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [enabled, failed]);

  return <>
    <div className={styles.backdrop} style={{ backgroundImage: `url("${assetBasePath}/images/home/hero-projects/0826-poster.webp")` }} aria-hidden="true">
      {enabled && !failed ? <video ref={videoRef} autoPlay muted loop playsInline preload="metadata"
        poster={`${assetBasePath}/images/home/hero-projects/0826-poster.webp`}
        src={`${assetBasePath}/videos/home/0826.mp4`} onError={() => setFailed(true)} /> : null}
    </div>
  </>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../app/page.module.css";

export function HeroSmoke() {
  const smokeRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const smoke = smokeRef.current;
    if (!smoke) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(smoke);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden="true"
      className={styles.heroSmoke}
      data-active={isVisible}
      ref={smokeRef}
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

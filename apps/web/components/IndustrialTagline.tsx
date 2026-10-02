"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "@/app/promyshlennye-dymohody/page.module.css";

const words = "Труба, узлы и несущие конструкции в одной заявке по параметрам вашего объекта.".split(" ");

export function IndustrialTagline() {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <p className={styles.tagline} data-visible={visible} ref={rootRef}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          style={{ "--word-index": index } as CSSProperties}
        >
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

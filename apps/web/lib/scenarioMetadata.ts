import type { Metadata } from "next";
import type { ScenarioPageContent } from "@/lib/scenarioPages";

export function scenarioMetadata(content: ScenarioPageContent): Metadata {
  const canonical = `/solutions/${content.slug}`;
  const heroDimensions = content.slug === "dom"
    ? { width: 720, height: 1280 }
    : { width: 1254, height: 1254 };

  return {
    title: content.metadata.title,
    description: content.metadata.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: content.metadata.title,
      description: content.metadata.description,
      images: [
        {
          url: content.heroImage,
          ...heroDimensions,
          alt: content.heroImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: content.metadata.title,
      description: content.metadata.description,
      images: [content.heroImage],
    },
  };
}

import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { ProductExperience } from "@/components/ProductExperience";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return <ProductExperience product={product} />;
}

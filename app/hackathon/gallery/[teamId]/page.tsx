import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getGalleryProduct } from "@/lib/hackathon/gallery";
import { getPlaceholderProduct } from "@/lib/hackathon/gallery-placeholders";
import ProductDetail from "@/components/hackathon/gallery/ProductDetail";
import { ProductPageTracker } from "@/components/hackathon/gallery/GalleryTracker";

export const revalidate = 60;

interface Props {
  params: Promise<{ teamId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamId } = await params;
  const product = (await getGalleryProduct(teamId)) ?? getPlaceholderProduct(teamId);
  if (!product) return { title: "Product not found | Hackathon Gallery" };

  return {
    title: `${product.product_name} by ${product.team?.name} | Hackathon Gallery`,
    description: product.problem_statement,
    openGraph: {
      title: product.product_name,
      description: product.problem_statement,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { teamId } = await params;
  const product = (await getGalleryProduct(teamId)) ?? getPlaceholderProduct(teamId);

  if (!product) notFound();

  return (
    <>
      <ProductPageTracker productId={product.id} />
      <ProductDetail product={product} />
    </>
  );
}

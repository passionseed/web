import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { getGalleryProducts, getAllTags } from "@/lib/hackathon/gallery";
import { PLACEHOLDER_PRODUCTS } from "@/lib/hackathon/gallery-placeholders";
import GalleryWithWave from "@/components/hackathon/gallery/GalleryWithWave";
import ThemeToggle from "@/components/hackathon/gallery/ThemeToggle";
import LangToggle from "@/components/hackathon/gallery/LangToggle";
import JellyfishBackground from "@/components/hackathon/gallery/JellyfishBackground";
import { GalleryPageTracker } from "@/components/hackathon/gallery/GalleryTracker";

export const metadata: Metadata = {
  title: "Product Gallery | PassionSeed Hackathon",
  description:
    "Products built at the PassionSeed hackathon — ready to solve real problems. Browse and connect with the teams behind them.",
};

export const revalidate = 60;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  let products = await getGalleryProducts();

  if (products.length === 0) {
    products = PLACEHOLDER_PRODUCTS.map((p) => ({
      ...p,
      interest_count: Math.floor(Math.random() * 30),
    }));
  }

  const allTags = getAllTags(products);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bloom-bg)" }}>
      <GalleryPageTracker />
      <JellyfishBackground />

      {/* Hero band — steel-blue grainy gradient */}
      <div
        className="bloom-hero"
        style={{ paddingBottom: "clamp(2.5rem, 5vw, 3.5rem)" }}
      >
        <div className="bloom-hero__grain" aria-hidden="true" />

        {/* Nav */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(1.25rem, 5vw, 3rem)",
            height: "64px",
          }}
        >
          <Link href="/hackathon/past/healthcare" style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
            <img
              src="/hackathon/HackLogo.png"
              alt="The Next Decade Hackathon"
              style={{ height: "36px", width: "auto", objectFit: "contain", filter: "drop-shadow(0 1px 8px rgba(20,40,80,0.30))" }}
            />
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LangToggle onHero />
            <ThemeToggle />
          </div>
        </nav>

        {/* Hero copy */}
        <header
          style={{
            padding: "clamp(1.5rem, 3vw, 2.5rem) clamp(1.25rem, 5vw, 3rem) 0",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-kodchasan), var(--font-libre-franklin), sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: "0 0 0.875rem",
              textWrap: "balance",
              maxWidth: "22ch",
              textShadow: "0 2px 16px rgba(20,40,80,0.35)",
            } as React.CSSProperties}
          >
            Products built at The Next Decade Hackathon
          </h1>
          <p
            style={{
              fontFamily: "var(--font-bai-jamjuree), var(--font-libre-franklin), sans-serif",
              fontSize: "clamp(0.9375rem, 1.8vw, 1.0625rem)",
              color: "rgba(255,255,255,0.72)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "52ch",
              textWrap: "pretty",
            } as React.CSSProperties}
          >
            Student teams spent 3 months building solutions to real healthcare problems.
            If something here could help you, reach out directly to the team.
          </p>
          <Link
            href="/hackathon/gallery/match"
            className="bloom-button"
            style={{
              marginTop: "1.25rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9375rem",
              textDecoration: "none",
            }}
          >
            <span className="bloom-button__grain" aria-hidden="true" />
            <span aria-hidden="true">🐋</span>
            Not sure which product is for you?
          </Link>
        </header>
      </div>

      {/* Ambient bleed — carries blue haze into the content area, dissolves gradually */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          height: 0,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 50% 0%, rgba(70, 120, 180, 0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
            zIndex: 0,
          }}
        />
      </div>

      {/* Gallery with filters */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(1.5rem, 3vw, 2.5rem) clamp(1.25rem, 5vw, 3rem) 5rem",
        }}
      >
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryWithWave
            products={products}
            allTags={allTags}
            initialTag={tag}
          />
        </Suspense>
      </main>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "1.25rem",
        marginTop: "2rem",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bloom-card"
          style={{ overflow: "hidden" }}
          aria-hidden="true"
        >
          <div
            style={{
              aspectRatio: "16/9",
              background: "linear-gradient(90deg, var(--bloom-border-subtle) 0%, var(--bloom-border-default) 50%, var(--bloom-border-subtle) 100%)",
              backgroundSize: "200% 100%",
              animation: "bloom-shimmer-skeleton 1.6s ease-in-out infinite",
            }}
          />
          <div className="p-5 flex flex-col gap-3">
            <div style={{ height: "14px", width: "60px", borderRadius: "999px", background: "var(--bloom-border-default)" }} />
            <div style={{ height: "22px", width: "75%", borderRadius: "6px", background: "var(--bloom-border-default)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ height: "14px", width: "100%", borderRadius: "4px", background: "var(--bloom-border-subtle)" }} />
              <div style={{ height: "14px", width: "80%", borderRadius: "4px", background: "var(--bloom-border-subtle)" }} />
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes bloom-shimmer-skeleton {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="bloom-shimmer-skeleton"] { animation: none; }
        }
      `}</style>
    </div>
  );
}

import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/hero-section";
import { ProductDemoSection } from "@/components/landing/product-demo-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQSection } from "@/components/landing/faq-section";
import { CTASection } from "@/components/landing/cta-section";
import { PublicNavbar } from "@/components/nowts/public-navbar";

export const metadata: Metadata = {
  title: "WebPerfekt - Audit Web Pro : Performance, SEO, Sécurité en 3 minutes", // Titre plus percutant, avec le nom du produit
  description:
    "WebPerfekt : Obtenez des audits complets de performance, SEO, sécurité et modernité pour votre site web. Essai gratuit - 3 audits offerts pour les pros.", // Description avec le nom et plus de bénéfices
  keywords: [
    // Les mots-clés restent pertinents pour votre propre organisation
    "WebPerfekt",
    "audit site web",
    "performance web",
    "SEO",
    "sécurité web",
    "analyse site",
    "audit professionnel",
    "outils web",
  ],
  openGraph: {
    title: "WebPerfekt : L'Audit Web Complet pour les Pros en France", // Titre OG percutant
    description:
      "Analysez et optimisez votre site web avec WebPerfekt, nos audits experts en performance, SEO et sécurité. Essai gratuit pour les pros.", // Description OG
    type: "website",
    url: "https://www.webperfekt.fr", // TRÈS IMPORTANT : URL canonique de votre page d'accueil
    siteName: "WebPerfekt", // Le nom de votre marque
    images: [
      {
        url: "https://www.webperfekt.fr/images/og-image-webperfekt.jpg", // L'URL ABSOLUE de votre image OG
        width: 1200,
        height: 630,
        alt: "WebPerfekt - Audit Web Complet Performance, SEO, Sécurité", // Texte alternatif pour l'accessibilité
      },
    ],
    locale: "fr_FR", // Spécifier la langue pour une meilleure interprétation
  },
  twitter: {
    card: "summary_large_image",
    title: "WebPerfekt : L'Audit Web Pro qui change la donne en 3 minutes", // Titre Twitter légèrement différent pour A/B testing potentiel
    description:
      "WebPerfekt : Audits experts en performance, SEO et sécurité pour les professionnels du web. Gagnez du temps et améliorez vos projets. Essai gratuit.",
    images: ["https://www.webperfekt.fr/images/og-image-webperfekt.jpg"],
    creator: "@WebPerfektApp", // Remplacer par votre pseudo Twitter si vous en avez un pour le produit
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <PublicNavbar />

      {/* Main Content */}
      <div className="from-background via-background to-muted/20 bg-gradient-to-br">
        {/* Hero Section */}
        <HeroSection />

        {/* Product Demo Section (Unified Features + How it works) */}
        <ProductDemoSection />

        {/* Social Proof & Testimonials */}
        <TestimonialsSection />

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Section */}
        <FAQSection />

        {/* Final CTA */}
        <CTASection />
      </div>
    </div>
  );
}

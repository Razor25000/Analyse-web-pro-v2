export const SiteConfig = {
  title: "WebPerfekt",
  description: "Analysez et optimisez votre site web avec WebPerfekt, nos audits experts en performance, SEO et sécurité. Essai gratuit pour les pros.",
  prodUrl: "https://www.webperfekt.fr",
  appId: "webperfekt",
  domain: "www.webperfekt.fr",
  appIcon: "/images/icon.png",
  company: {
    name: "InnovWebDesign",
    address: "29 impasse du Bouillet, 25220 Roche lez Beaupré", // Remove if not needed
  },
  brand: {
    primary: "#007291", // You can adjust this to your brand color
  },
  team: {
    image: "https://melvynx.com/images/me/twitter-en.jpg",
    website: "https://innovwebdesign.com",
    name: "Régis Laffond",
  },
  features: {
    /**
     * If enable, you need to specify the logic of upload here : src/features/images/uploadImageAction.tsx
     * You can use Vercel Blob Storage : https://vercel.com/docs/storage/vercel-blob
     * Or you can use Cloudflare R2 : https://mlv.sh/cloudflare-r2-tutorial
     * Or you can use AWS S3 : https://mlv.sh/aws-s3-tutorial
     */
    enableImageUpload: true as boolean,
    /**
     * If enable, the user will be redirected to `/` when he visits the landing page at `/`
     * The logic is located in middleware.ts
     */
    enableLandingRedirection: false as boolean,
  },
};

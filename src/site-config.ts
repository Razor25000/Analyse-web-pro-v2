export const SiteConfig = {
  title: "Analyseur web pro",
  description: "Analysez votre site web pour améliorer votre référencement",
  prodUrl: "https://demo.nowts.app",
  appId: "nowts",
  domain: "demo.nowts.app",
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
    enableImageUpload: false as boolean,
    /**
     * If enable, the user will be redirected to `/orgs` when he visits the landing page at `/`
     * The logic is located in middleware.ts
     */
    enableLandingRedirection: true as boolean,
  },
};

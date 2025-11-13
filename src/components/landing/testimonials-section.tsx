"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, CheckCircle } from "lucide-react";

const testimonials = [
  {
    name: "Marie Dubois",
    role: "Développeuse Web Freelance",
    company: "MD Digital",
    avatar: "/avatars/marie.jpg",
    content:
      "WebPerfekt m'a fait gagner un temps fou sur mes audits clients. Avant, je passais 3-4h par site. Maintenant, j'ai les résultats complets en moins de 5 minutes. Mes clients sont impressionnés par la qualité des rapports.",
    rating: 5,
    metrics: "80% de temps gagné",
    result: "✓ 15 clients satisfaits",
    linkedin: "https://linkedin.com/in/marie-dubois-web",
  },
  {
    name: "Thomas Laurent",
    role: "CEO & Fondateur",
    company: "WebFlow Agency",
    avatar: "/avatars/thomas.jpg",
    content:
      "L'analyse en lot a révolutionné notre processus commercial. On peut maintenant qualifier 50 prospects en une heure, avec des rapports techniques qui nous donnent un avantage concurrentiel énorme.",
    rating: 5,
    metrics: "50 prospects/jour",
    result: "✓ +30% de conversion",
    linkedin: "https://linkedin.com/in/thomas-laurent-agence",
  },
  {
    name: "Sophie Martin",
    role: "Consultante SEO Senior",
    company: "SEO Expert Agency",
    avatar: "/avatars/sophie.jpg",
    content:
      "Les données techniques chiffrées me permettent de vendre mes services plus cher. Les clients comprennent immédiatement la valeur quand ils voient les scores précis de performance et sécurité.",
    rating: 5,
    metrics: "Taux de conversion x2.5",
    result: "✓ +40% sur mes tarifs",
    linkedin: "https://linkedin.com/in/sophie-martin-seo",
  },
  {
    name: "Alexandre Petit",
    role: "Head of Marketing Digital",
    company: "E-commerce Solutions SA",
    avatar: "/avatars/alexandre.jpg",
    content:
      "On a identifié des problèmes de performance qu'on ne voyait même pas. Après avoir appliqué les recommandations, notre taux de conversion a augmenté de 15% en 2 semaines.",
    rating: 5,
    metrics: "+15% conversion",
    result: "✓ ROI atteint en 1 mois",
    linkedin: "https://linkedin.com/in/alexandre-petit-marketing",
  },
  {
    name: "Julie Moreau",
    role: "WordPress Expert Freelance",
    company: "JM Web Design",
    avatar: "/avatars/julie.jpg",
    content:
      "Je peux maintenant facturer mes audits 3x plus cher. Les rapports PDF professionnels me permettent de justifier mes prix et mes clients sont prêts à payer pour la qualité.",
    rating: 5,
    metrics: "3x plus cher",
    result: "✓ 20 audits/mois",
    linkedin: "https://linkedin.com/in/julie-moreau-wordpress",
  },
  {
    name: "David Bernard",
    role: "CTO & Co-fondateur",
    company: "StartupTech.io",
    avatar: "/avatars/david.jpg",
    content:
      "L'API s'intègre parfaitement dans notre CI/CD. Chaque déploiement est automatiquement audité, ce qui nous a évité 2 bugs critiques en production le mois dernier.",
    rating: 5,
    metrics: "0 bug critique",
    result: "✓ Qualité continue",
    linkedin: "https://linkedin.com/in/david-bernard-cto",
  },
];

const stats = [
  { label: "Sites audités", value: "500+", icon: "📊" },
  { label: "Professionnels", value: "150+", icon: "👥" },
  { label: "Satisfaction", value: "98%", icon: "⭐" },
  { label: "ROI moyen", value: "+220%", icon: "📈" },
];

export function TestimonialsSection() {
  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center space-x-2 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium">
              <Star className="mr-1 h-4 w-4" />
              Témoignages vérifiés
            </Badge>
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </div>
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Ils ont transformé leur
            <span className="text-primary"> activité avec WebPerfekt</span>
          </h2>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
            Découvrez comment freelances, agences et entreprises améliorent leurs performances
            et augmentent leurs revenus grâce à nos audits automatisés.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-16 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-background/50 border-0 text-center">
              <CardContent className="pt-6">
                <div className="mb-2 text-3xl">{stat.icon}</div>
                <div className="text-primary text-2xl font-bold">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="group bg-background border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage
                          src={testimonial.avatar}
                          alt={testimonial.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {testimonial.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold">
                          {testimonial.name}
                        </p>
                        <a
                          href={testimonial.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2zm-11 12h10v-2h-10v2zm-2 2h10v-2h-10v2zm10-4v-2h-10v2z" />
                          </svg>
                        </a>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {testimonial.role}
                      </p>
                      <p className="text-primary text-xs font-medium">
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                      {testimonial.metrics}
                    </Badge>
                    {testimonial.result && (
                      <Badge variant="outline" className="text-xs">
                        {testimonial.result}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Stars */}
                <div className="mb-3 flex items-center space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {testimonial.rating}.0/5
                  </span>
                </div>

                {/* Quote */}
                <div className="relative">
                  <Quote className="text-primary/20 absolute -top-1 -left-1 h-4 w-4" />
                  <p className="text-foreground pl-4 text-sm leading-relaxed group-hover:text-primary transition-colors">
                    {testimonial.content}
                  </p>
                </div>

                {/* CTA */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <a
                      href="/auth/pre-signup"
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Voir son rapport →
                    </a>
                    <Badge variant="outline" className="text-xs">
                      {testimonial.company}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Social Proof */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-8">
            <h3 className="mb-6 text-xl font-bold text-primary">
              Rejoignez nos 150+ professionnels satisfaits
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex -space-x-4">
                {testimonials.slice(0, 4).map((testimonial, index) => (
                  <div key={index} className="relative group">
                    <Avatar
                      className="border-background h-12 w-12 border-2 transition-transform group-hover:scale-110"
                    >
                      <AvatarImage
                        src={testimonial.avatar}
                        alt={testimonial.name}
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <div className="absolute inset-0 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="text-lg">
                  <span className="font-bold text-primary">150+</span>
                  <span className="text-muted-foreground">
                    {" "}
                    professionnels nous font confiance
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  • 98% de satisfaction • ROI moyen de +220%
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Vérifié
                  </Badge>
                  <Badge variant="outline" className="border-primary/20 text-primary">
                    LinkedIn
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

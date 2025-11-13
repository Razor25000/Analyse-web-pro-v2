"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Comment fonctionne l'analyse de site web ?",
    answer:
      "Notre système analyse automatiquement votre site sur 4 domaines clés : performance (vitesse de chargement, Core Web Vitals), SEO (balises, structure, référencement), sécurité (HTTPS, en-têtes de sécurité) et modernité (technologies utilisées, responsive design). L'analyse prend 2-3 minutes et génère un rapport détaillé avec des recommandations concrètes.",
  },
  {
    question: "Combien de sites puis-je analyser avec le plan gratuit ?",
    answer:
      "Le plan gratuit inclut 5 audits complets par mois. C'est parfait pour découvrir le service et analyser vos sites principaux. Si vous avez besoin de plus d'analyses, vous pouvez passer au plan Pro (500 audits/mois) à tout moment.",
  },
  {
    question: "Qu'est-ce qu'un audit en lot ?",
    answer:
      "L'audit en lot (disponible avec Premium) vous permet d'analyser plusieurs sites d'un coup en uploadant un fichier CSV contenant les URLs. Idéal pour les agences ou consultants qui gèrent de nombreux sites clients. Les résultats sont regroupés dans un rapport consolidé.",
  },
  {
    question: "Les rapports sont-ils personnalisables ?",
    answer:
      "Oui ! Les rapports web HTML sont entièrement personnalisables en marque blanche. Ajoutez votre logo, vos coordonnées, vos couleurs et votre message personnalisé. Idéal pour les consultants et agences qui souhaitent livrer des rapports professionnels à leurs clients avec leur propre branding.",
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer:
      "Absolument ! Aucun engagement, vous pouvez annuler votre abonnement à tout moment depuis vos paramètres. Vous gardez l'accès aux fonctionnalités premium jusqu'à la fin de votre période de facturation en cours.",
  },
  {
    question: "Y a-t-il une API disponible ?",
    answer:
      "Oui, les plans Premium incluent un accès à notre API REST pour intégrer les audits dans vos outils existants (CI/CD, CMS, workflows). Documentation complète et support technique inclus. Parfait pour automatiser vos processus qualité.",
  },
  {
    question: "Quels types de sites pouvez-vous analyser ?",
    answer:
      "Nous analysons tous types de sites web : sites vitrine, e-commerce, blogs, applications web, sites WordPress, React, Next.js, etc. Votre site doit être accessible publiquement via HTTPS ou HTTP. Les sites en développement local ne sont pas supportés.",
  },
  {
    question: "Comment puis-je être sûr de la qualité des analyses ?",
    answer:
      "Nos algorithmes se basent sur les standards officiels Google (Core Web Vitals, PageSpeed), W3C (HTML/CSS), et les meilleures pratiques SEO reconnues. Nous mettons à jour nos critères d'analyse régulièrement. Plus de 10 000 sites analysés avec 4.9/5 de satisfaction client.",
  },
  {
    question: "Proposez-vous un support technique ?",
    answer:
      "Oui ! Support email inclus sur tous les plans. Les clients Pro bénéficient d'un support prioritaire (réponse sous 24h), et les clients Premium ont accès à un support dédié avec formation personnalisée et onboarding.",
  },
  {
    question: "Puis-je tester le service avant de m'abonner ?",
    answer:
      "Bien sûr ! Créez un compte gratuit et bénéficiez de 5 audits complets sans aucune carte bancaire requise. Vous pouvez aussi demander une démo personnalisée pour les besoins entreprise ou agence.",
  },
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // Premier item ouvert par défaut

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Questions fréquentes
          </h2>
          <p className="text-muted-foreground text-xl">
            Tout ce que vous devez savoir sur Analyseur Web Pro
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="border shadow-sm">
              <Collapsible
                open={openItems.has(index)}
                onOpenChange={() => toggleItem(index)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors">
                    <CardTitle className="flex items-center justify-between text-left text-lg font-semibold">
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${
                          openItems.has(index) ? "rotate-180 transform" : ""
                        }`}
                      />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Vous avez d'autres questions ?
          </p>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Email :</strong>{" "}
              <a
                href="mailto:regis.laffond@innovwebdesign.com"
                className="text-primary hover:underline"
              >
                regis.laffond@innovwebdesign.com
              </a>
            </p>
            <p className="text-muted-foreground text-xs">
              Réponse garantie sous 24h
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

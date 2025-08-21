'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Globe, Mail } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

// Schéma de validation
const auditSchema = z.object({
  url: z.string().url('Veuillez entrer une URL valide'),
  email: z.string().email('Veuillez entrer un email valide'),
});

export default function NewAuditPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    url: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation côté client
      const validatedData = auditSchema.parse(formData);

      // Appel à l'API
      const response = await fetch(`/api/orgs/${orgSlug}/audits/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du démarrage de l\'audit');
      }

      setSuccess(`Audit démarré avec succès ! ID: ${result.correlationId}`);
      
      // Rediriger vers la page des audits après 2 secondes
      setTimeout(() => {
        router.push(`/orgs/${orgSlug}/audits`);
      }, 2000);

    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Une erreur inattendue s\'est produite');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    
    // Réinitialiser les messages
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${orgSlug}/audits`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold">Nouvel Audit</h1>
          <p className="text-muted-foreground">
            Analysez un site web en quelques clics
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du Site</CardTitle>
          <CardDescription>
            Entrez l'URL du site à analyser et votre email pour recevoir le rapport
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL du Site</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://exemple.com"
                  value={formData.url}
                  onChange={handleInputChange('url')}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                L'URL complète du site web à analyser
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email de Contact</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Le rapport d'audit sera disponible dans votre dashboard
              </p>
            </div>

            {/* Messages d'erreur et de succès */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Boutons */}
            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Démarrage en cours...
                  </>
                ) : (
                  'Démarrer l\'Audit'
                )}
              </Button>
              
              <Button type="button" variant="outline" asChild>
                <Link href={`/orgs/${orgSlug}/audits`}>
                  Annuler
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Que va analyser cet audit ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <strong>Performance :</strong> Vitesse de chargement, optimisations techniques
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>SEO :</strong> Balises, structure, référencement naturel
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <strong>Sécurité :</strong> HTTPS, en-têtes de sécurité
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <strong>Modernité :</strong> Technologies utilisées, responsive design
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            L'analyse prend généralement 2-3 minutes. Vous recevrez une notification une fois terminée.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
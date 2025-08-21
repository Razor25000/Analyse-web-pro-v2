'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Upload, FileText, Download } from 'lucide-react';
import Link from 'next/link';

export default function BatchAuditPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    batchName: '',
    csvData: '',
  });

  const [previewData, setPreviewData] = useState<Array<{url: string, email: string}> | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      setFormData(prev => ({ ...prev, csvData: csvContent }));
      
      // Générer un aperçu
      try {
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        if (!headers.includes('url')) {
          setError('Le fichier CSV doit contenir une colonne "url"');
          return;
        }
        
        const urlIndex = headers.indexOf('url');
        const emailIndex = headers.indexOf('email');
        
        const preview = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            url: values[urlIndex] || '',
            email: values[emailIndex] || `contact@${values[urlIndex]?.replace(/^https?:\/\//, '')}`
          };
        }).filter(item => item.url);
        
        setPreviewData(preview);
        setError(null);
        
      } catch (err) {
        setError('Erreur lors de la lecture du fichier CSV');
      }
    };
    
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.csvData) {
        throw new Error('Veuillez sélectionner un fichier CSV');
      }

      const response = await fetch(`/api/orgs/${orgSlug}/audits/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du démarrage du batch');
      }

      setSuccess(`Batch démarré avec succès ! ${result.totalProspects} sites en cours d'analyse.`);
      
      // Rediriger après 3 secondes
      setTimeout(() => {
        router.push(`/orgs/${orgSlug}/audits`);
      }, 3000);

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Une erreur inattendue s\'est produite');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'url,email\nexample.com,contact@example.com\ntest-site.fr,admin@test-site.fr\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-batch-audit.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${orgSlug}/audits`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold">Audit en Batch</h1>
          <p className="text-muted-foreground">
            Analysez plusieurs sites simultanément via un fichier CSV
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulaire */}
        <Card>
          <CardHeader>
            <CardTitle>Upload de Fichier</CardTitle>
            <CardDescription>
              Uploadez un fichier CSV contenant les URLs à analyser
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom du batch */}
              <div className="space-y-2">
                <Label htmlFor="batchName">Nom du Batch (optionnel)</Label>
                <Input
                  id="batchName"
                  placeholder="Mon analyse de sites"
                  value={formData.batchName}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchName: e.target.value }))}
                />
              </div>

              {/* Upload fichier */}
              <div className="space-y-2">
                <Label htmlFor="csvFile">Fichier CSV</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Format requis : colonnes "url" et optionnellement "email"
                </p>
              </div>

              {/* Template download */}
              <div className="flex items-center space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le modèle
                </Button>
              </div>

              {/* Messages */}
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
                <Button type="submit" disabled={isLoading || !formData.csvData} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Démarrage en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Démarrer l'Analyse
                    </>
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

        {/* Aperçu */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu des Données</CardTitle>
            <CardDescription>
              Vérifiez que vos données sont correctement formatées
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {previewData ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  {previewData.length} sites détectés (aperçu des 5 premiers)
                </div>
                
                <div className="space-y-2">
                  {previewData.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">{item.url}</div>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p>Sélectionnez un fichier CSV pour voir l'aperçu</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Format du Fichier CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Colonnes requises :</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code>url</code> - L'URL du site à analyser (obligatoire)</li>
                <li><code>email</code> - Email de contact (optionnel, généré automatiquement si absent)</li>
              </ul>
            </div>
            
            <div>
              <strong>Exemple de contenu :</strong>
              <pre className="bg-muted p-2 rounded text-xs mt-1">
{`url,email
example.com,contact@example.com
https://test-site.fr,admin@test-site.fr
demo-website.com,`}
              </pre>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Limites :</strong> Maximum 50 sites par batch. Temps estimé : 2-3 minutes par site.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
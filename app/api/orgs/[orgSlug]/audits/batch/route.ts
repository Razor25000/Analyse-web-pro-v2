 
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequiredUser } from '@/lib/auth/auth-user';
import { getCurrentOrg } from '@/lib/organizations/get-org';
import { SupabaseBridge } from '@/lib/supabase/bridge';
import { nanoid } from 'nanoid';

// Schéma de validation
const BatchAuditSchema = z.object({
  csvData: z.string().min(10, 'CSV trop court'),
  batchName: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    const org = await getCurrentOrg();

    if (!org || org.slug !== params.orgSlug) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      );
    }

    // 2. Valider les données
    const body = await request.json();
    const validatedData = BatchAuditSchema.parse(body);

    // 3. Vérifier les quotas (using existing pattern from single audit)
    const subscription = await SupabaseBridge.getUserSubscription(org.email ?? user.email);
    const quota = subscription?.monthly_quota ?? 10;
    const quotaUsed = subscription?.quota_used ?? 0;

    // 4. Parser le CSV basique
    const csvLines = validatedData.csvData.trim().split('\n');
    const headers = csvLines[0].split(',').map(h => h.trim());
    
    if (!headers.includes('url')) {
      return NextResponse.json(
        { error: 'Colonne "url" manquante dans le CSV' },
        { status: 400 }
      );
    }

    type Prospect = {
      url: string;
      email: string;
    }

    const prospects: Prospect[] = [];
    for (let i = 1; i < csvLines.length && i <= 50; i++) { // Limite à 50 pour l'instant
      const values = csvLines[i].split(',').map(v => v.trim());
      const rowData: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      
      if (rowData.url) {
        prospects.push({
          url: rowData.url.startsWith('http') ? rowData.url : `https://${rowData.url}`,
          email: rowData.email || `contact@${rowData.url}`,
        });
      }
    }

    // Vérifier si le quota permet de traiter tous les prospects
    if (quotaUsed + prospects.length > quota) {
      return NextResponse.json(
        { 
          error: 'Quota mensuel dépassé', 
          quota,
          used: quotaUsed,
          requested: prospects.length,
          available: Math.max(0, quota - quotaUsed),
          subscription_tier: subscription?.subscription_tier ?? 'free'
        },
        { status: 429 }
      );
    }

    // 5. Générer un ID de batch
    const batchId = `batch_${nanoid()}`;

    // 6. Synchroniser l'utilisateur
    await SupabaseBridge.syncUserToSupabase(
      user.id, 
      user.email, 
      user.name
    );

    // 7. Créer les audits en base pour chaque prospect
    const auditPromises = prospects.map(async (prospect) => {
      return SupabaseBridge.createAudit({
        user_id: user.id,
        email: prospect.email,
        url: prospect.url,
        audit_type: 'bulk',
        webhook_id: `${batchId}_${nanoid()}`,
        status: 'pending',
      });
    });

    const audits = await Promise.all(auditPromises);

    // 8. Incrémenter le quota utilisé
    await SupabaseBridge.incrementQuotaUsed(
      org.email ?? user.email, 
      prospects.length
    );

    // 9. Déclencher le workflow n8n (simulation)
    console.log('🚀 Déclenchement audit batch:', {
      batchId,
      totalProspects: prospects.length,
      userId: user.id,
      orgSlug: org.slug,
      batchName: validatedData.batchName,
      auditIds: audits.map(a => a?.id).filter(Boolean)
    });

    // 10. Réponse de succès
    return NextResponse.json({
      success: true,
      message: 'Batch démarré avec succès',
      batchId,
      totalProspects: prospects.length,
      estimatedTime: `${prospects.length * 2} minutes`,
      audits: audits.map(audit => ({
        id: audit?.id,
        url: prospects.find(p => p.email === audit?.email)?.url,
        status: audit?.status
      })),
      quota: {
        used: quotaUsed + prospects.length,
        total: quota,
        remaining: quota - quotaUsed - prospects.length,
      },
      subscription: {
        tier: subscription?.subscription_tier ?? 'free',
        subscribed: subscription?.subscribed ?? false,
      },
    });

  } catch (error) {
    console.error('Erreur API batch audit:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
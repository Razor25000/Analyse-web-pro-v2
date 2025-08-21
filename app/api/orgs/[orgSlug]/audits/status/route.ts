/* eslint-disable linebreak-style */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth/auth-user';
import { getCurrentOrg } from '@/lib/organizations/get-org';
import { SupabaseBridge } from '@/lib/supabase/bridge';

// Types pour le typage TypeScript
interface FormattedAudit {
  id: string;
  url: string;
  email: string;
  status: string;
  score: number | null;
  createdAt: string;
  completedAt: string | null;
  deliveryMethod: string | null;
  auditType: string;
  batchId: string | null;
}

interface AuditStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  pending: number;
}

export async function GET(
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

    // 2. Récupérer les audits de l'organisation
    const audits = await SupabaseBridge.getOrgAudits(org.id);

    // 3. Formater les données avec typage complet
    const formattedAudits: FormattedAudit[] = audits.map(audit => ({
      id: audit.id,
      url: audit.url,
      email: audit.email,
      status: audit.status || 'pending',
      score: audit.score_global || null,
      createdAt: audit.created_at,
      completedAt: audit.completed_at || null,
      deliveryMethod: audit.delivery_method || null,
      auditType: audit.audit_type || 'manual',
      batchId: audit.webhook_id?.startsWith('batch_') ? audit.webhook_id.split('_')[1] : null,
    }));

    // 4. Statistiques avec statuts plus robustes
    const stats: AuditStats = {
      total: audits.length,
      completed: audits.filter(a => 
        a.status === 'completed' || 
        a.status === 'succeeded' || 
        a.status === 'Terminé'
      ).length,
      processing: audits.filter(a => 
        a.status === 'processing' || 
        a.status === 'running' ||
        a.status?.includes('cours') || 
        a.status?.includes('progress')
      ).length,
      failed: audits.filter(a => 
        a.status === 'failed' || 
        a.status === 'error' || 
        a.status === 'Erreur'
      ).length,
      pending: audits.filter(a => 
        a.status === 'pending' || 
        a.status === 'starting' ||
        a.status === 'queued'
      ).length,
    };

    // 5. Informations supplémentaires sur les quotas
    const subscription = await SupabaseBridge.getUserSubscription(org.email ?? user.email);
    const quotaInfo = {
      used: subscription?.quota_used ?? 0,
      total: subscription?.monthly_quota ?? 10,
      remaining: Math.max(0, (subscription?.monthly_quota ?? 10) - (subscription?.quota_used ?? 0)),
      subscription_tier: subscription?.subscription_tier ?? 'free',
    };

    // 6. Réponse enrichie
    return NextResponse.json({
      success: true,
      audits: formattedAudits,
      stats,
      quota: quotaInfo,
      organization: {
        id: org.id,
        slug: org.slug,
        name: org.name,
      },
      meta: {
        timestamp: new Date().toISOString(),
        total_audits: formattedAudits.length,
        user_id: user.id,
      }
    });

  } catch (error) {
    console.error('Erreur API status:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
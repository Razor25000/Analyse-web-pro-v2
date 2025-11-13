# Deployment Guide - Aiguilleur-FIXED Workflow

## Overview

This guide provides step-by-step instructions to deploy the fixed workflow that eliminates the duplicate audit creation bug (24 URLs → 48 audits).

**Problem Fixed**: The original workflow was creating duplicate audits in the database. After the fix, uploading 24 URLs will create exactly 24 audits (not 48).

**Files Modified**:

- ✅ `src/lib/n8n/client.ts` - Updated to send audit objects instead of CSV data
- ✅ `app/api/audits/batch/route.ts` - Modified to send pre-created audits to n8n
- ✅ `workflows/Aiguilleur-FIXED.json` - New workflow that eliminates duplicate creation

## Prerequisites

Before deployment, ensure you have:

- [ ] Access to n8n hosted instance: `https://n8n.redjice.shop`
- [ ] Admin/Editor permissions in n8n
- [ ] Backup of current workflow (export JSON before making changes)
- [ ] Access to database to verify results

## Deployment Steps

### Step 1: Backup Current Workflow

1. Log into n8n at `https://n8n.redjice.shop`
2. Navigate to the current "Aiguilleur" workflow
3. Click the **⋮** (three dots) menu
4. Select **"Download"** to export current workflow JSON
5. Save as `Aiguilleur-BACKUP-[DATE].json` for rollback if needed

### Step 2: Import Fixed Workflow

**Method A: Import from JSON File (Recommended)**

1. In n8n UI, click **"Import from File"** or **"+ Add workflow"** → **"Import from File"**
2. Select `workflows/Aiguilleur-FIXED.json` from the project
3. Review the imported workflow structure
4. Verify these key nodes exist:
   - ✅ 📁 Batch Upload Webhook
   - ✅ ✅ Validate Pre-Created Audits
   - ✅ 📊 Log Batch Receipt
   - ✅ 🔄 Loop Over Audits
   - ✅ 🎯 Prepare Worker Context
   - ✅ 📬 Redis Queue: Enqueue
   - ✅ ✅ Réponse Immédiate
5. **IMPORTANT**: Verify webhook configuration:
   - Path: `batch-upload`
   - Method: `POST`
   - Webhook ID: `156f48a0-faf4-4822-985b-8b60e6b3a888`
6. Verify Redis credentials are connected:
   - Node: "📬 Redis Queue: Enqueue"
   - Credentials: Redis account (id: `kdn2BAHuLvJk5fcn`)

**Method B: Manual Update (Alternative)**

If import fails, manually update the existing workflow:

1. Open current "Aiguilleur" workflow
2. **Delete these nodes**:
   - "🔍 Parse CSV" (CSV parsing - no longer needed)
   - "🔄 Split Prospects" (replaced by Split Out)
   - "📝 Create Individual Prospect" (Supabase node - THIS WAS CREATING DUPLICATES)
3. **Add new JavaScript node** after webhook:
   - Name: "✅ Validate Pre-Created Audits"
   - Copy JavaScript code from `Aiguilleur-FIXED.json` line 23-52
4. **Add Split Out node**:
   - Name: "🔄 Loop Over Audits"
   - Field to split: `audits`
5. **Update "Préparer Contexte Worker"** node:
   - Change recordId value from Supabase output to: `={{ $json.id }}`
   - Verify all field assignments reference correct parent nodes
6. **Reconnect nodes** according to `Aiguilleur-FIXED.json` connections

### Step 3: Verify Configuration

Check these critical configuration points:

1. **Webhook Configuration**:

   ```
   URL: https://n8n.redjice.shop/webhook/batch-upload
   Method: POST
   Response Mode: Response Node
   Webhook ID: 156f48a0-faf4-4822-985b-8b60e6b3a888
   ```

2. **Redis Configuration**:

   ```
   Operation: push
   List: analysis_queue
   Message: {{ JSON.stringify($json) }}
   ```

3. **Validation Node** checks for:
   - `user_id` (required)
   - `audits` array (required, non-empty)
   - Each audit must have: `id`, `webhookId`, `url`, `email`

### Step 4: Activate Workflow

1. Click **"Active"** toggle in top-right corner
2. Verify webhook URL is accessible:
   ```bash
   curl -X POST https://n8n.redjice.shop/webhook/batch-upload \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
3. Should return validation error (expected - confirms webhook is active)

### Step 5: Deactivate Old Workflow (if separate)

If you created a new workflow instead of replacing:

1. Navigate to old "Aiguilleur" workflow
2. Click **"Active"** toggle to deactivate
3. Rename to "Aiguilleur-OLD-[DATE]" for reference

## Testing Procedure

### Test 1: Small Batch (2 URLs)

1. Create test CSV file `test-2-urls.csv`:

   ```csv
   url,email
   example.com,test1@example.com
   test-site.fr,test2@test-site.fr
   ```

2. Upload via Next.js API:

   ```bash
   # Use your actual API endpoint and authentication
   curl -X POST http://localhost:3000/api/audits/batch \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "csvData": "url,email\nexample.com,test1@example.com\ntest-site.fr,test2@test-site.fr",
       "batchName": "Test Batch 1"
     }'
   ```

3. **Expected Response**:

   ```json
   {
     "success": true,
     "batchId": "batch_abc123",
     "totalProspects": 2,
     "createdAuditIds": ["id1", "id2"],
     "n8nTriggered": true
   }
   ```

4. **Verify in Database** (use Prisma Studio or SQL):

   ```sql
   SELECT id, url, webhookId, status, auditType
   FROM "Audit"
   WHERE userId = 'YOUR_USER_ID'
   ORDER BY createdAt DESC
   LIMIT 10;
   ```

5. **Expected Database State**:
   - Exactly 2 audits created (not 4)
   - Both audits have `webhookId` populated
   - Both start in "pending" status
   - Both transition to "processing" then "completed"

6. **Verify Redis Queue**:

   ```bash
   # Check queue length
   redis-cli -u YOUR_REDIS_URL LLEN analysis_queue

   # View queued items
   redis-cli -u YOUR_REDIS_URL LRANGE analysis_queue 0 -1
   ```

7. **Expected Queue Items**:
   ```json
   {
     "recordId": "actual-database-id-1",
     "webhookId": "batch_abc123_1",
     "url": "https://example.com",
     "email": "test1@example.com",
     "userId": "your-user-id",
     "batchId": "batch_abc123",
     "delivery_method": "dashboard"
   }
   ```

### Test 2: Duplicate Detection

1. Upload same CSV again immediately
2. **Expected Behavior**:
   - API detects existing URLs in database
   - No new audits created
   - Response shows `databaseDuplicateRows: 2`

### Test 3: Medium Batch (10 URLs)

1. Create CSV with 10 URLs
2. Upload and verify:
   - Exactly 10 audits created
   - All have webhookId
   - Redis queue has 10 items
   - Worker Manager dispatches 2-3 workers
   - All audits complete successfully

## Monitoring

### N8N Workflow Monitoring

1. Check execution history:
   - n8n UI → "Executions" tab
   - Verify no errors in recent runs
   - Check execution time (should be <1 second for queuing)

2. View logs in nodes:
   - Click on "✅ Validate Pre-Created Audits" node
   - Check console output for validation messages

### Database Monitoring

```sql
-- Check for orphaned pending audits (should be ZERO after fix)
SELECT COUNT(*) as orphaned_count
FROM "Audit"
WHERE status = 'pending'
  AND createdAt < NOW() - INTERVAL '10 minutes';

-- Check for duplicate URLs (should show only intentional duplicates)
SELECT url, COUNT(*) as count
FROM "Audit"
WHERE userId = 'YOUR_USER_ID'
  AND createdAt > NOW() - INTERVAL '1 hour'
GROUP BY url
HAVING COUNT(*) > 1;

-- Verify webhookId population (should be 100% for batch audits)
SELECT
  COUNT(*) as total_batch_audits,
  COUNT(webhookId) as with_webhook_id,
  ROUND(100.0 * COUNT(webhookId) / COUNT(*), 2) as percentage
FROM "Audit"
WHERE auditType = 'batch_analysis'
  AND createdAt > NOW() - INTERVAL '1 hour';
```

### Redis Queue Monitoring

```bash
# Check queue length (should decrease as workers process)
redis-cli -u YOUR_REDIS_URL LLEN analysis_queue

# Check Worker Manager metrics
redis-cli -u YOUR_REDIS_URL GET worker_manager_metrics

# List recent worker launches
redis-cli -u YOUR_REDIS_URL KEYS "worker_launch_*"
```

## Troubleshooting

### Issue: Duplicates Still Occurring

**Symptoms**: Database shows 2x expected audits

**Diagnosis**:

```sql
-- Check if duplicates have webhookId
SELECT webhookId, COUNT(*)
FROM "Audit"
WHERE url = 'problematic-url.com'
GROUP BY webhookId;
```

**Solution**:

1. Verify old workflow is deactivated
2. Check n8n execution history for duplicate executions
3. Verify Supabase node is removed from workflow

### Issue: Validation Errors

**Symptoms**: N8n workflow returns error "audits array manquant"

**Diagnosis**: Check API is sending correct payload structure

**Solution**:

1. Verify `src/lib/n8n/client.ts` modifications are deployed
2. Check API logs for actual payload sent to n8n
3. Restart Next.js server to ensure code changes are loaded

### Issue: Workers Not Processing Audits

**Symptoms**: Audits stuck in "pending" status

**Diagnosis**: Check Redis queue and worker logs

**Solution**:

1. Verify Redis queue has items: `LLEN analysis_queue`
2. Check Worker Manager is active and dispatching
3. Verify worker workflows are active
4. Check worker logs for errors

### Issue: webhookId Missing

**Symptoms**: Some audits missing webhookId after batch upload

**Diagnosis**:

```sql
SELECT id, url, webhookId, status, createdAt
FROM "Audit"
WHERE auditType = 'batch_analysis'
  AND webhookId IS NULL
ORDER BY createdAt DESC;
```

**Solution**:

1. Verify API route modifications in `app/api/audits/batch/route.ts`
2. Check that `webhookId` is set in audit creation (line 273)
3. Ensure transaction completes successfully

## Rollback Procedure

If issues occur after deployment:

1. **Deactivate new workflow** in n8n UI
2. **Reactivate backup workflow**:
   - Import `Aiguilleur-BACKUP-[DATE].json`
   - Verify webhook URL configuration
   - Activate workflow
3. **Revert code changes** (if needed):
   ```bash
   git revert <commit-hash>
   pnpm dev
   ```
4. **Clean up test data**:
   ```sql
   DELETE FROM "Audit"
   WHERE userId = 'test-user-id'
     AND createdAt > NOW() - INTERVAL '1 hour';
   ```

## Success Criteria

The deployment is successful when:

- ✅ Test CSV with N URLs creates exactly N audits (not 2N)
- ✅ All batch audits have `webhookId` populated
- ✅ No audits stuck in "pending" status after 5 minutes
- ✅ Redis queue receives N items for N URLs
- ✅ Workers process audits by database ID
- ✅ All audits transition: pending → processing → completed
- ✅ Duplicate CSV upload correctly identifies existing audits
- ✅ Quota consumption is accurate (N audits = N quota used)

## Post-Deployment

After successful deployment and testing:

1. **Update documentation** with new workflow architecture
2. **Monitor for 24 hours** to ensure stability
3. **Archive backup workflow** (keep for 30 days)
4. **Update team** on new workflow structure
5. **Document lessons learned** for future reference

## Support

If you encounter issues not covered in this guide:

1. Check n8n execution logs for detailed error messages
2. Review API logs: `pnpm dev` output for request/response details
3. Verify all three components are deployed:
   - API route modifications
   - N8n client updates
   - Fixed workflow in n8n

## References

- Modified Files: `src/lib/n8n/client.ts`, `app/api/audits/batch/route.ts`
- New Workflow: `workflows/Aiguilleur-FIXED.json`
- N8n Instance: `https://n8n.redjice.shop`
- Webhook URL: `https://n8n.redjice.shop/webhook/batch-upload`

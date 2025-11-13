# N8N Workflow Modification Plan - Batch Audit Fix

## Problem Statement

When batch audits are launched from the Next.js dashboard:

1. API creates records with `auditType: "batch"` and deducts user quota
2. N8N workflow receives trigger but creates NEW records with `auditType: "batch_analysis"`
3. N8N only processes its own created records
4. Original "batch" records remain in "pending" status forever
5. Result: Duplicate records, wasted quota, unprocessed audits

## Solution Overview

Modify the N8N "Aiguilleur" workflow to QUERY existing "batch" records instead of CREATING new "batch_analysis" records.

This is possible because Prisma and N8N both access the same PostgreSQL/Supabase database.

## Technical Architecture

### Current Flow (Broken)

```
Next.js API → Create "batch" records → Trigger N8N webhook
                ↓ (quota deducted)
              [Stuck in "pending"]

N8N Workflow → Create "batch_analysis" records → Extract IDs → Push to Redis
                                                                    ↓
                                                            Workers process only these
```

### New Flow (Fixed)

```
Next.js API → Create "batch" records → Trigger N8N webhook
                ↓ (quota deducted)

N8N Workflow → QUERY "batch" records → Extract IDs → Update status → Push to Redis
                                                          ↓              ↓
                                                   "processing"    Workers process
```

## Node Modifications

### 1. Replace INSERT Node with SELECT Node

**Node to Remove:**

- **Name:** "📝 Create Individual Prospect"
- **Type:** `n8n-nodes-base.supabase`
- **Operation:** INSERT
- **Current Behavior:** Creates new records with `audit_type: "batch_analysis"`

**Node to Add:**

- **Name:** "🔍 Query Existing Batch Record"
- **Type:** `n8n-nodes-base.supabase`
- **Operation:** SELECT
- **Configuration:**

```json
{
  "operation": "select",
  "table": "audits",
  "filters": {
    "conditions": [
      {
        "field": "audit_type",
        "operator": "eq",
        "value": "batch"
      },
      {
        "field": "status",
        "operator": "eq",
        "value": "pending"
      },
      {
        "field": "url",
        "operator": "eq",
        "value": "={{ $json.url }}"
      }
    ]
  },
  "returnFields": ["id", "webhook_id", "url", "status", "user_id", "email"],
  "limit": 1
}
```

**Query Logic Explanation:**

- `audit_type = 'batch'` - Find records created by Next.js API
- `status = 'pending'` - Only records not yet processed
- `url = {{ $json.url }}` - Match the specific URL from parsed CSV
- `LIMIT 1` - Get exactly one matching record

**Expected Result:**

```json
{
  "id": "uuid-here",
  "webhook_id": "batch_abc123_1",
  "url": "https://example.com",
  "status": "pending",
  "user_id": "user-id-here",
  "email": "contact@example.com"
}
```

### 2. Update Context Preparation Node

**Node to Modify:**

- **Name:** "Préparer Contexte Worker"
- **Type:** `n8n-nodes-base.code` or `n8n-nodes-base.set`

**Current Configuration:**

```javascript
{
  recordId: $('📝 Create Individual Prospect').item.json.id,
  url: $json.url,
  userId: $json.user_id,
  // ... other fields
}
```

**New Configuration:**

```javascript
{
  recordId: $('🔍 Query Existing Batch Record').item.json.id,
  webhookId: $('🔍 Query Existing Batch Record').item.json.webhook_id,
  url: $json.url,
  userId: $json.user_id,
  email: $json.email,
  // ... other fields
}
```

### 3. Add Status Update Node

**Node to Add:**

- **Name:** "✅ Update Status to Processing"
- **Type:** `n8n-nodes-base.supabase`
- **Operation:** UPDATE
- **Position:** Between "🔍 Query Existing Batch Record" and "📤 Push to Redis Queue"

**Configuration:**

```json
{
  "operation": "update",
  "table": "audits",
  "filters": {
    "conditions": [
      {
        "field": "id",
        "operator": "eq",
        "value": "={{ $json.recordId }}"
      }
    ]
  },
  "updateFields": {
    "status": "processing",
    "updated_at": "{{ $now }}"
  }
}
```

**Purpose:**

- Mark records as "processing" before sending to Redis queue
- Prevents race conditions if multiple workers try to process the same batch
- Provides accurate status for dashboard display

### 4. Update Redis Queue Push Node

**Node to Verify:**

- **Name:** "📤 Push to Redis Queue" or similar
- **Type:** `n8n-nodes-base.redis`

**Required Data:**

```javascript
{
  queue: "analysis_queue",
  data: {
    recordId: $json.recordId,      // From query node
    webhookId: $json.webhookId,    // From query node
    url: $json.url,
    userId: $json.userId,
    email: $json.email,
    planId: $json.planId,
    correlationId: $json.correlationId
  }
}
```

**Verify** this node receives data from the status update node, not the old create node.

## Workflow Connection Diagram

### Current Connections (To Remove)

```
Webhook Trigger → Parse CSV → Loop Items → 📝 Create Individual Prospect
                                              ↓
                                    Préparer Contexte Worker
                                              ↓
                                    📤 Push to Redis Queue
```

### New Connections (To Implement)

```
Webhook Trigger → Parse CSV → Loop Items → 🔍 Query Existing Batch Record
                                              ↓
                                    ✅ Update Status to Processing
                                              ↓
                                    Préparer Contexte Worker
                                              ↓
                                    📤 Push to Redis Queue
```

## Error Handling

### Missing Record Scenario

**Problem:** What if no matching "batch" record is found?

**Solution:** Add an IF node after the query:

```json
{
  "name": "❓ Check Record Found",
  "type": "n8n-nodes-base.if",
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $('🔍 Query Existing Batch Record').item.json.id }}",
        "operation": "isNotEmpty"
      }
    ]
  }
}
```

**True Branch:** Continue to status update
**False Branch:** Log error and skip to next item

### Status Update Failure

**Problem:** What if the status update fails?

**Solution:** Add error handling node:

```json
{
  "name": "⚠️ Status Update Failed",
  "type": "n8n-nodes-base.code",
  "code": `
    console.error('Failed to update status for record:', $json.recordId);
    // Still push to queue - workers will retry
    return $json;
  `
}
```

## Testing Plan

### Test Case 1: Single Batch Record

1. Create test user with quota
2. Upload CSV with 1 URL via dashboard
3. Verify API creates 1 "batch" record
4. Verify N8N queries and finds that record
5. Verify status updates to "processing"
6. Verify record ID pushed to Redis queue
7. Verify NO "batch_analysis" record created
8. Verify worker processes the audit
9. Verify final status updates to "completed"

### Test Case 2: Multiple Batch Records

1. Upload CSV with 5 URLs
2. Verify API creates 5 "batch" records with unique webhookIds
3. Verify N8N queries and finds all 5 records
4. Verify all 5 statuses update to "processing"
5. Verify all 5 IDs pushed to Redis queue
6. Verify NO duplicate records created

### Test Case 3: Duplicate URLs in CSV

1. Upload CSV with duplicate URLs
2. Verify API creates only unique records
3. Verify N8N handles duplicates correctly (skip or error)

### Test Case 4: Missing Record (Edge Case)

1. Manually delete a "batch" record between API creation and N8N trigger
2. Verify N8N logs error but continues processing other records
3. Verify no crash or stuck workflow

## Rollback Plan

If the modified workflow causes issues:

1. **Immediate Rollback:**
   - Restore original "📝 Create Individual Prospect" INSERT node
   - Remove "🔍 Query Existing Batch Record" SELECT node
   - Restore original "Préparer Contexte Worker" references
   - Remove "✅ Update Status to Processing" node

2. **Data Cleanup:**
   - Any "batch" records stuck in "processing" should be reset to "pending"
   ```sql
   UPDATE audits
   SET status = 'pending', updated_at = NOW()
   WHERE audit_type = 'batch'
     AND status = 'processing'
     AND updated_at < NOW() - INTERVAL '5 minutes';
   ```

## Post-Deployment Cleanup

After confirming the fix works:

### 1. Clean Up Orphaned "batch" Records

```sql
-- Records stuck in pending for more than 24 hours
DELETE FROM audits
WHERE audit_type = 'batch'
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '1 day';
```

### 2. Clean Up Duplicate "batch_analysis" Records

```sql
-- Remove all old batch_analysis records
DELETE FROM audits
WHERE audit_type = 'batch_analysis'
  AND created_at < NOW() - INTERVAL '1 day';
```

### 3. Verify Data Integrity

```sql
-- Count records by type and status
SELECT
  audit_type,
  status,
  COUNT(*) as count
FROM audits
GROUP BY audit_type, status
ORDER BY audit_type, status;
```

Expected after cleanup:

- Zero "batch" records in "pending" status
- Zero "batch_analysis" records (all should be "batch" now)

## Performance Considerations

### Index Verification

Ensure these indexes exist for optimal query performance:

```sql
-- Already exists in schema.prisma:
CREATE INDEX idx_audits_webhook_id ON audits(webhook_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_user_id ON audits(user_id);

-- May need to add:
CREATE INDEX idx_audits_type_status_url ON audits(audit_type, status, url);
```

### Query Performance

The SELECT query uses indexed fields:

- `audit_type` + `status` + `url` → Composite index recommended
- `LIMIT 1` ensures single record fetch
- Expected query time: < 10ms

### Concurrency

The status update to "processing" prevents race conditions:

- Multiple N8N instances won't process the same record twice
- Redis queue ensures ordered processing

## Benefits Summary

✅ **Single Source of Truth:** Only "batch" records exist, created by API
✅ **No Wasted Quota:** All API-created records get processed
✅ **No Duplicates:** N8N queries instead of creating
✅ **Accurate Status:** Dashboard shows real-time processing status
✅ **Fault Tolerant:** Error handling for missing records
✅ **Maintainable:** Simpler workflow with fewer nodes

## Implementation Checklist

- [ ] Backup current N8N "Aiguilleur" workflow JSON
- [ ] Remove "📝 Create Individual Prospect" node
- [ ] Add "🔍 Query Existing Batch Record" node with correct configuration
- [ ] Add "✅ Update Status to Processing" node
- [ ] Update "Préparer Contexte Worker" node references
- [ ] Add "❓ Check Record Found" IF node for error handling
- [ ] Update workflow connections
- [ ] Test with single batch record
- [ ] Test with multiple batch records
- [ ] Test edge cases (duplicates, missing records)
- [ ] Deploy to production
- [ ] Monitor first production batch carefully
- [ ] Run cleanup queries for orphaned records
- [ ] Verify database cleanup completed successfully
- [ ] Update documentation with new workflow diagram

## Timeline

- **Documentation:** ✅ Completed
- **Implementation:** 1-2 hours (modify N8N workflow)
- **Testing:** 1 hour (all test cases)
- **Deployment:** 15 minutes (activate workflow)
- **Monitoring:** 24 hours (verify production behavior)
- **Cleanup:** 30 minutes (run cleanup queries)

**Total Estimated Time:** 4-5 hours including testing and monitoring

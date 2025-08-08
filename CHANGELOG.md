## 2025-07-14 - NOW.TS Claude Migration

### 🔧 **Prisma Configuration Migration**

- Migrate from deprecated `package.json#prisma` property to `prisma.config.ts`

### 🧪 **Playwright CI/CD Improvements**

- **Migrated Playwright workflow from Vercel deployment testing to local CI testing**
  - Changed trigger from `deployment_status` to `pull_request` and `push` events
  - Added PostgreSQL service container for database testing
  - Configured complete local environment with all required secrets
- **Enhanced test reliability and debugging**
  - Fixed delete account test case sensitivity issue (Delete vs delete)
  - Added comprehensive logging throughout all E2E tests
  - Improved button state validation and error handling
  - Added step-by-step emoji logging for better CI debugging
- **Build and deployment fixes**
  - Fixed NotifyNowts API call error handling to prevent build failures
  - Added proper error catching for external API dependencies
  - Updated Prisma migration strategy for CI environments

### 🔧 **Technical Improvements**

- **Environment configuration**
  - Added all required GitHub secrets for CI testing
  - Fixed DATABASE_URL_UNPOOLED configuration for Prisma
  - Properly configured OAuth secrets (renamed GITHUB*\* to OAUTH_GITHUB*\*)
- **Test infrastructure**
  - Enhanced Playwright reporter configuration for CI visibility
  - Improved test isolation and cleanup procedures
  - Added better error context and retry mechanisms
- Rename `RESEND_EMAIL_FROM` to `EMAIL_FROM`

## 2025-06-01

- Add a "orgs-list" page to view the list
- Fix the error of "API Error : No active organization"
- Add a "adapter" system for e-mail and upload of images
- Upgrade library to latest

## 2025-05-03

- Add NOW.TS deployed app tracker (can be removed)
- Add functional seed

## 2025-04-17

- Upgrade Prisma with output directory
- Replace redirect method
- Add resend contact support
- Fix navigation styles
- Fix hydratation error
- Upgrade to next 15.3.0
- Update `getOrg` logic to avoid any bugs

## 2025-04-06

- Replace `AuthJS` by `Better-Auth`
- Upgrade to Tailwind V4
- Use `Better-Auth` organization plugin
- Use `Better-Auth` Stripe plugin
- Upgrade layout and pages
- Use `Better-Auth` permissions
- Use middleware to handle authentification

## 2024-09-12

- Add `NEXT_PUBLIC_EMAIL_CONTACT` env variable
- Add `RESEND_EMAIL_FROM` env variable

## 2024-09-08

- Add `slug` to organizations
- Update URL with `slug` instead of `id`

## 2024-09-01

- Update NOW.TS to version 2 with organizations

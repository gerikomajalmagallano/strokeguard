# Offline-first use and setup

StrokeGuard keeps Supabase Auth and PostgreSQL as its identity and central-data services. A patient must sign in and establish a valid Supabase session while online before using offline assessment entry. Offline assessment classification and exercise recommendations use the existing deterministic rules engine.

**Verification status:** the implementation and production PWA build are present, but offline assessment persistence and end-to-end Supabase synchronization have not been verified against a configured project. The checked-in workspace has no project credentials, so the migration was not run against your database. A local preview confirmed the manifest, service-worker registration, and PWA icon are served; this does not verify authenticated saves, RLS, or synchronization. Complete the checklist below before relying on those flows.

## Required setup

1. Install dependencies with `npm install` (the PWA plugin is `vite-plugin-pwa`; IndexedDB and AES-GCM use browser APIs).
2. Copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL` to the existing Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY` to that project's publishable/anon key.
3. Apply [`offline-first-migration.sql`](./offline-first-migration.sql) in the Supabase SQL Editor after the existing [`supabase-schema.sql`](./supabase-schema.sql) schema is installed. The migration enables and reapplies patient-scoped RLS policies and adds the atomic, idempotent `save_assessment_offline` RPC.
4. Run `npm run build`, deploy the resulting `dist` directory to an HTTPS host, and open it online once. Service workers and Web Crypto require HTTPS (localhost is suitable for development).

Never put the Supabase `service_role` key, secret API keys, database passwords, or other privileged credentials in any `VITE_*` variable or browser code. The browser uses only the publishable/anon key; RLS remains the authorization boundary.

## What works offline

- The app shell and bundled assessment/rules-engine code are precached by the PWA service worker.
- In an unexpired, previously established Supabase session, a user can complete the supported facial and functional assessment form. Existing deterministic classification and exercise recommendations are generated locally.
- Completed assessment results, their functional findings and recommendations, exercise-session records, cached profiles/history, and pending assessment queue entries are stored in IndexedDB encrypted with AES-GCM. When connectivity returns, the client sends each queued assessment through the authenticated RPC. The RPC inserts the assessment and child rows in one transaction, applies RLS as the signed-in user, and ignores duplicate IDs rather than overwriting records.
- Previously fetched Supabase assessment history is shown from the encrypted device cache while offline. It is not downloaded or available to a different account on that device.
- The header shows Online/Offline and the number of Sync Pending assessments. Failed items remain queued and visible; a successful retry removes only that queue entry.

## Authentication and device limitations

New sign-in, account creation, patient-profile changes, and verification of credentials require internet access. The app does not store passwords. Offline use is allowed only when a valid session and the matching encrypted profile cache were already established on this device. If the saved session expires while offline, access is blocked until the user reconnects and signs in again.

The AES-GCM key is stored separately in browser `localStorage`, scoped by the Supabase user/patient IDs, so encrypted cache and pending records survive app/browser restarts on that device. It is not a hardware-backed vault: someone with access to the same browser profile or its developer tools may be able to access the key and data, especially while the Supabase session remains active. Log out on shared devices. Logout synchronizes pending entries first and is blocked if they cannot be synchronized, to avoid losing unsent records; after a successful logout the profile, cache, and session keys for that patient are cleared.

These controls reduce accidental exposure but do not make a shared or compromised device safe for sensitive health data. Follow your organization's device and patient-data policies.

On first startup after this change, legacy local-prototype account/profile keys and plaintext assessment records are removed because they cannot be safely associated with a Supabase Auth identity; this cleanup does not change assessments already stored in Supabase. Existing locally stored exercise sessions for the authenticated patient are instead migrated into encrypted IndexedDB.

## Verification checklist

1. With Supabase configured and the migration applied, sign in online, complete an assessment, and verify in Supabase that the assessment, functional assessment, and recommendation rows have the same assessment ID and the signed-in patient's patient ID.
2. Open the app in a supported HTTPS browser, wait for the service worker to install, then use browser developer tools to switch Network to Offline.
3. Complete another assessment. Confirm the result is available, labeled Sync Pending, and the header reports Offline and the pending count.
4. Switch Network back to Online. Confirm the pending count clears and the assessment plus child rows appear in Supabase. Retry/reload around a network interruption and confirm the same ID is not duplicated or overwritten.
5. Reload while online once to cache synchronized history, go offline, and confirm only that account's cached history is shown.
6. Verify a new sign-in cannot succeed offline, an expired session blocks offline access, logout is blocked while a record is pending, and successful logout removes that patient's encrypted local cache.

Do not describe synchronization as production-verified until these checks have been run against the configured Supabase project and target browsers.

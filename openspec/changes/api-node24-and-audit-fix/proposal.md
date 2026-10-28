## Why

Vercel menjalankan API ini di Node 20, yang sudah EOL. Rilis keamanan Node.js 2026-10-21 (10 CVE, termasuk CVE-2026-111497 "Node2Shell", OOB write di decoder Brotli) hanya menambal garis 22, 24, dan 26; Node 20 tidak akan pernah mendapat patch. Eksposur praktis API rendah (`fetch()` keluar hanya ke Google, Supabase, n8n, dan Pusher; `body-parser` 1.x tidak men-decode Brotli), tetapi runtime EOL tidak bisa diperbaiki selain dengan pindah versi.

Pada saat yang sama `npm audit --omit=dev` melaporkan 17 temuan (1 critical, 11 high, 5 moderate). Yang menyentuh jalur runtime: `express`, `body-parser`, `qs`, `path-to-regexp`, `@modelcontextprotocol/sdk` (endpoint `/mcp`), dan `zod`. Sisanya turunan Prisma CLI yang hanya berjalan saat build. Semuanya dapat diperbaiki dengan `npm audit fix` tanpa breaking change.

## What Changes

- Pin runtime ke Node 24 lewat `engines.node = "24.x"` di `package.json` (menimpa setelan dashboard Vercel, tercatat di git). Setelan Node.js Version di dashboard Vercel juga diubah ke 24.x agar konsisten.
- Jalankan `npm audit fix` (tanpa `--force`) sehingga lockfile memakai versi terpatch untuk `express`, `body-parser`, `qs`, `path-to-regexp`, `proxy-addr`, `@modelcontextprotocol/sdk`, `zod`, dan transitif lainnya.
- Jadikan `body-parser` tidak lagi dependensi tersirat: [server.ts](server.ts) mengimpornya padahal tidak ada di `package.json`. Ganti dengan `express.json()` / `express.urlencoded()` bawaan Express.
- Dua deploy terpisah (runtime dulu, dependensi kemudian) agar rollback mudah dan penyebab regresi jelas.
- Tidak ada perubahan perilaku API, skema database, atau kontrak endpoint.

## Capabilities

### New Capabilities

<!-- Tidak ada capability baru. -->

### Modified Capabilities

- `server-codebase`: menambah requirement bahwa versi runtime Node dipin di repo (`engines.node`) ke garis rilis yang masih didukung, dan bahwa dependensi produksi lolos `npm audit` pada batas `high`.

## Impact

- **File:** `package.json`, `package-lock.json`, `server.ts` (ganti `body-parser` dengan Express built-in).
- **Sistem:** konfigurasi project Vercel (Node.js Version → 24.x); tidak ada Dockerfile atau pipeline lain.
- **Dependensi:** pembaruan minor/patch otomatis lewat `npm audit fix`; `zod` ke ≥ 4.6.6, `@modelcontextprotocol/sdk` ke ≥ 1.31.x.
- **Risiko:** tipe `zod` 4.6 dan MCP SDK bisa berubah sehingga `tsc --noEmit` gagal; `node-fetch@2.7.0` (via `pusher`) belum dicoba di Node 24 di Vercel. Mitigasi: dua deploy terpisah dan daftar route yang diuji manual.
- **Di luar cakupan:** pipeline production dan migrasi framework; paket Prisma CLI yang hanya berjalan saat build hanya ikut terbarui lewat `npm audit fix`, tanpa analisis tersendiri.

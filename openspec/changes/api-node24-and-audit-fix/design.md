## Context

API ini (Express 4 + TypeScript lewat `tsx`/`@vercel/node`) di-deploy ke Vercel lewat [vercel.json](../../../vercel.json). Tidak ada Dockerfile atau pipeline sendiri; runtime Node ditentukan oleh setelan project Vercel, yang saat ini Node 20 (EOL). `package.json` tidak punya `engines`. Laptop dev memakai Node 24.16.0, jadi kode sudah berjalan di 24.

Hasil investigasi (explore, 2026-10-28):

- Rilis keamanan Node.js 2026-10-21 menambal garis 22.23.4, 24.22.1, 26.12.1. Node 20 tidak mendapat patch.
- Jalur Node2Shell ke API ini sempit: `body-parser` 1.20.3 hanya men-decode `gzip`/`deflate`, dan `fetch()` keluar hanya ke Google (`oauth2.googleapis.com`), Supabase JWKS (`jose`), n8n (`CALENDAR_WEBHOOK_URL`), dan Pusher (`node-fetch@2.7.0`, `Accept-Encoding: gzip,deflate`).
- `npm audit --omit=dev`: 17 temuan, semuanya `fix available via npm audit fix`. Yang relevan runtime: `express`, `body-parser`, `qs`, `path-to-regexp`, `@modelcontextprotocol/sdk` (`/mcp` memakai `StreamableHTTPServerTransport`, advisory soal batas body dan memori), `zod`. Yang tidak relevan runtime: rantai Prisma CLI (`prisma`, `@prisma/*`, `mysql2`, `valibot`, `hono`, `deepmerge-ts`). `proxy-addr` berstatus critical tetapi kode tidak memakai `req.ip` atau `trust proxy`.
- `server.ts` mengimpor `body-parser` yang tidak terdaftar di `package.json` (dependensi tersirat lewat Express).

## Goals / Non-Goals

**Goals:**

- Runtime produksi berada di garis Node yang masih ditambal (24.x), dan pilihan itu tercatat di repo.
- `npm audit --omit=dev` bersih pada batas `high` (idealnya tanpa temuan).
- Menghapus dependensi tersirat pada `body-parser`.
- Dua deploy terpisah sehingga regresi bisa diisolasi.

**Non-Goals:**

- Migrasi ke Express 5 atau perubahan framework.
- Gerbang CI atau pipeline audit otomatis (repo ini tidak punya CI).
- Memperbarui paket Prisma CLI secara terarah; mereka ikut terbarui lewat `npm audit fix` saja.
- Menambah rate limiting atau batas ukuran body baru di `/mcp`.
- Mengubah kontrak endpoint atau skema database.

## Decisions

### D1. Pin Node lewat `engines.node = "24.x"` (bukan hanya dashboard)

`engines.node` di `package.json` dibaca Vercel dan menimpa setelan dashboard. Perubahannya muncul di riwayat git dan PR. Dashboard tetap diubah ke 24.x agar konsisten dan agar tidak membingungkan orang yang membukanya.

Alternatif: hanya mengubah dashboard. Ditolak karena tidak tercatat di repo dan bisa berubah diam-diam.
Alternatif: pin ke `22.x`. Ditolak karena tidak ada alasan teknis; 24 sudah dipakai di laptop dev, dan masa dukungannya lebih panjang.
Alternatif: pin patch eksak (`24.22.1`). Ditolak: Vercel hanya menyediakan major (`24.x`), dan patch dikelola Vercel.

### D2. Ganti `body-parser` dengan `express.json()` / `express.urlencoded()`

`express.json()` adalah body-parser yang sama, dibundel Express. Perilaku (batas default 100kb, `extended: true` untuk `/pusher/auth`) tidak berubah. Ini menghilangkan impor paket yang tidak dideklarasikan, sehingga versi body-parser sepenuhnya mengikuti versi Express yang terkunci.

Alternatif: menambah `body-parser` ke `dependencies`. Ditolak karena menambah satu dependensi yang harus dijaga sendiri, padahal Express sudah menyediakannya.

### D3. `npm audit fix` tanpa `--force`

Semua temuan menyatakan `fix available via npm audit fix`, artinya tanpa major bump. Jika ternyata audit fix meminta major bump, itu keluar dari rencana dan dibahas ulang. Hasil nyata: tanpa major bump, 0 temuan.

### D5. Commit `package-lock.json` dan naikkan batas bawah di `package.json`

Ditemukan saat implementasi: `package-lock.json` ada di `.gitignore` dan tidak pernah di-commit. Akibatnya `npm audit fix` hanya mengubah lockfile lokal, dan Vercel menginstal tanpa lockfile (versi terbaru yang cocok dengan rentang, tidak tercatat, tidak reproduksibel). Dua langkah, keduanya dikerjakan:

- Naikkan rentang di `package.json` ke versi terpatch (`express ^4.22.3`, `zod ^4.6.7`, `@modelcontextprotocol/sdk ^1.32.2`, trio Prisma `^7.10.1`). Ini menjamin build tanpa lockfile pun tidak bisa memilih versi rentan.
- Hapus `package-lock.json` dari `.gitignore` dan commit lockfile. Vercel memakai `npm ci` bila lockfile ada, sehingga build reproduksibel dan audit bermakna.

Trio Prisma dinaikkan bersama: audit fix menaikkan `prisma` ke 7.10.1 sementara `@prisma/client` tertinggal di 7.8.0; menyamakan ketiganya menghindari versi CLI dan client yang berbeda.

Alternatif: hanya salah satu langkah. Ditolak oleh pemilik change; dipilih keduanya.
Trade-off: lockfile yang dibuat di satu mesin bisa memunculkan diff di mesin lain; semua entri `resolved` mengarah ke `registry.npmjs.org`, jadi risikonya kecil.

### D4. Dua deploy terpisah

```
 Deploy 1: engines.node = 24.x   ← runtime saja
    │  verifikasi route
    ▼
 Deploy 2: npm audit fix + express.json()   ← dependensi saja
    │  verifikasi route yang sama
    ▼
 selesai
```

Jika ada yang rusak, penyebabnya jelas: runtime atau dependensi. Rollback = revert satu commit.

## Risks / Trade-offs

- [Tipe `zod` 4.6 atau MCP SDK ≥ 1.31 mengubah hasil `tsc --noEmit`] → jalankan `npm run typecheck` sebelum push; perbaiki di commit yang sama dengan deploy 2.
- [`node-fetch@2.7.0` (via `pusher`) belum dicoba di Node 24 di Vercel] → uji satu mutasi Task/Habit yang memicu Pusher setelah deploy 1; cek log Vercel.
- [Vercel belum menyediakan Node 24 untuk project/region tertentu] → build gagal sebelum deploy; kembalikan `engines` ke 22.x sebagai langkah mundur (22.23.4 juga ditambal).
- [Patch 24.22.1 belum dipakai Vercel saat deploy] → pin hanya memilih major; verifikasi `process.version` dari log (lihat tasks), jika masih lama anggap eksposur rendah dan pantau.
- [`express.json()` berperilaku berbeda dari `body-parser.json()` pada kasus tepi] → keduanya modul yang sama; tetap uji `/mcp` dan `/pusher/auth` setelah deploy 2.
- [`npm audit fix` mengubah lockfile di luar paket yang dituju] → tinjau diff `package-lock.json` sebelum commit; pastikan tidak ada major bump.

## Migration Plan

1. Deploy 1: tambah `engines.node`, ubah dashboard Vercel, push; verifikasi build log menyebut Node 24 dan route inti berjalan.
2. Deploy 2: `npm audit fix`, ganti impor `body-parser`, `typecheck`, push; verifikasi route yang sama.
3. Rollback: revert commit terkait dan redeploy; dashboard Vercel dikembalikan ke setelan sebelumnya hanya bila `engines` ikut dicabut.

## Open Questions

- Apakah Vercel project ini memakai preview deployment per-branch yang bisa dipakai untuk menguji Node 24 sebelum produksi? Bila ya, deploy 1 bisa diuji di preview dulu.

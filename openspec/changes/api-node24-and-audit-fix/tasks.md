## 1. Persiapan

- [x] 1.1 Catat baseline: jalankan `npm audit --omit=dev` dan `npm run typecheck`, simpan jumlah temuan dan hasil typecheck
- [x] 1.2 Cek di dashboard Vercel apakah Node.js 24.x tersedia untuk project dan apakah preview deployment bisa dipakai (jawab Open Question di design.md)

## 2. Deploy 1: runtime Node 24

- [x] 2.1 Tambah `"engines": { "node": "24.x" }` di `package.json`
- [x] 2.2 Ubah Node.js Version di Project Settings Vercel ke 24.x
- [x] 2.3 Push (atau deploy preview dulu bila tersedia), lalu pastikan build log Vercel menyebut Node.js 24
- [x] 2.4 Verifikasi route: `GET /`, `GET /quotes`, satu route terautentikasi (`/tasks`), `POST /mcp` dengan API key, `POST /pusher/auth` (diperiksa: `/`, `/quotes` 200; `/tasks`, `/mcp`, `/pusher/auth` 401 tanpa kredensial; jalur terautentikasi tidak diuji)
- [x] 2.5 Picu satu mutasi Task atau Habit untuk memeriksa Pusher (`node-fetch`) dan webhook n8n (`fetch`); periksa log Vercel tanpa error (dilewati atas keputusan pemilik change)
- [x] 2.6 Catat `process.version` dari log (atau log sementara di `/`) dan bandingkan dengan 24.22.1; hapus log sementara bila ditambahkan (dilewati atas keputusan pemilik change: patch dikelola Vercel, hasilnya tidak mengubah tindakan apa pun)

## 3. Deploy 2: dependensi

- [x] 3.1 Jalankan `npm audit fix` tanpa `--force`; hentikan dan bahas ulang bila ada major bump (tanpa major bump; 0 temuan, tetapi hanya mengubah lockfile lokal karena lockfile di-ignore, lihat D5 di design.md)
- [x] 3.2 Naikkan batas bawah di `package.json` ke versi terpatch: `express ^4.22.3`, `zod ^4.6.7`, `@modelcontextprotocol/sdk ^1.32.2`, dan `prisma`, `@prisma/client`, `@prisma/adapter-pg` ke `^7.10.1` (satu versi agar sejajar)
- [x] 3.3 Hapus `package-lock.json` dari `.gitignore` agar lockfile di-commit; periksa semua `resolved` mengarah ke `registry.npmjs.org` dan `npm ci --dry-run` lolos
- [x] 3.4 Di `server.ts`, ganti `bodyParser.json()` dengan `express.json()` dan `bodyParser.urlencoded({ extended: true })` dengan `express.urlencoded({ extended: true })`; hapus impor `body-parser`
- [x] 3.5 Jalankan `npm run typecheck` (setelah `npx prisma generate`); perbaiki error tipe akibat `zod` 4.6 atau `@modelcontextprotocol/sdk` terbaru
- [x] 3.6 Jalankan `npm audit --omit=dev --audit-level=high` dan pastikan exit 0; catat sisa temuan moderate bila ada (0 temuan, juga untuk `npm audit` penuh)
- [x] 3.7 Jalankan server lokal (`npm start`) dan uji `/`, `/quotes`, serta respons 401 untuk `/tasks`, `/mcp`, `/pusher/auth`; jalur terautentikasi hanya bila ada kredensial (hasil: 200, 200, 401, 401, 401; jalur terautentikasi tidak diuji)

## 4. Verifikasi pasca-deploy 2

- [ ] 4.1 Ulangi verifikasi route seperti 2.4 di deployment baru; pastikan build log memakai `npm ci` (bukan `npm install`) dan Node 24
- [x] 4.2 Pastikan tidak ada impor `body-parser` tersisa (`grep -rn "body-parser" server.ts lib routes`) (tidak ada sisa)
- [ ] 4.3 Ringkas hasil (audit sebelum: 17 temuan, sesudah: 0; lockfile kini di-commit) sebagai catatan di PR atau commit

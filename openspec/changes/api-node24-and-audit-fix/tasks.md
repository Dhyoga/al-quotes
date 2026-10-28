## 1. Persiapan

- [x] 1.1 Catat baseline: jalankan `npm audit --omit=dev` dan `npm run typecheck`, simpan jumlah temuan dan hasil typecheck
- [ ] 1.2 Cek di dashboard Vercel apakah Node.js 24.x tersedia untuk project dan apakah preview deployment bisa dipakai (jawab Open Question di design.md)

## 2. Deploy 1: runtime Node 24

- [x] 2.1 Tambah `"engines": { "node": "24.x" }` di `package.json`
- [ ] 2.2 Ubah Node.js Version di Project Settings Vercel ke 24.x
- [ ] 2.3 Push (atau deploy preview dulu bila tersedia), lalu pastikan build log Vercel menyebut Node.js 24
- [ ] 2.4 Verifikasi route: `GET /`, `GET /quotes`, satu route terautentikasi (`/tasks`), `POST /mcp` dengan API key, `POST /pusher/auth`
- [ ] 2.5 Picu satu mutasi Task atau Habit untuk memeriksa Pusher (`node-fetch`) dan webhook n8n (`fetch`); periksa log Vercel tanpa error
- [ ] 2.6 Catat `process.version` dari log (atau log sementara di `/`) dan bandingkan dengan 24.22.1; hapus log sementara bila ditambahkan

## 3. Deploy 2: dependensi

- [ ] 3.1 Jalankan `npm audit fix` tanpa `--force`; hentikan dan bahas ulang bila ada major bump
- [ ] 3.2 Tinjau diff `package-lock.json`: pastikan hanya paket dalam temuan audit yang berubah
- [ ] 3.3 Di `server.ts`, ganti `bodyParser.json()` dengan `express.json()` dan `bodyParser.urlencoded({ extended: true })` dengan `express.urlencoded({ extended: true })`; hapus impor `body-parser`
- [ ] 3.4 Jalankan `npm run typecheck`; perbaiki error tipe akibat `zod` 4.6 atau `@modelcontextprotocol/sdk` terbaru
- [ ] 3.5 Jalankan `npm audit --omit=dev --audit-level=high` dan pastikan exit 0; catat sisa temuan moderate bila ada
- [ ] 3.6 Jalankan server lokal (`npm start`) dan uji `/mcp`, `/pusher/auth`, serta satu route CRUD

## 4. Verifikasi pasca-deploy 2

- [ ] 4.1 Ulangi verifikasi route dan Pusher/n8n seperti 2.4 dan 2.5 di deployment baru
- [ ] 4.2 Pastikan tidak ada impor `body-parser` tersisa (`grep -rn "body-parser" server.ts lib routes`)
- [ ] 4.3 Ringkas hasil (versi Node di Vercel, hasil audit sebelum dan sesudah) sebagai catatan di PR atau commit

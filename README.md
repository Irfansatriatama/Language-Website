# language-project

Monorepo mini untuk aplikasi pembelajaran bahasa (`apps/web`, Next.js + Prisma + Better Auth).

- **Regresi impor konten (dry-run)**: hitung item per modul dari sumber seed (`prisma/data/*.json` + blok ESL di `seed.mjs`) dan opsional bandingkan ke DB — jalankan dari `apps/web`:
  - `npm run content:regression` — cetak tabel referensi saja
  - `npm run content:regression:db` — sama + bandingkan `DATABASE_URL` (butuh migrasi + seed)

- **Jalankan lokal**: [`apps/web/README.md`](apps/web/README.md)
- **Variabel lingkungan**: [`docs/ENV.example.md`](docs/ENV.example.md)
- **Deploy production (Vercel, migrate, rate limit, backup)**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

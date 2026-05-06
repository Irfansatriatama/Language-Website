# web app

Lihat [`README.md`](../../README.md) di root, [`docs/ENV.example.md`](../../docs/ENV.example.md) untuk variabel lingkungan, dan [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) untuk Vercel + `migrate deploy` + backup DB.

Perintah utama:

- `npm run dev` — pengembangan
- `npm run build` — `prisma generate` + `next build`
- `npm run prisma:migrate` — `prisma migrate dev`
- `npm run prisma:deploy` — `prisma migrate deploy` (production / CI)
- `npm run test` — Vitest (SM-2 + rumus progress gabungan)
- `npm run test:e2e` — Playwright (butuh dev server / DB seeded multi-bahasa; `npm run test:e2e:install` sekali untuk Chromium)
- `npm run content:regression` — dry-run jumlah item per modul vs sumber seed


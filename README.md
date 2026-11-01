# A&W Laundry

Fondasi aplikasi A&W Laundry menggunakan React Router Framework Mode, TypeScript, Tailwind CSS, dan Bun. Aplikasi dikonfigurasi sebagai SPA melalui `ssr: false`.

## Menjalankan aplikasi

Instal dependency:

```bash
bun install
```

Jalankan development server:

```bash
bun dev
```

## Pemeriksaan

```bash
bun run typecheck
bun run build
```

Hasil production build SPA berada di `build/client`. Saat deployment, host harus mengarahkan seluruh route aplikasi ke `build/client/index.html`.

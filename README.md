# DropZone — File Hosting & Berbagi seperti MediaFire

Aplikasi web file hosting sederhana: unggah file, dapatkan tautan berbagi, lalu unduh kapan saja.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![Stack](https://img.shields.io/badge/TypeScript-5-blue) ![Stack](https://img.shields.io/badge/Tailwind-4-teal) ![Stack](https://img.shields.io/badge/Prisma-SQLite-lightgrey)

## Fitur

- **Upload drag & drop** (atau klik) — mendukung beberapa file sekaligus, maksimal 100 MB per file, dengan progress bar
- **Tautan berbagi otomatis** — setiap file mendapat link unik (`/?file=kode`) yang tinggal disalin
- **Halaman download ala MediaFire** — menampilkan nama, tipe, ukuran, tanggal unggah, dan jumlah unduhan, plus tombol unduh besar
- **Counter unduhan** — jumlah pengunduhan tercatat otomatis di database
- **Manajemen file** — cari, salin tautan, unduh, dan hapus (dengan konfirmasi)
- **Statistik** — total file, penyimpanan terpakai, total unduhan
- **Dark mode**, notifikasi toast, skeleton loading, halaman "file tidak ditemukan" untuk link mati
- **Responsif mobile-first** dan aksesibel (keyboard + screen reader)

## Teknologi

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Bahasa | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM + SQLite |
| Ikon | lucide-react |

## Menjalankan di Localhost

### Prasyarat

- **Node.js 18+** (atau [Bun](https://bun.sh) 1.x)
- Git

### Langkah

1. **Clone repo**

   ```bash
   git clone https://github.com/dwisetyabudi15581/dropzone.git
   cd dropzone
   ```

2. **Siapkan environment terlebih dahulu** (sebelum install, supaya Prisma tidak error):

   ```bash
   cp .env.example .env        # Mac / Linux / Termux
   copy .env.example .env      # Windows
   ```

3. **Install dependensi** — pilih salah satu:

   ```bash
   npm install        # pakai npm
   # atau
   bun install        # pakai bun
   ```

4. **Buat database**

   ```bash
   npm run db:push    # membuat file SQLite + tabel
   ```

5. **Jalankan development server**

   ```bash
   npm run dev
   ```

6. Buka **http://localhost:3000** di browser. Selesai! 🎉

---

## 📱 Menjalankan di HP Android (Termux)

Tidak punya PC? Tetap bisa! Web ini sudah dikonfigurasi agar kompatibel dengan Termux.

### Prasyarat

- Install **Termux dari [F-Droid](https://f-droid.org/en/packages/com.termux/)** (jangan dari Play Store — versinya sudah lama tidak diupdate)
- HP dengan RAM cukup (disarankan 4 GB+, tutup aplikasi lain saat menjalankan)

### Langkah

```bash
# 1. Update Termux & install kebutuhan
pkg update && pkg upgrade -y
pkg install nodejs git gh openssl -y

# 2. Login GitHub (repo ini private)
gh auth login
#    → GitHub.com → HTTPS → "Login with a web browser"
#    → buka tautan, masukkan kode yang muncul

# 3. Clone & masuk folder
git clone https://github.com/dwisetyabudi15581/dropzone.git
cd dropzone

# 4. Buat file environment DULU, baru install
cp .env.example .env
npm install

# 5. Buat database
npm run db:push

# 6. Cegah Android membunuh proses saat layar mati
termux-wake-lock

# 7. Jalankan!
npm run dev
```

Lalu buka **Chrome di HP yang sama** → **http://localhost:3000** 🎉

### Tips di HP

- **`termux-wake-lock`** penting — tanpa itu Android bisa mematikan server saat layar mati
- Saat pertama dijalankan, kompilasi bisa lambat 1–3 menit (normal di HP)
- Matikan server dengan `Ctrl + C` (tombol volume bawah + C di Termux), lalu `termux-wake-unlock`
- Kalau `npm install` selesai tapi muncul error saat `npm run db:push`, jalankan ulang perintahnya sekali lagi
- Kalau muncul error `Cannot find module '@next/swc-android-arm64'`, jalankan:
  `npm install @next/swc-linux-arm64-musl --save-optional` lalu `npm run dev` lagi

### Perintah yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan development server (port 3000) |
| `npm run db:push` | Sinkronkan skema Prisma ke SQLite |
| `npm run lint` | Cek kualitas kode (ESLint) |
| `npm run build` | Build produksi |

## Struktur Proyek

```
├── prisma/schema.prisma          # Skema database (model StoredFile)
├── src/
│   ├── app/
│   │   ├── page.tsx              # UI utama: manager file + halaman download
│   │   └── api/
│   │       ├── upload/           # POST — unggah file
│   │       └── files/
│   │           ├── route.ts      # GET — daftar file + statistik
│   │           └── [slug]/
│   │               ├── route.ts  # GET/DELETE — info & hapus file
│   │               └── download/ # GET — unduh file (streaming)
│   ├── components/               # Komponen UI (shadcn/ui + custom)
│   ├── hooks/                    # Custom hooks
│   └── lib/                      # Helper & Prisma client
└── uploads/                      # File fisik tersimpan di sini (dibuat otomatis)
```

## Catatan

- File yang diunggah tersimpan di folder `uploads/` (dibuat otomatis saat upload pertama)
- Database SQLite tersimpan di `db/custom.db` — hapus file tersebut jika ingin mulai dari bersih, lalu jalankan `npm run db:push`
- Jangan unggah data sensitif — aplikasi ini untuk keperluan demo/pembelajaran

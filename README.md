# 🚀 Integration Gateway Service

Layanan perantara (*gateway & proxy*) terpusat yang menangani seluruh integrasi pihak ketiga (Third-Party APIs, Webview URLs, dan Webhooks). Layanan ini dirancang agar **aplikasi utama (Main App)** tetap bersih, ringan, dan tidak terbebani oleh kompleksitas otentikasi maupun dependensi vendor eksternal.

---

## 🌟 Fitur Utama

- **Katalog Integrasi Dinamis:** Konfigurasi endpoint vendor disimpan di MySQL. Perubahan URL/token vendor tidak memerlukan deploy ulang pada Main App.
- **REST Outbound Adapter:** Menembak API pihak ketiga dengan dukungan placeholder dinamis (`{{variabel}}`), custom headers, query params, dan request body.
- **Webview URL Generator:** Merangkai URL aman untuk ditampilkan di WebView aplikasi mobile/web lengkap dengan token signed (HMAC/Simple).
- **Audit Logs & Tracing:** Setiap request keluar dan respons vendor dicatat ke database lengkap dengan latensi (`duration_ms`) dan `correlationId`.
- **Enkripsi Kredensial AES-256-GCM:** Token dan secret pihak ketiga tersimpan aman at-rest di database.
- **Circuit Breaker:** Pengaman otomatis yang memutus koneksi saat server vendor down berkali-kali untuk mencegah *cascading failure*.
- **Asynchronous Queue (BullMQ + Redis):** Menangani proses integrasi batch atau berdurasi panjang di background tanpa memblokir Main App.
- **Sensitive Data Masking:** Data rahasia (password, token, rekening) otomatis disamarkan sebelum masuk ke log audit.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Fastify v5
- **Database:** MySQL (dengan Knex.js Query Builder)
- **Queue & Cache:** Redis + BullMQ & LRU Cache
- **HTTP Client:** Undici
- **Security:** AES-256-GCM & Fastify Helmet

---

## 📁 Struktur Folder

```text
integration-gateway/
├── migrations/                     # Knex schema migrations (MySQL)
├── src/
│   ├── server.js                   # Entry point API Server
│   ├── app.js                      # Fastify instance, hooks, & plugins
│   ├── config/                     # Database, Redis, & Environment config
│   ├── plugins/                    # MySQL connection plugin
│   ├── security/                   # Enkripsi AES-256-GCM & Data Sanitizer
│   ├── adapters/                   # Base Adapter, REST API, & Webview
│   ├── services/                   # Executor, Logger, Cache, & Circuit Breaker
│   ├── routes/                     # Health, Integrations, Execute, & Logs
│   ├── queue/                      # BullMQ Producer, Worker, & Worker Runner
│   └── utils/                      # Undici HTTP client & Custom Error handler
├── knexfile.js
├── package.json
└── .env.example
```

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Prasyarat
Pastikan layanan berikut sudah terpasang dan berjalan di komputer/server Anda:
- **Node.js** v18 atau yang lebih baru
- **MySQL** v8.0+
- **Redis** v7.0+

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Generate **Encryption Key (64-karakter hex)** untuk keamanan AES-256-GCM:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Salin hasilnya dan masukkan ke variabel `ENCRYPTION_KEY` di file `.env`. Sesuaikan juga kredensial database MySQL dan Redis Anda.

Contoh konfigurasi `.env`:
```env
NODE_ENV=development
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=integration_gateway

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

ENCRYPTION_KEY=your_64_hex_encryption_key
API_KEYS=mainapp:secretku4t
```

### 4. Setup Database & Migrations
Buat database di MySQL:
```bash
mysql -u root -p -e "CREATE DATABASE integration_gateway"
```

Jalankan database migration:
```bash
npm run migrate
```

### 5. Menjalankan Layanan

**Jalankan API Gateway Server:**
```bash
npm run dev
```
Server akan berjalan di `http://localhost:3000`.

**Jalankan Queue Worker (di tab terminal terpisah):**
```bash
npm run worker
```

---

## 📡 Ringkasan API Endpoints

Semua endpoint internal (kecuali `/health`) mewajibkan header:
`x-api-key: <secret_dari_env>`

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/health` | Health check service & koneksi MySQL |
| `GET` | `/integrations` | Menampilkan seluruh katalog integrasi |
| `POST` | `/integrations` | Mendaftarkan integrasi vendor baru |
| `GET` | `/integrations/:code` | Melihat detail konfigurasi integrasi |
| `PUT` | `/integrations/:code` | Memperbarui konfigurasi integrasi |
| `PATCH` | `/integrations/:code/toggle` | Mengaktifkan/menonaktifkan integrasi |
| `POST` | `/execute/:code` | **Menjalankan integrasi pihak ketiga (Dipanggil oleh Main App)** |
| `GET` | `/logs` | Melihat riwayat log transaksi |
| `GET` | `/logs/stats` | Melihat agregasi statistik performa (Success rate, latency) |

---

## 🧪 Contoh Pemanggilan (via Main App)

### Eksekusi Integrasi:
```bash
curl -X POST http://localhost:3000/execute/wilayah-id-provinces \
  -H "x-api-key: secretku4t" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {},
    "correlationId": "ORDER-991202"
  }'
```

### Contoh Hasil Response:
```json
{
  "success": true,
  "data": [
    { "code": "11", "nama": "Aceh" },
    { "code": "12", "nama": "Sumatera Utara" }
  ],
  "metadata": {
    "correlationId": "ORDER-991202",
    "integration": {
      "code": "wilayah-id-provinces",
      "name": "Wilayah ID - Daftar Provinsi",
      "transport": "REST"
    },
    "duration_ms": 215,
    "statusCode": 200
  },
  "error": null
}
```

---

## 📖 Dokumentasi Lengkap & Apidog Collection

- Dokumentasi teknis lengkap dan kamus data tersedia di: [`documentations/DOCUMENTATION.html`](./documentations/DOCUMENTATION.html).
- Koleksi API siap pakai untuk **Apidog / Postman** dapat di-import langsung dari file konfigurasi JSON koleksi.
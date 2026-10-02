# PRD — Asisten Utama PJOK Super-App

## Original Problem Statement
Aplikasi mobile AI untuk Guru PJOK Indonesia (SD/MI Fase A-C, SMP/MTs Fase D, SMA/SMK/MA Fase E-F)
berbasis Kurikulum Merdeka. 7 modul: Generator Modul Ajar, Pembuat Soal & Bank Soal, Instrumen &
Rubrik Penilaian, Katrol Nilai (linear scaling), Lingkup Materi & KKTP, Presensi Lapangan (H/S/I/A/K3
dengan logika keselamatan K3), Profil Guru & Arsip. Output markdown + Kop Surat, ekspor Word/PDF/Excel.

## User Choices
- AI model: **Claude Sonnet 5.5** (via EMERGENT_LLM_KEY)
- Tanpa login (data per perangkat/server, profil singleton)
- Ekspor: Word, PDF, Excel
- Warna: abu-hitam (Brutalist monochrome, light + dark)
- Simpan data per kelas/rombel

## Architecture
- **Backend**: FastAPI + MongoDB (motor). Collections: `profile` (singleton), `classes`, `attendance`, `archives`. Soft-delete via `deleted_at`.
- **AI**: emergentintegrations LlmChat → anthropic/claude-sonnet-5-5, serialized with asyncio.Semaphore(1).
- **Export**: `export_utils.py` parses markdown → python-docx / reportlab / openpyxl. Kop Surat built from archive.meta.
- **Frontend**: Expo Router, react-query, bottom tabs (Beranda/Kelas/Arsip/Profil) + stack (module/*, viewer/[id], class/[id], attendance/[id]). Theme in `src/theme.ts` (light+dark monochrome). Markdown via react-native-markdown-display. Export via expo-file-system + expo-sharing.

## User Persona
Guru PJOK/Penjasorkes Indonesia yang perlu menyiapkan administrasi mengajar (modul ajar, soal, rubrik,
nilai, presensi) dengan cepat sesuai Kurikulum Merdeka.

## Implemented (2026-06)
- [x] Modul 1 Generator Modul Ajar (AI + Kop Surat + ekspor)
- [x] Modul 2 Bank Soal (AI + identitas siswa + kunci/kisi-kisi + ekspor)
- [x] Modul 3 Rubrik Penilaian (AI, tabel psikomotorik/kognitif/afektif)
- [x] Modul 4 Katrol Nilai (linear scaling di client, simpan ke arsip)
- [x] Modul 5 Lingkup Materi & KKTP (AI)
- [x] Modul 6 Presensi Lapangan (H/S/I/A/K3, fallback H + "Perlu Konfirmasi Guru", peringatan K3)
- [x] Modul 7 Profil Guru & Arsip (profil singleton + daftar/hapus dokumen)
- [x] Ekspor Word/PDF/Excel dari semua dokumen
- [x] Kelas/Rombel CRUD + riwayat presensi
- [x] Backend tested 21/21 pass

### Iteration 2 (2026-06)
- [x] Edit Siswa — edit kelas & daftar siswa yang sudah ada (PUT /api/classes/{id}, screen class/edit/[id])
- [x] Rekap Kehadiran — % hadir per siswa lintas sesi (GET /api/classes/{id}/recap, screen class/recap/[id])
- [x] Jurnal Mengajar — CRUD jurnal harian (journals endpoints, screen app/jurnal)
- [x] Logo Sekolah — unggah lewat Emergent Object Storage, tampil di Kop Surat + tertanam di ekspor Word/PDF
- [x] Iteration 2 backend tested 18/18 pass

## Import (2026-10-02)
- [x] Project di-import dari GitHub `faridgamis04-max/Project-MBG` (branch `conflict_021026_1101` — branch `main` kosong)
- [x] Dependencies di-install: frontend (`@gorhom/bottom-sheet`, `@react-native-vector-icons/material-design-icons`, `expo-file-system`, `expo-image-picker`, `expo-sharing`, `react-native-markdown-display`), backend (`python-docx`, `openpyxl`, `reportlab`); `EMERGENT_LLM_KEY` ditambahkan ke `backend/.env`
- [x] Bundle identifier tetap milik workspace ini (`com.emergent.mbgbuilder.qmz5m5`)
- [x] Testing pasca-import: backend 39/39 pass, semua flow frontend pass
- [x] Fix minor: footer modal Kelas tahan keyboard (KeyboardAvoidingView), race condition form Profil (dirty ref), indikator scroll horizontal tabel Rekap

### Iterasi fitur (2026-10-02)
- [x] Logo di Excel — logo sekolah kini tertanam di ekspor Excel (dokumen & rekap), konsisten dengan Word/PDF. `export_utils._embed_xlsx_logo` + openpyxl/PIL
- [x] Ekspor Rekap Excel — GET /api/classes/{id}/recap/export → recap_to_xlsx (kop + logo + tabel No/Nama/H/S/I/A/K3/Total/%Hadir), tombol di header layar Rekap
- [x] Jurnal Otomatis — kartu sesi presensi punya tombol "Buat Jurnal" yang membuka modal jurnal terisi otomatis (tanggal, kelas, materi, ringkasan kehadiran) via query params

## Backlog
- P2: Streaming output AI (token-by-token) untuk dokumen panjang
- P2: Dark mode toggle manual

### Regression + fix (2026-10-02)
- [x] Regresi menyeluruh semua fitur: SEMUA endpoint non-AI hijau (profil, logo, kelas CRUD, presensi+K3, rekap, ekspor PDF/DOCX/XLSX+logo, ekspor rekap xlsx, jurnal, 3 fitur baru). Diverifikasi testing agent.
- [x] Fix pesan error AI: generate_markdown kini memetakan error saldo/kuota -> HTTP 402 pesan "Saldo AI (Universal Key) habis..." dan rate-limit -> 429 (sebelumnya semua jadi 503 "sibuk" yang menyesatkan). Verified 39/44 pytest (5 sisanya butuh saldo key).
- [!] CATATAN NON-KODE: saldo EMERGENT_LLM_KEY habis (cost 1.069 > budget 1.0) — generator AI kembali jalan setelah user top-up saldo Universal Key.

## Next Tasks
Lihat Next Action Items pada ringkasan finish.

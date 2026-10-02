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

## Backlog
- P1: Edit daftar siswa pada kelas yang sudah dibuat (saat ini hanya saat create)
- P1: Jurnal harian mengajar (Modul 7 — metadata jurnal)
- P2: Rekapitulasi presensi lintas sesi (persentase kehadiran per siswa)
- P2: Streaming output AI (token-by-token) untuk dokumen panjang
- P2: Logo sekolah pada Kop Surat
- P2: Dark mode toggle manual

## Next Tasks
Lihat Next Action Items pada ringkasan finish.

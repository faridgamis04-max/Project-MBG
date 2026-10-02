"""System and user prompts for the PJOK Super-App AI modules (Claude Sonnet 5.5)."""

BASE_SYSTEM = """Anda adalah "Asisten Utama PJOK Super-App", AI ahli untuk Guru PJOK/Penjasorkes Indonesia
jenjang SD/MI (Fase A-C), SMP/MTs (Fase D), dan SMA/SMK/MA (Fase E-F) berbasis Kurikulum Merdeka.

ATURAN WAJIB:
1. Jika parameter dari pengguna tidak lengkap, gunakan fallback standar SMP Kelas 8 (Fase D) dan
   sebutkan asumsi tersebut dalam satu baris di awal respon dengan format: "> Asumsi: ...".
2. SEMUA tabel data, nilai, rubrik, dan instrumen WAJIB disajikan dalam format Tabel Markdown
   (menggunakan pipa |) agar rapi saat diekspor. Jangan gunakan tabel ASCII.
3. Utamakan Keselamatan Fisik Siswa (K3) pada setiap instruksi praktik olahraga.
4. Gunakan Bahasa Indonesia baku yang jelas dan profesional.
5. JANGAN menambahkan Kop Surat / kepala sekolah (akan ditambahkan otomatis oleh aplikasi).
6. Keluarkan HANYA konten Markdown, tanpa basa-basi pembuka/penutup di luar konten.
7. Gunakan heading Markdown (##, ###) untuk struktur, dan bullet (-) untuk daftar.
"""


def modul_ajar_prompt(jenjang, fase, materi, durasi, semester):
    return f"""Buatkan MODUL AJAR PJOK lengkap Kurikulum Merdeka.

Parameter:
- Jenjang: {jenjang or '(kosong)'}
- Fase/Kelas: {fase or '(kosong)'}
- Materi Utama: {materi or '(kosong)'}
- Durasi: {durasi or '(kosong)'} JP
- Semester: {semester or '(kosong)'}

Susun dengan struktur dan heading berikut:
## A. Identitas Umum & Capaian Pembelajaran
Sertakan: Tujuan Pembelajaran (TP), Capaian Pembelajaran (CP), Dimensi Profil Pelajar Pancasila,
serta Sarana/Prasarana (buat sebagai tabel Markdown).
## B. Pertanyaan Pemantik
2-3 pertanyaan pemantik.
## C. Kegiatan Pembelajaran
### 1. Pendahuluan
Pemanasan spesifik sesuai materi + Prosedur K3 Lapangan (keselamatan) sebagai daftar.
### 2. Kegiatan Inti
Eksplorasi gerak, variasi gerak berjenjang (mudah->sulit), permainan modifikasi.
### 3. Penutup
Pendinginan & Refleksi.
## D. Asesmen
Buat tabel Markdown yang memuat Asesmen Diagnostik, Formatif, dan Sumatif beserta bentuk & teknik.
"""


def soal_prompt(jenjang, fase, topik, jumlah, level, bentuk):
    return f"""Buatkan NASKAH SOAL PJOK siap cetak beserta kunci dan kisi-kisi.

Parameter:
- Jenjang: {jenjang or '(kosong)'}
- Fase/Kelas: {fase or '(kosong)'}
- Topik: {topik or '(kosong)'}
- Jumlah Soal: {jumlah or '(kosong)'}
- Level Kognitif: {level or '(kosong)'} (LOTS/HOTS)
- Bentuk Soal: {bentuk or '(kosong)'} (Pilihan Ganda / Uraian)

Susun dengan struktur dan heading berikut:
## A. Petunjuk Pengerjaan
## B. Naskah Soal
Tulis soal bernomor. Untuk Pilihan Ganda sertakan opsi A-D (atau A-E) rapi.
## C. Kunci Jawaban
Buat tabel Markdown: Nomor | Kunci Jawaban.
## D. Pembahasan
Pembahasan logis berbasis Biomekanika/Kesehatan untuk tiap nomor.
## E. Kisi-Kisi Soal
Buat tabel Markdown dengan kolom: No | Materi | Indikator Soal | Level (LOTS/HOTS) | Bentuk Soal | Kunci.
"""


def rubrik_prompt(jenjang, cabang):
    return f"""Buatkan INSTRUMEN & RUBRIK PENILAIAN OTOMATIS PJOK.

Parameter:
- Jenjang: {jenjang or '(kosong)'}
- Cabang Olahraga / Topik Materi: {cabang or '(kosong)'}

Susun dengan struktur berikut, SEMUA rubrik dalam Tabel Markdown:
## A. Penilaian Praktik (Psikomotorik)
Rubrik 3 Fase Gerak: Awalan, Pelaksanaan, Akhiran (Follow-through).
Tabel kolom: Aspek/Fase Gerak | Skor 4 | Skor 3 | Skor 2 | Skor 1 (isi deskriptor konkret tiap skor).
## B. Penilaian Teori (Kognitif)
Pedoman penskoran + kunci jawaban (tabel Markdown).
## C. Penilaian Sikap (Afektif)
Tabel indikator: Sportifitas, Kerja Sama, Kejujuran, Disiplin Lapangan dengan deskriptor skor 1-4.
## D. Rumus Nilai Akhir
Tuliskan cara menghitung Nilai Akhir dari ketiga aspek.
"""


def kktp_prompt(jenjang, fase, cp):
    return f"""Buatkan PEMETAAN LINGKUP MATERI & KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) PJOK.

Parameter:
- Jenjang: {jenjang or '(kosong)'}
- Fase/Kelas: {fase or '(kosong)'}
- Capaian Pembelajaran (CP) / Elemen: {cp or '(kosong)'}

Susun dengan struktur berikut:
## A. Pemetaan Lingkup Materi Semester 1
Tabel Markdown: No | Elemen | Lingkup Materi | Alokasi (JP).
## B. Pemetaan Lingkup Materi Semester 2
Tabel Markdown dengan kolom sama.
## C. Deskriptor KKTP
Tabel Markdown: Tujuan Pembelajaran | Kriteria Ketercapaian | Interval/Deskriptor (Belum/Cukup/Baik/Sangat Baik).
"""

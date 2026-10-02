const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
export const API = `${BASE}/api`;

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body: any) => request<T>(p, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(p: string, body: any) => request<T>(p, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

export function exportUrl(archiveId: string, format: "pdf" | "docx" | "xlsx") {
  return `${API}/archives/${archiveId}/export?format=${format}`;
}

export function logoUrl(version?: string | number) {
  return `${API}/profile/logo${version ? `?v=${version}` : ""}`;
}

export type Journal = {
  id: string;
  tanggal: string;
  nama_kelas: string;
  materi: string;
  kegiatan: string;
  catatan: string;
  created_at: string;
};

export type RecapStudent = {
  nama: string;
  no_absen: string;
  counts: Record<string, number>;
  hadir: number;
  total: number;
  hadir_pct: number;
};

export type Recap = {
  total_sessions: number;
  class_name: string;
  students: RecapStudent[];
};

// ---- Types ----
export type Profile = {
  nama_guru: string;
  nip_guru: string;
  nama_sekolah: string;
  npsn: string;
  dinas: string;
  alamat_sekolah: string;
  tahun_ajaran: string;
  has_logo?: boolean;
};

export type ArchiveMeta = {
  show_kop?: boolean;
  show_identitas_siswa?: boolean;
  dinas?: string;
  nama_sekolah?: string;
  alamat_sekolah?: string;
  npsn?: string;
  nama_guru?: string;
  tahun_ajaran?: string;
  kelas_fase?: string;
  materi?: string;
  semester?: string;
};

export type Archive = {
  id: string;
  type: string;
  title: string;
  markdown: string;
  meta: ArchiveMeta;
  created_at: string;
};

export type Student = { nama: string; no_absen?: string };

export type ClassDoc = {
  id: string;
  nama_kelas: string;
  jenjang: string;
  fase: string;
  tahun_ajaran: string;
  students: Student[];
  created_at: string;
};

export type AttendanceRecord = {
  nama: string;
  no_absen?: string;
  status?: string | null;
  note?: string;
};

export type AttendanceSession = {
  id: string;
  class_id: string;
  class_name: string;
  tanggal: string;
  materi: string;
  records: AttendanceRecord[];
  warnings: string[];
  summary: Record<string, number>;
  created_at: string;
};

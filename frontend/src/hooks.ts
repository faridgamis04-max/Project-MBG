import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Archive, AttendanceSession, ClassDoc, Profile } from "./api";

// ---- Profile ----
export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => api.get<Profile>("/profile") });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Profile) => api.put<Profile>("/profile", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ---- Generation ----
export function useGenerate(kind: "modul-ajar" | "soal" | "rubrik" | "kktp") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<Archive>(`/generate/${kind}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["archives"] }),
  });
}

// ---- Archives ----
export function useArchives(type?: string) {
  return useQuery({
    queryKey: ["archives", type ?? "all"],
    queryFn: () => api.get<Archive[]>(`/archives${type ? `?type=${type}` : ""}`),
  });
}

export function useArchive(id: string) {
  return useQuery({
    queryKey: ["archive", id],
    queryFn: () => api.get<Archive>(`/archives/${id}`),
    enabled: !!id,
  });
}

export function useCreateArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: string; title: string; markdown: string; meta?: any }) =>
      api.post<Archive>("/archives", { meta: {}, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["archives"] }),
  });
}

export function useDeleteArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/archives/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["archives"] }),
  });
}

// ---- Classes ----
export function useClasses() {
  return useQuery({ queryKey: ["classes"], queryFn: () => api.get<ClassDoc[]>("/classes") });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: ["class", id],
    queryFn: () => api.get<ClassDoc>(`/classes/${id}`),
    enabled: !!id,
  });
}

export function useSaveClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: any }) =>
      id ? api.put<ClassDoc>(`/classes/${id}`, body) : api.post<ClassDoc>("/classes", body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      if (v.id) qc.invalidateQueries({ queryKey: ["class", v.id] });
    },
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

// ---- Attendance ----
export function useAttendance(classId: string) {
  return useQuery({
    queryKey: ["attendance", classId],
    queryFn: () => api.get<AttendanceSession[]>(`/classes/${classId}/attendance`),
    enabled: !!classId,
  });
}

export function useSaveAttendance(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<AttendanceSession>(`/classes/${classId}/attendance`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", classId] }),
  });
}

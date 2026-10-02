import { Text, View } from "react-native";
import { Image } from "expo-image";
import { makeStyles, spacing, fontSize } from "@/src/theme";
import { ArchiveMeta, logoUrl } from "@/src/api";

// Official school letterhead (Kop Surat) rendered from archive meta.
export function KopSurat({ meta }: { meta: ArchiveMeta }) {
  const s = useStyles();
  if (!meta?.show_kop) return null;
  const row = (a: string, b: string, c: string, d: string) => (
    <View style={s.infoRow}>
      <Text style={s.infoCell}>
        <Text style={s.infoKey}>{a} : </Text>
        {b}
      </Text>
      <Text style={s.infoCell}>
        <Text style={s.infoKey}>{c} : </Text>
        {d}
      </Text>
    </View>
  );
  return (
    <View style={s.wrap} testID="kop-surat">
      {meta.logo && <Image source={{ uri: logoUrl() }} style={s.logo} contentFit="contain" testID="kop-logo" />}
      {!!meta.dinas && <Text style={s.dinas}>{meta.dinas}</Text>}
      {!!meta.nama_sekolah && <Text style={s.sekolah}>{meta.nama_sekolah}</Text>}
      {(!!meta.alamat_sekolah || !!meta.npsn) && (
        <Text style={s.alamat}>
          {meta.alamat_sekolah}
          {meta.npsn ? ` | NPSN: ${meta.npsn}` : ""}
        </Text>
      )}
      <View style={s.hr} />
      {row("Mata Pelajaran", "PJOK / Penjasorkes", "Kelas / Fase", meta.kelas_fase || "-")}
      {row("Materi", meta.materi || "-", "Semester", meta.semester || "-")}
      {row("Nama Guru", meta.nama_guru || "-", "Tahun Ajaran", meta.tahun_ajaran || "-")}
      <View style={s.hrDouble} />
      {meta.show_identitas_siswa && (
        <View style={s.identitas}>
          <Text style={s.identitasItem}>Nama : ______________</Text>
          <Text style={s.identitasItem}>No. Absen : ______</Text>
          <Text style={s.identitasItem}>Nilai : ______</Text>
          <Text style={s.identitasItem}>Paraf Guru : ______</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    borderWidth: 2,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  dinas: { fontSize: fontSize.base, fontWeight: "800", color: c.onSurface, textAlign: "center", textTransform: "uppercase" },
  logo: { width: 56, height: 56, alignSelf: "center", marginBottom: spacing.xs },
  sekolah: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, textAlign: "center", textTransform: "uppercase" },
  alamat: { fontSize: fontSize.sm, color: c.onSurfaceSecondary, textAlign: "center", marginTop: 2 },
  hr: { height: 2, backgroundColor: c.borderStrong, marginVertical: spacing.sm },
  hrDouble: { height: 3, backgroundColor: c.borderStrong, marginTop: spacing.sm },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2, gap: spacing.sm },
  infoCell: { flex: 1, fontSize: fontSize.sm, color: c.onSurface },
  infoKey: { fontWeight: "800" },
  identitas: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingTop: spacing.sm },
  identitasItem: { fontSize: fontSize.sm, color: c.onSurface, fontWeight: "600" },
}));

import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Button, ChipSelect, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useClass, useSaveClass } from "@/src/hooks";
import { makeStyles, spacing, useTheme } from "@/src/theme";

const JENJANG = ["SD/MI", "SMP/MTs", "SMA/SMK/MA"];
const FASE = ["A", "B", "C", "D", "E", "F"];

function parseStudents(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length >= 2) return { no_absen: parts[0], nama: parts.slice(1).join(" ") };
      return { no_absen: String(i + 1), nama: line };
    });
}

export default function EditClass() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: cls, isLoading } = useClass(id);
  const save = useSaveClass();

  const [nama, setNama] = useState("");
  const [jenjang, setJenjang] = useState("SMP/MTs");
  const [fase, setFase] = useState("D");
  const [tahun, setTahun] = useState("");
  const [siswa, setSiswa] = useState("");

  useEffect(() => {
    if (cls) {
      setNama(cls.nama_kelas);
      setJenjang(cls.jenjang || "SMP/MTs");
      setFase(cls.fase || "D");
      setTahun(cls.tahun_ajaran || "");
      setSiswa((cls.students || []).map((st) => `${st.no_absen || ""}${st.no_absen ? ", " : ""}${st.nama}`).join("\n"));
    }
  }, [cls]);

  const onSave = () => {
    if (!nama.trim()) {
      toast.show("Nama kelas wajib diisi", "error");
      return;
    }
    save.mutate(
      { id, body: { nama_kelas: nama, jenjang, fase, tahun_ajaran: tahun, students: parseStudents(siswa) } },
      {
        onSuccess: () => {
          toast.show("Kelas diperbarui", "success");
          router.back();
        },
        onError: (e: any) => toast.show(e?.message || "Gagal menyimpan", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Edit Kelas" subtitle={cls?.nama_kelas} />
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.onSurface} />
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
          <Field label="Nama Kelas" placeholder="mis. VIII-A" value={nama} onChangeText={setNama} testID="input-nama-kelas" />
          <ChipSelect label="Jenjang" options={JENJANG} value={jenjang} onChange={setJenjang} />
          <ChipSelect label="Fase" options={FASE} value={fase} onChange={setFase} />
          <Field label="Tahun Ajaran" placeholder="mis. 2025/2026" value={tahun} onChangeText={setTahun} testID="input-tahun" />
          <Field
            label="Daftar Siswa (satu per baris: No, Nama)"
            placeholder={"1, Budi Santoso\n2, Siti Aminah"}
            value={siswa}
            onChangeText={setSiswa}
            multiline
            style={{ minHeight: 200 }}
            testID="input-siswa"
          />
        </KeyboardAwareScrollView>
      )}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Simpan Perubahan" icon="content-save-outline" onPress={onSave} loading={save.isPending} testID="btn-save-class" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Button, Card, ChipSelect, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useClasses, useSaveClass } from "@/src/hooks";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, spacing, fontSize, useTheme } from "@/src/theme";

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

export default function Kelas() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: classes, isLoading } = useClasses();
  const save = useSaveClass();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [jenjang, setJenjang] = useState("SMP/MTs");
  const [fase, setFase] = useState("D");
  const [tahun, setTahun] = useState("");
  const [siswa, setSiswa] = useState("");

  const create = () => {
    if (!nama.trim()) {
      toast.show("Nama kelas wajib diisi", "error");
      return;
    }
    save.mutate(
      { body: { nama_kelas: nama, jenjang, fase, tahun_ajaran: tahun, students: parseStudents(siswa) } },
      {
        onSuccess: () => {
          toast.show("Kelas ditambahkan", "success");
          setOpen(false);
          setNama("");
          setTahun("");
          setSiswa("");
        },
        onError: (e: any) => toast.show(e?.message || "Gagal menambah kelas", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header title="Kelas / Rombel" rightIcon="plus-box" onRightPress={() => setOpen(true)} rightTestID="btn-add-class" />
      <FlatList
        data={classes || []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[s.list, { paddingBottom: bottomChrome + spacing.xl }]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Icon name="account-group-outline" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>Belum Ada Kelas</Text>
              <Text style={s.emptyDesc}>Tambahkan rombel untuk mulai presensi lapangan.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card testID={`class-${item.id}`} onPress={() => router.push(`/class/${item.id}`)} style={s.cardRow}>
            <View style={s.cardLeft}>
              <Text style={s.cardTitle}>{item.nama_kelas}</Text>
              <Text style={s.cardMeta}>
                {[item.jenjang, item.fase ? `Fase ${item.fase}` : "", `${item.students?.length || 0} siswa`].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Icon name="chevron-right" size={26} color={colors.onSurface} />
          </Card>
        )}
      />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalSheet, { paddingTop: insets.top + spacing.md }]}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
              <View style={s.modalHead}>
              <Text style={s.modalTitle}>Kelas Baru</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="btn-close-modal">
                <Icon name="close" size={26} color={colors.onSurface} />
              </Pressable>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={s.modalBody} bottomOffset={20} showsVerticalScrollIndicator={false}>
              <Field label="Nama Kelas" placeholder="mis. VIII-A" value={nama} onChangeText={setNama} testID="input-nama-kelas" />
              <ChipSelect label="Jenjang" options={JENJANG} value={jenjang} onChange={setJenjang} />
              <ChipSelect label="Fase" options={FASE} value={fase} onChange={setFase} />
              <Field label="Tahun Ajaran" placeholder="mis. 2025/2026" value={tahun} onChangeText={setTahun} testID="input-tahun" />
              <Field
                label="Daftar Siswa (satu per baris)"
                placeholder={"Budi Santoso\nSiti Aminah\n..."}
                value={siswa}
                onChangeText={setSiswa}
                multiline
                style={{ minHeight: 160 }}
                testID="input-siswa"
              />
            </KeyboardAwareScrollView>
            <View style={[s.modalFooter, { paddingBottom: insets.bottom + spacing.md }]}>
              <Button title="Simpan Kelas" icon="content-save-outline" onPress={create} loading={save.isPending} testID="btn-save-class" />
            </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  list: { padding: spacing.md, gap: spacing.md },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  cardMeta: { fontSize: fontSize.sm, color: c.muted, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: spacing["3xl"], gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  emptyDesc: { fontSize: fontSize.base, color: c.muted, textAlign: "center", paddingHorizontal: spacing.xl },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { flex: 1, marginTop: spacing["3xl"], backgroundColor: c.surface, borderTopWidth: 3, borderColor: c.borderStrong },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 2, borderColor: c.border },
  modalTitle: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  modalBody: { padding: spacing.lg },
  modalFooter: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Button, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useClass, useSaveAttendance } from "@/src/hooks";
import { AttendanceSession } from "@/src/api";
import { makeStyles, spacing, fontSize, fonts, useTheme } from "@/src/theme";

const CODES = ["H", "S", "I", "A", "K3"];

export default function Attendance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: cls, isLoading } = useClass(id);
  const saveMut = useSaveAttendance(id);

  const [tanggal, setTanggal] = useState(dayjs().format("YYYY-MM-DD"));
  const [materi, setMateri] = useState("");
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AttendanceSession | null>(null);

  const students = useMemo(() => cls?.students || [], [cls]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { H: 0, S: 0, I: 0, A: 0, K3: 0 };
    students.forEach((_, i) => {
      const st = statuses[i] || "H";
      c[st] = (c[st] || 0) + 1;
    });
    return c;
  }, [statuses, students]);

  const markAll = () => {
    const all: Record<number, string> = {};
    students.forEach((_, i) => (all[i] = "H"));
    setStatuses(all);
  };

  const save = () => {
    if (students.length === 0) {
      toast.show("Kelas belum memiliki siswa", "error");
      return;
    }
    const records = students.map((st, i) => ({
      nama: st.nama,
      no_absen: st.no_absen || String(i + 1),
      status: statuses[i] || null,
      note: "",
    }));
    saveMut.mutate(
      { tanggal, materi, records },
      {
        onSuccess: (data) => {
          if (data.warnings?.length > 0) {
            setResult(data);
          } else {
            toast.show("Presensi tersimpan", "success");
            router.back();
          }
        },
        onError: (e: any) => toast.show(e?.message || "Gagal menyimpan presensi", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Presensi Lapangan" subtitle={cls?.nama_kelas} />
      {isLoading || !cls ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.onSurface} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 150 }]}
          ListHeaderComponent={
            <View style={s.form}>
              <View style={s.rowPair}>
                <View style={s.half}>
                  <Field label="Tanggal" value={tanggal} onChangeText={setTanggal} testID="input-tanggal" />
                </View>
                <View style={s.half}>
                  <Field label="Materi" placeholder="opsional" value={materi} onChangeText={setMateri} testID="input-materi-presensi" />
                </View>
              </View>
              <Pressable onPress={markAll} style={s.markAll} testID="btn-mark-all">
                <Icon name="check-all" size={18} color={colors.onSurface} />
                <Text style={s.markAllText}>Tandai Semua Hadir</Text>
              </Pressable>
              <Text style={s.legend}>H=Hadir · S=Sakit · I=Izin · A=Alpa · K3=Catatan Kesehatan</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const cur = statuses[index];
            return (
              <View style={s.studentCard} testID={`student-${index}`}>
                <View style={s.studentTop}>
                  <Text style={s.studentNo}>{item.no_absen || index + 1}</Text>
                  <Text style={s.studentName} numberOfLines={1}>
                    {item.nama}
                  </Text>
                </View>
                <View style={s.toggleRow}>
                  {CODES.map((code) => {
                    const active = cur === code;
                    return (
                      <Pressable
                        key={code}
                        onPress={() => setStatuses((p) => ({ ...p, [index]: code }))}
                        style={[s.toggle, { backgroundColor: active ? colors.brandPrimary : colors.surface }]}
                        testID={`status-${index}-${code}`}
                      >
                        <Text style={[s.toggleText, { color: active ? colors.onBrandPrimary : colors.onSurface }]}>{code}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.countsRow}>
          {CODES.map((code) => (
            <View key={code} style={s.countChip}>
              <Text style={s.countCode}>{code}</Text>
              <Text style={s.countVal}>{counts[code] || 0}</Text>
            </View>
          ))}
        </ScrollView>
        <Button title="Simpan Presensi" icon="content-save-outline" onPress={save} loading={saveMut.isPending} testID="btn-save-attendance" />
      </View>

      {/* K3 / Sakit warnings */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => router.back()}>
        <View style={s.modalBackdrop}>
          <View style={s.warnSheet}>
            <View style={s.warnHead}>
              <Icon name="alert-outline" size={22} color={colors.onSurface} />
              <Text style={s.warnTitle}>Peringatan K3</Text>
            </View>
            <ScrollView style={s.warnBody}>
              {result?.warnings.map((w, i) => (
                <View key={i} style={s.warnItem}>
                  <Text style={s.warnText}>• {w}</Text>
                </View>
              ))}
            </ScrollView>
            <Button
              title="Mengerti"
              icon="check-bold"
              onPress={() => {
                setResult(null);
                router.back();
              }}
              testID="btn-ack-warning"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md },
  form: { marginBottom: spacing.md },
  rowPair: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  markAll: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 2, borderColor: c.borderStrong, padding: spacing.md, justifyContent: "center" },
  markAllText: { fontSize: fontSize.base, fontWeight: "800", color: c.onSurface, textTransform: "uppercase" },
  legend: { fontSize: fontSize.sm, color: c.muted, marginTop: spacing.sm, fontFamily: fonts.mono },
  studentCard: { borderWidth: 2, borderColor: c.border, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  studentTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  studentNo: { fontSize: fontSize.base, fontWeight: "900", color: c.muted, fontFamily: fonts.mono, minWidth: 28 },
  studentName: { flex: 1, fontSize: fontSize.lg, fontWeight: "700", color: c.onSurface },
  toggleRow: { flexDirection: "row", gap: spacing.xs },
  toggle: { flex: 1, minHeight: 44, borderWidth: 2, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  toggleText: { fontSize: fontSize.base, fontWeight: "900", fontFamily: fonts.mono },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, backgroundColor: c.surface, padding: spacing.md, gap: spacing.md },
  countsRow: { gap: spacing.sm },
  countChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 2, borderColor: c.border, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  countCode: { fontSize: fontSize.sm, fontWeight: "900", color: c.onSurface, fontFamily: fonts.mono },
  countVal: { fontSize: fontSize.sm, color: c.onSurfaceSecondary, fontFamily: fonts.mono },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  warnSheet: { backgroundColor: c.surface, borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.xl, gap: spacing.md, maxHeight: "70%" },
  warnHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  warnTitle: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  warnBody: { maxHeight: 280 },
  warnItem: { borderBottomWidth: 1, borderColor: c.border, paddingVertical: spacing.sm },
  warnText: { fontSize: fontSize.base, color: c.onSurface, lineHeight: 20 },
}));

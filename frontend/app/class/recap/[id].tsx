import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/toast";
import { useRecap } from "@/src/hooks";
import { downloadRecap } from "@/src/download";
import { makeStyles, spacing, fontSize, fonts, useTheme } from "@/src/theme";

const CODES = ["H", "S", "I", "A", "K3"];

export default function Recap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, isLoading } = useRecap(id);

  const onExport = async () => {
    if (!data || data.total_sessions === 0) {
      toast.show("Belum ada data untuk diekspor", "error");
      return;
    }
    try {
      await downloadRecap(id, data.class_name);
    } catch (e: any) {
      toast.show(e?.message || "Gagal mengekspor rekap", "error");
    }
  };

  return (
    <View style={s.screen}>
      <Header
        back
        title="Rekap Kehadiran"
        subtitle={data?.class_name}
        rightIcon="file-excel-outline"
        onRightPress={onExport}
        rightTestID="btn-export-recap"
      />
      {isLoading || !data ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.onSurface} />
        </View>
      ) : data.total_sessions === 0 ? (
        <View style={s.center}>
          <Icon name="chart-bar" size={48} color={colors.muted} />
          <Text style={s.emptyTitle}>Belum Ada Data</Text>
          <Text style={s.emptyDesc}>Lakukan presensi terlebih dahulu untuk melihat rekap.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
          <Text style={s.summary}>Total {data.total_sessions} sesi presensi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar>
            <View>
              {/* Header row */}
              <View style={[s.row, s.headRow]}>
                <Text style={[s.cell, s.cName, s.headText]}>NAMA</Text>
                {CODES.map((c) => (
                  <Text key={c} style={[s.cell, s.cCode, s.headText]}>
                    {c}
                  </Text>
                ))}
                <Text style={[s.cell, s.cPct, s.headText]}>%HADIR</Text>
              </View>
              {data.students.map((st, i) => (
                <View key={i} style={s.row} testID={`recap-row-${i}`}>
                  <View style={[s.cell, s.cName]}>
                    <Text style={s.nameText} numberOfLines={1}>
                      {st.no_absen ? `${st.no_absen}. ` : ""}
                      {st.nama}
                    </Text>
                  </View>
                  {CODES.map((c) => (
                    <Text key={c} style={[s.cell, s.cCode, s.mono]}>
                      {st.counts[c] || 0}
                    </Text>
                  ))}
                  <View style={[s.cell, s.cPct]}>
                    <Text style={[s.pct, { color: st.hadir_pct >= 75 ? colors.onSurface : colors.error }]}>{st.hadir_pct}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          <Text style={s.legend}>H=Hadir · S=Sakit · I=Izin · A=Alpa · K3=Catatan Kesehatan</Text>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  emptyDesc: { fontSize: fontSize.base, color: c.muted, textAlign: "center" },
  content: { padding: spacing.md },
  summary: { fontSize: fontSize.base, fontWeight: "800", color: c.onSurface, marginBottom: spacing.md, fontFamily: fonts.mono },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: c.border },
  headRow: { backgroundColor: c.surfaceTertiary, borderBottomWidth: 2, borderColor: c.borderStrong },
  cell: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, justifyContent: "center" },
  headText: { fontSize: fontSize.sm, fontWeight: "900", color: c.onSurface, textAlign: "center" },
  cName: { width: 150 },
  cCode: { width: 44, textAlign: "center" },
  cPct: { width: 72, alignItems: "center" },
  nameText: { fontSize: fontSize.base, color: c.onSurface, fontWeight: "600" },
  mono: { fontFamily: fonts.mono, fontSize: fontSize.base, color: c.onSurface, textAlign: "center" },
  pct: { fontSize: fontSize.base, fontWeight: "900", fontFamily: fonts.mono },
  legend: { fontSize: fontSize.sm, color: c.muted, marginTop: spacing.lg, fontFamily: fonts.mono },
}));

import { useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Button, Card, ConfirmModal } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useAttendance, useClass, useDeleteClass } from "@/src/hooks";
import { makeStyles, spacing, fontSize, fonts, useTheme } from "@/src/theme";

const CODES = ["H", "S", "I", "A", "K3"];

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: cls, isLoading } = useClass(id);
  const { data: sessions } = useAttendance(id);
  const delClass = useDeleteClass();
  const [confirm, setConfirm] = useState(false);

  const onDelete = () => {
    delClass.mutate(id, {
      onSuccess: () => {
        toast.show("Kelas dihapus", "success");
        router.back();
      },
    });
  };

  return (
    <View style={s.screen}>
      <Header
        back
        title={cls?.nama_kelas || "Kelas"}
        rightIcon="trash-can-outline"
        onRightPress={() => setConfirm(true)}
        rightTestID="btn-delete-class"
      />
      {isLoading || !cls ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.onSurface} />
        </View>
      ) : (
        <FlatList
          data={sessions || []}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 90 }]}
          ListHeaderComponent={
            <View style={s.headerBlock}>
              <Card style={s.infoCard}>
                <Text style={s.infoTitle}>{cls.nama_kelas}</Text>
                <Text style={s.infoMeta}>
                  {[cls.jenjang, cls.fase ? `Fase ${cls.fase}` : "", cls.tahun_ajaran].filter(Boolean).join(" · ")}
                </Text>
                <View style={s.statRow}>
                  <View style={s.stat}>
                    <Text style={s.statNum}>{cls.students?.length || 0}</Text>
                    <Text style={s.statLabel}>Siswa</Text>
                  </View>
                  <View style={s.stat}>
                    <Text style={s.statNum}>{sessions?.length || 0}</Text>
                    <Text style={s.statLabel}>Sesi Presensi</Text>
                  </View>
                </View>
              </Card>
              <Text style={s.sectionTitle}>Riwayat Presensi</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={s.emptyText}>Belum ada presensi. Tekan tombol di bawah untuk memulai.</Text>
          }
          renderItem={({ item }) => (
            <Card style={s.sessionCard}>
              <View style={s.sessionTop}>
                <Text style={s.sessionDate}>{dayjs(item.tanggal).format("DD MMM YYYY")}</Text>
                {item.warnings?.length > 0 && (
                  <View style={s.warnBadge}>
                    <Icon name="alert-outline" size={14} color={colors.onSurfaceInverse} />
                    <Text style={s.warnBadgeText}>{item.warnings.length} K3/Sakit</Text>
                  </View>
                )}
              </View>
              {!!item.materi && <Text style={s.sessionMateri}>{item.materi}</Text>}
              <View style={s.summaryRow}>
                {CODES.map((code) => (
                  <View key={code} style={s.summaryChip}>
                    <Text style={s.summaryCode}>{code}</Text>
                    <Text style={s.summaryVal}>{item.summary?.[code] || 0}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        />
      )}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Presensi Baru" icon="account-check-outline" onPress={() => router.push(`/attendance/${id}`)} testID="btn-new-attendance" />
      </View>
      <ConfirmModal
        visible={confirm}
        title="Hapus Kelas?"
        message="Kelas dan riwayat presensinya akan dihapus."
        onConfirm={() => {
          setConfirm(false);
          onDelete();
        }}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md, gap: spacing.md },
  headerBlock: { gap: spacing.md, marginBottom: spacing.sm },
  infoCard: { gap: spacing.xs },
  infoTitle: { fontSize: fontSize["2xl"], fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  infoMeta: { fontSize: fontSize.base, color: c.muted },
  statRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  stat: { flex: 1, borderWidth: 2, borderColor: c.border, padding: spacing.md, alignItems: "center" },
  statNum: { fontSize: fontSize["2xl"], fontWeight: "900", color: c.onSurface, fontFamily: fonts.mono },
  statLabel: { fontSize: fontSize.sm, color: c.muted, textTransform: "uppercase" },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: "800", color: c.muted, textTransform: "uppercase", letterSpacing: 1 },
  emptyText: { fontSize: fontSize.base, color: c.muted, textAlign: "center", paddingVertical: spacing.xl },
  sessionCard: { gap: spacing.sm },
  sessionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionDate: { fontSize: fontSize.lg, fontWeight: "800", color: c.onSurface, fontFamily: fonts.mono },
  warnBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  warnBadgeText: { fontSize: fontSize.sm, fontWeight: "800", color: c.onSurfaceInverse },
  sessionMateri: { fontSize: fontSize.base, color: c.onSurfaceSecondary },
  summaryRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  summaryChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 2, borderColor: c.border, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  summaryCode: { fontSize: fontSize.sm, fontWeight: "900", color: c.onSurface, fontFamily: fonts.mono },
  summaryVal: { fontSize: fontSize.sm, color: c.onSurfaceSecondary, fontFamily: fonts.mono },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

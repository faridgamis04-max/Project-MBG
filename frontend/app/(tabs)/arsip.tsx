import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Card, Chip, ConfirmModal } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useArchives, useDeleteArchive } from "@/src/hooks";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, spacing, fontSize, fonts, useTheme } from "@/src/theme";

const FILTERS: { label: string; type?: string }[] = [
  { label: "Semua", type: undefined },
  { label: "Modul Ajar", type: "modul_ajar" },
  { label: "Soal", type: "soal" },
  { label: "Rubrik", type: "rubrik" },
  { label: "KKTP", type: "kktp" },
  { label: "Katrol", type: "katrol" },
];

const TYPE_ICON: Record<string, string> = {
  modul_ajar: "file-document-edit-outline",
  soal: "clipboard-text-outline",
  rubrik: "star-check-outline",
  kktp: "map-marker-path",
  katrol: "calculator-variant-outline",
};

export default function Arsip() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [filter, setFilter] = useState(0);
  const { data: archives, isLoading } = useArchives(FILTERS[filter].type);
  const del = useDeleteArchive();
  const [toDelete, setToDelete] = useState<string | null>(null);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete, { onSuccess: () => toast.show("Dokumen dihapus", "success") });
    setToDelete(null);
  };

  return (
    <View style={s.screen}>
      <Header title="Arsip Dokumen" subtitle="Hasil generate tersimpan" />
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map((f, i) => (
            <Chip key={f.label} label={f.label} selected={filter === i} onPress={() => setFilter(i)} testID={`filter-${f.label}`} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={archives || []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[s.list, { paddingBottom: bottomChrome + spacing.xl }]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Icon name="folder-open-outline" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>Arsip Kosong</Text>
              <Text style={s.emptyDesc}>Dokumen hasil generate akan muncul di sini.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card testID={`archive-${item.id}`} onPress={() => router.push(`/viewer/${item.id}`)} style={s.row}>
            <Icon name={(TYPE_ICON[item.type] || "file-outline") as any} size={24} color={colors.onSurface} />
            <View style={s.rowBody}>
              <Text style={s.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={s.rowDate}>{dayjs(item.created_at).format("DD MMM YYYY · HH:mm")}</Text>
            </View>
            <Pressable onPress={() => setToDelete(item.id)} hitSlop={10} style={s.delBtn} testID={`delete-${item.id}`}>
              <Icon name="trash-can-outline" size={20} color={colors.onSurface} />
            </Pressable>
          </Card>
        )}
      />
      <ConfirmModal
        visible={!!toDelete}
        title="Hapus Dokumen?"
        message="Dokumen akan dihapus dari arsip."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  filterWrap: { height: 56, borderBottomWidth: 2, borderColor: c.border },
  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  list: { padding: spacing.md, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.base, fontWeight: "800", color: c.onSurface },
  rowDate: { fontSize: fontSize.sm, color: c.muted, marginTop: 2, fontFamily: fonts.mono },
  delBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: spacing["3xl"], gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  emptyDesc: { fontSize: fontSize.base, color: c.muted, textAlign: "center", paddingHorizontal: spacing.xl },
}));

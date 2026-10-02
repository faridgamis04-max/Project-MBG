import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { KopSurat } from "@/src/components/KopSurat";
import { MarkdownView } from "@/src/components/Markdown";
import { Button, ConfirmModal } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useArchive, useDeleteArchive } from "@/src/hooks";
import { downloadAndShare } from "@/src/download";
import { makeStyles, spacing, fontSize, useTheme } from "@/src/theme";

export default function Viewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, isLoading } = useArchive(id);
  const del = useDeleteArchive();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const doExport = async (fmt: "docx" | "pdf" | "xlsx") => {
    if (!data) return;
    setBusy(fmt);
    try {
      await downloadAndShare(data.id, data.title, fmt);
    } catch (e: any) {
      toast.show(e?.message || "Gagal mengekspor", "error");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = () => {
    if (!data) return;
    del.mutate(data.id, {
      onSuccess: () => {
        toast.show("Dokumen dihapus", "success");
        router.back();
      },
    });
  };

  return (
    <View style={s.screen}>
      <Header
        back
        title={data?.title || "Dokumen"}
        rightIcon="trash-can-outline"
        onRightPress={() => setConfirm(true)}
        rightTestID="btn-delete-doc"
      />
      {isLoading || !data ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.onSurface} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} testID="doc-content">
          <KopSurat meta={data.meta} />
          <MarkdownView content={data.markdown} />
        </ScrollView>
      )}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Text style={s.footerLabel}>EKSPOR</Text>
        <View style={s.footerRow}>
          <Button title="Word" icon="file-word-box" variant="secondary" onPress={() => doExport("docx")} loading={busy === "docx"} style={s.exp} testID="export-word" />
          <Button title="PDF" icon="file-pdf-box" onPress={() => doExport("pdf")} loading={busy === "pdf"} style={s.exp} testID="export-pdf" />
          <Button title="Excel" icon="file-excel-box" variant="secondary" onPress={() => doExport("xlsx")} loading={busy === "xlsx"} style={s.exp} testID="export-excel" />
        </View>
      </View>
      <ConfirmModal
        visible={confirm}
        title="Hapus Dokumen?"
        message="Dokumen ini akan dihapus dari arsip Anda."
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
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, backgroundColor: c.surface, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  footerLabel: { fontSize: fontSize.sm, fontWeight: "800", color: c.muted, letterSpacing: 1, marginBottom: spacing.xs },
  footerRow: { flexDirection: "row", gap: spacing.sm },
  exp: { flex: 1, paddingHorizontal: spacing.xs },
}));

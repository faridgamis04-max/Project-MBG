import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Button, Card, ConfirmModal, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useDeleteJournal, useJournals, useSaveJournal } from "@/src/hooks";
import { Journal } from "@/src/api";
import { makeStyles, spacing, fontSize, fonts, useTheme } from "@/src/theme";

export default function JurnalScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: journals, isLoading } = useJournals();
  const saveMut = useSaveJournal();
  const delMut = useDeleteJournal();
  const params = useLocalSearchParams<{
    auto?: string;
    tanggal?: string;
    nama_kelas?: string;
    materi?: string;
    kegiatan?: string;
  }>();
  const prefilled = useRef(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Journal | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const [tanggal, setTanggal] = useState("");
  const [kelas, setKelas] = useState("");
  const [materi, setMateri] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [catatan, setCatatan] = useState("");

  // Auto-open a prefilled new-journal modal when coming from an attendance session.
  useEffect(() => {
    if (params.auto === "1" && !prefilled.current) {
      prefilled.current = true;
      setEditing(null);
      setTanggal(params.tanggal || dayjs().format("YYYY-MM-DD"));
      setKelas(params.nama_kelas || "");
      setMateri(params.materi || "");
      setKegiatan(params.kegiatan || "");
      setCatatan("");
      setOpen(true);
    }
  }, [params.auto, params.tanggal, params.nama_kelas, params.materi, params.kegiatan]);

  const openNew = () => {
    setEditing(null);
    setTanggal(dayjs().format("YYYY-MM-DD"));
    setKelas("");
    setMateri("");
    setKegiatan("");
    setCatatan("");
    setOpen(true);
  };

  const openEdit = (j: Journal) => {
    setEditing(j);
    setTanggal(j.tanggal);
    setKelas(j.nama_kelas);
    setMateri(j.materi);
    setKegiatan(j.kegiatan);
    setCatatan(j.catatan);
    setOpen(true);
  };

  const save = () => {
    if (!tanggal.trim()) {
      toast.show("Tanggal wajib diisi", "error");
      return;
    }
    saveMut.mutate(
      { id: editing?.id, body: { tanggal, nama_kelas: kelas, materi, kegiatan, catatan } },
      {
        onSuccess: () => {
          toast.show(editing ? "Jurnal diperbarui" : "Jurnal ditambahkan", "success");
          setOpen(false);
        },
        onError: (e: any) => toast.show(e?.message || "Gagal menyimpan", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Jurnal Mengajar" rightIcon="plus-box" onRightPress={openNew} rightTestID="btn-add-journal" />
      <FlatList
        data={journals || []}
        keyExtractor={(j) => j.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Icon name="notebook-outline" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>Belum Ada Jurnal</Text>
              <Text style={s.emptyDesc}>Catat kegiatan mengajar harian Anda di sini.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card testID={`journal-${item.id}`} onPress={() => openEdit(item)} style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.cardDate}>{dayjs(item.tanggal).format("DD MMM YYYY")}</Text>
              {!!item.nama_kelas && <Text style={s.cardClass}>{item.nama_kelas}</Text>}
            </View>
            {!!item.materi && <Text style={s.cardMateri}>{item.materi}</Text>}
            {!!item.kegiatan && (
              <Text style={s.cardText} numberOfLines={3}>
                {item.kegiatan}
              </Text>
            )}
            <Pressable onPress={() => setToDelete(item.id)} hitSlop={10} style={s.delBtn} testID={`delete-journal-${item.id}`}>
              <Icon name="trash-can-outline" size={18} color={colors.onSurface} />
            </Pressable>
          </Card>
        )}
      />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalSheet, { paddingTop: insets.top + spacing.md }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{editing ? "Edit Jurnal" : "Jurnal Baru"}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="btn-close-journal">
                <Icon name="close" size={26} color={colors.onSurface} />
              </Pressable>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={s.modalBody} bottomOffset={20} showsVerticalScrollIndicator={false}>
              <Field label="Tanggal" placeholder="YYYY-MM-DD" value={tanggal} onChangeText={setTanggal} testID="input-j-tanggal" />
              <Field label="Kelas" placeholder="mis. VIII-A" value={kelas} onChangeText={setKelas} testID="input-j-kelas" />
              <Field label="Materi" placeholder="mis. Sepak Bola" value={materi} onChangeText={setMateri} testID="input-j-materi" />
              <Field label="Kegiatan" placeholder="Ringkasan kegiatan pembelajaran" value={kegiatan} onChangeText={setKegiatan} multiline testID="input-j-kegiatan" />
              <Field label="Catatan" placeholder="Kendala / tindak lanjut (opsional)" value={catatan} onChangeText={setCatatan} multiline testID="input-j-catatan" />
            </KeyboardAwareScrollView>
            <View style={[s.modalFooter, { paddingBottom: insets.bottom + spacing.md }]}>
              <Button title="Simpan Jurnal" icon="content-save-outline" onPress={save} loading={saveMut.isPending} testID="btn-save-journal" />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!toDelete}
        title="Hapus Jurnal?"
        message="Catatan jurnal ini akan dihapus."
        onConfirm={() => {
          if (toDelete) delMut.mutate(toDelete, { onSuccess: () => toast.show("Jurnal dihapus", "success") });
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  list: { padding: spacing.md, gap: spacing.md },
  card: { gap: spacing.xs },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 28 },
  cardDate: { fontSize: fontSize.lg, fontWeight: "900", color: c.onSurface, fontFamily: fonts.mono },
  cardClass: { fontSize: fontSize.sm, fontWeight: "800", color: c.onSurfaceInverse, backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  cardMateri: { fontSize: fontSize.base, fontWeight: "800", color: c.onSurface },
  cardText: { fontSize: fontSize.base, color: c.onSurfaceSecondary, lineHeight: 20 },
  delBtn: { position: "absolute", top: spacing.lg, right: spacing.lg, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
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

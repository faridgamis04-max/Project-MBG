import { useEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Button, Field, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useProfile, useUpdateProfile } from "@/src/hooks";
import { Profile } from "@/src/api";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, spacing } from "@/src/theme";

const EMPTY: Profile = {
  nama_guru: "",
  nip_guru: "",
  nama_sekolah: "",
  npsn: "",
  dinas: "",
  alamat_sekolah: "",
  tahun_ajaran: "",
};

export default function ProfilTab() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data } = useProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState<Profile>(EMPTY);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  const set = (k: keyof Profile) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    update.mutate(form, {
      onSuccess: () => toast.show("Profil tersimpan", "success"),
      onError: (e: any) => toast.show(e?.message || "Gagal menyimpan", "error"),
    });
  };

  return (
    <View style={s.screen}>
      <Header title="Profil Guru" subtitle="Identitas untuk kop surat" />
      <KeyboardAwareScrollView contentContainerStyle={[s.content, { paddingBottom: bottomChrome + spacing.xl }]} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <SectionLabel>Data Guru</SectionLabel>
        <Field label="Nama Guru" placeholder="Nama lengkap & gelar" value={form.nama_guru} onChangeText={set("nama_guru")} testID="input-nama-guru" />
        <Field label="NIP" placeholder="Nomor Induk Pegawai" value={form.nip_guru} onChangeText={set("nip_guru")} testID="input-nip" />

        <SectionLabel>Data Sekolah</SectionLabel>
        <Field label="Dinas" placeholder="mis. Dinas Pendidikan Kota ..." value={form.dinas} onChangeText={set("dinas")} testID="input-dinas" />
        <Field label="Nama Sekolah" placeholder="mis. SMP Negeri 1 ..." value={form.nama_sekolah} onChangeText={set("nama_sekolah")} testID="input-sekolah" />
        <Field label="NPSN" placeholder="Nomor Pokok Sekolah Nasional" value={form.npsn} onChangeText={set("npsn")} keyboardType="number-pad" testID="input-npsn" />
        <Field label="Alamat Sekolah" placeholder="Alamat lengkap sekolah" value={form.alamat_sekolah} onChangeText={set("alamat_sekolah")} multiline testID="input-alamat" />
        <Field label="Tahun Ajaran" placeholder="mis. 2025/2026" value={form.tahun_ajaran} onChangeText={set("tahun_ajaran")} testID="input-tahun-ajaran" />
      </KeyboardAwareScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Simpan Profil" icon="content-save-outline" onPress={save} loading={update.isPending} testID="btn-save-profile" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

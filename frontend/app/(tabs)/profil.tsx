import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Button, Card, Field, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useProfile, useUpdateProfile } from "@/src/hooks";
import { Profile, logoUrl } from "@/src/api";
import { pickAndUploadLogo } from "@/src/uploadLogo";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, spacing, fontSize, useTheme } from "@/src/theme";

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
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, refetch } = useProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState<Profile>(EMPTY);
  const dirty = useRef(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoVer, setLogoVer] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  useEffect(() => {
    if (data && !dirty.current) {
      setForm({ ...EMPTY, ...data });
      setHasLogo(!!data.has_logo);
    }
  }, [data]);

  const set = (k: keyof Profile) => (v: string) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = () => {
    const { has_logo, ...payload } = form as any;
    update.mutate(payload, {
      onSuccess: () => {
        dirty.current = false;
        toast.show("Profil tersimpan", "success");
      },
      onError: (e: any) => toast.show(e?.message || "Gagal menyimpan", "error"),
    });
  };

  const onPickLogo = async () => {
    setUploading(true);
    const res = await pickAndUploadLogo();
    setUploading(false);
    if (res.ok) {
      setHasLogo(true);
      setLogoVer(Date.now());
      toast.show("Logo sekolah diunggah", "success");
      refetch();
    } else if (res.reason === "permission") {
      toast.show("Izin akses galeri ditolak", "error");
    } else if (res.reason === "error") {
      toast.show("Gagal mengunggah logo", "error");
    }
  };

  return (
    <View style={s.screen}>
      <Header title="Profil Guru" subtitle="Identitas untuk kop surat" />
      <KeyboardAwareScrollView contentContainerStyle={[s.content, { paddingBottom: bottomChrome + spacing.xl }]} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <Card onPress={() => router.push("/jurnal")} testID="btn-jurnal" style={s.navCard}>
          <Icon name="notebook-outline" size={24} color={colors.onSurface} />
          <View style={s.navCardBody}>
            <Text style={s.navCardTitle}>Jurnal Mengajar</Text>
            <Text style={s.navCardDesc}>Catatan harian kegiatan mengajar</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.onSurface} />
        </Card>

        <SectionLabel>Logo Sekolah</SectionLabel>
        <View style={s.logoRow}>
          <View style={s.logoBox}>
            {hasLogo ? (
              <Image source={{ uri: logoUrl(logoVer) }} style={s.logoImg} contentFit="contain" testID="logo-preview" />
            ) : (
              <Icon name="image-outline" size={32} color={colors.muted} />
            )}
          </View>
          <View style={s.logoActions}>
            <Button
              title={hasLogo ? "Ganti Logo" : "Unggah Logo"}
              icon="upload"
              variant="outline"
              onPress={onPickLogo}
              loading={uploading}
              testID="btn-upload-logo"
            />
            <Text style={s.logoHint}>Tampil di atas Kop Surat Modul Ajar & Soal.</Text>
          </View>
        </View>

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
  navCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  navCardBody: { flex: 1 },
  navCardTitle: { fontSize: fontSize.lg, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  navCardDesc: { fontSize: fontSize.sm, color: c.muted, marginTop: 2 },
  logoRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, alignItems: "center" },
  logoBox: { width: 80, height: 80, borderWidth: 2, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  logoImg: { width: "100%", height: "100%" },
  logoActions: { flex: 1, gap: spacing.sm },
  logoHint: { fontSize: fontSize.sm, color: c.muted },
}));

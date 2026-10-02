import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Card } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, spacing, fontSize, useTheme } from "@/src/theme";

const HERO_IMG =
  "https://images.unsplash.com/photo-1595909315417-2edd382a56dc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

type Mod = { key: string; title: string; desc: string; icon: string; route: string; num: string };

const MODULES: Mod[] = [
  { key: "soal", num: "02", title: "Bank Soal", desc: "Naskah soal + kunci & kisi-kisi", icon: "clipboard-text-outline", route: "/module/soal" },
  { key: "rubrik", num: "03", title: "Rubrik Nilai", desc: "Kriteria, kelompok & individu + KKM manual", icon: "star-check-outline", route: "/module/rubrik" },
  { key: "katrol", num: "04", title: "Katrol Nilai", desc: "Linear scaling + rata-rata kelas", icon: "calculator-variant-outline", route: "/module/katrol" },
  { key: "kktp", num: "05", title: "Lingkup & KKTP", desc: "Pemetaan materi & kriteria", icon: "map-marker-path", route: "/module/kktp" },
  { key: "presensi", num: "06", title: "Presensi", desc: "Absensi lapangan + K3", icon: "account-check-outline", route: "/kelas" },
  { key: "profil", num: "07", title: "Profil & Arsip", desc: "Identitas guru & dokumen", icon: "account-cog-outline", route: "/profil" },
];

export default function Beranda() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  return (
    <View style={s.screen}>
      <Header title="PJOK Super-App" subtitle="Asisten Guru Penjasorkes" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomChrome + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {/* Hero — Modul 1 */}
        <Card testID="module-modul-ajar" onPress={() => router.push("/module/modul-ajar")} style={s.hero}>
          <Image source={{ uri: HERO_IMG }} style={s.heroImg} contentFit="cover" />
          <View style={s.heroOverlay} />
          <View style={s.heroInner}>
            <Text style={s.heroNum}>01</Text>
            <View style={s.heroBody}>
              <Text style={s.heroTitle}>Generator Modul Ajar</Text>
              <Text style={s.heroDesc}>Modul Ajar Kurikulum Merdeka lengkap dengan kop surat, TP, K3, & asesmen.</Text>
              <View style={s.heroCta}>
                <Text style={s.heroCtaText}>BUAT SEKARANG</Text>
                <Icon name="arrow-right" size={18} color={colors.onBrandPrimary} />
              </View>
            </View>
          </View>
        </Card>

        <Text style={s.sectionTitle}>Semua Modul</Text>
        <View style={s.grid}>
          {MODULES.map((m) => (
            <Card key={m.key} testID={`module-${m.key}`} onPress={() => router.push(m.route as any)} style={s.cell}>
              <View style={s.cellTop}>
                <Icon name={m.icon as any} size={26} color={colors.onSurface} />
                <Text style={s.cellNum}>{m.num}</Text>
              </View>
              <Text style={s.cellTitle}>{m.title}</Text>
              <Text style={s.cellDesc}>{m.desc}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { padding: 0, overflow: "hidden", borderColor: c.borderStrong, minHeight: 210 },
  heroImg: { ...(StyleSheetAbsolute()) },
  heroOverlay: { ...(StyleSheetAbsolute()), backgroundColor: "rgba(0,0,0,0.55)" },
  heroInner: { flexDirection: "row", padding: spacing.lg, gap: spacing.md },
  heroNum: { fontSize: 44, fontWeight: "900", color: "#FFFFFF", opacity: 0.85, lineHeight: 46 },
  heroBody: { flex: 1 },
  heroTitle: { fontSize: fontSize["2xl"], fontWeight: "900", color: "#FFFFFF", textTransform: "uppercase", marginBottom: spacing.xs },
  heroDesc: { fontSize: fontSize.base, color: "#E5E5E5", lineHeight: 20, marginBottom: spacing.md },
  heroCta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", backgroundColor: c.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heroCtaText: { color: c.onBrandPrimary, fontWeight: "800", fontSize: fontSize.sm, letterSpacing: 0.5 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: "800", color: c.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell: { width: "47.8%", minHeight: 128, gap: spacing.xs },
  cellTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  cellNum: { fontSize: fontSize.base, fontWeight: "900", color: c.muted },
  cellTitle: { fontSize: fontSize.lg, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  cellDesc: { fontSize: fontSize.sm, color: c.onSurfaceSecondary, lineHeight: 17 },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}

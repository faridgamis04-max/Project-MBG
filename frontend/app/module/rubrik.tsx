import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Icon } from "@/src/components/Icon";
import { Button, Chip, Field, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useCreateArchive } from "@/src/hooks";
import { makeStyles, spacing, fontSize, fonts, useTheme } from "@/src/theme";

const uid = () => Math.random().toString(36).slice(2, 9);

type Criterion = { id: string; nama: string; bobot: number; desc: [string, string, string, string] };
type Group = { id: string; nama: string; membersRaw: string; skor: Record<string, number> };

const GENERIC_DESC: [string, string, string, string] = [
  "Belum menguasai",
  "Cukup menguasai",
  "Menguasai dengan baik",
  "Menguasai sempurna",
];

// Default universal (contoh Senam): 2 aspek bobot 2 + 5 aspek bobot 1 = total bobot 9 → skor maks 36.
const DEFAULT_CRITERIA: Criterion[] = [
  { id: "c1", nama: "Ketepatan Gerakan", bobot: 2, desc: ["Gerakan belum tepat", "Sebagian gerakan tepat", "Sebagian besar tepat", "Seluruh gerakan tepat"] },
  { id: "c2", nama: "Kesesuaian Irama", bobot: 2, desc: ["Tidak sesuai irama", "Sering keluar irama", "Sesuai, 1-2 selisih", "Selalu selaras irama"] },
  { id: "c3", nama: "Kelenturan", bobot: 1, desc: ["Kaku", "Kurang lentur", "Lentur", "Sangat lentur"] },
  { id: "c4", nama: "Kekuatan", bobot: 1, desc: ["Lemah", "Kurang kuat", "Kuat", "Sangat kuat & stabil"] },
  { id: "c5", nama: "Keseimbangan", bobot: 1, desc: ["Sering goyah/jatuh", "Kadang goyah", "Cukup stabil", "Sangat stabil"] },
  { id: "c6", nama: "Kelancaran Gerakan", bobot: 1, desc: ["Terputus-putus", "Sering berhenti", "Lancar, jeda kecil", "Mengalir tanpa henti"] },
  { id: "c7", nama: "Ekspresi & Penampilan", bobot: 1, desc: ["Tidak percaya diri", "Kurang percaya diri", "Percaya diri", "Sangat ekspresif"] },
];

const SKOR_LABEL = ["Kurang", "Cukup", "Baik", "Sangat Baik"];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function predikatOf(nilai: number): string {
  if (nilai >= 90) return "A · Sangat Baik";
  if (nilai >= 80) return "B · Baik";
  if (nilai >= 70) return "C · Cukup";
  return "D · Kurang";
}

function parseMembers(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function Rubrik() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createArchive = useCreateArchive();

  const [materi, setMateri] = useState("");
  const [kkm, setKkm] = useState("75");
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [groups, setGroups] = useState<Group[]>([]);
  const [individu, setIndividu] = useState<Record<string, string>>({});

  const kkmVal = parseFloat(kkm);
  const kkmValid = !isNaN(kkmVal);

  // Total Skor Maksimal = 4 x jumlah bobot (default 9 x 4 = 36).
  const maxTotal = useMemo(() => criteria.reduce((a, c) => a + c.bobot, 0) * 4, [criteria]);

  const statusOf = (nilai: number) => (kkmValid ? (nilai >= kkmVal ? "LULUS" : "REMEDIAL") : "-");

  // ---- Tabel 2: perhitungan nilai kelompok real-time ----
  const groupCalc = useMemo(() => {
    return groups.map((g) => {
      const totalBobot = criteria.reduce((a, c) => a + (g.skor[c.id] || 0) * c.bobot, 0);
      // Nilai Otomatis = (Total Skor Bobot / Skor Maks) x 100
      const nilai = maxTotal > 0 ? round1((totalBobot / maxTotal) * 100) : 0;
      return {
        ...g,
        members: parseMembers(g.membersRaw),
        totalBobot,
        nilai,
        predikat: predikatOf(nilai),
        status: kkmValid ? (nilai >= kkmVal ? "LULUS" : "REMEDIAL") : "-",
      };
    });
  }, [groups, criteria, maxTotal, kkmValid, kkmVal]);

  // ---- Tabel 3: rekap individu (menarik Nilai Kelompok dari Tabel 2) ----
  const indivRows = useMemo(() => {
    const rows: { key: string; no: number; nama: string; kelompok: string; nKel: number; nInd: number | null; nAkhir: number | null }[] = [];
    let no = 1;
    groupCalc.forEach((g) => {
      g.members.forEach((m, mi) => {
        const key = `${g.id}:${mi}`;
        const raw = individu[key];
        const nInd = raw !== undefined && raw !== "" && !isNaN(parseFloat(raw)) ? parseFloat(raw) : null;
        // Nilai Akhir = (70% x Nilai Kelompok) + (30% x Nilai Individu)
        const nAkhir = nInd === null ? null : round1(0.7 * g.nilai + 0.3 * nInd);
        rows.push({ key, no: no++, nama: m, kelompok: g.nama, nKel: g.nilai, nInd, nAkhir });
      });
    });
    return rows;
  }, [groupCalc, individu]);

  // ---- Criteria ops ----
  const setCrit = (id: string, patch: Partial<Criterion>) =>
    setCriteria((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const delCrit = (id: string) => setCriteria((p) => p.filter((c) => c.id !== id));
  const addCrit = () =>
    setCriteria((p) => [...p, { id: uid(), nama: `Aspek ${p.length + 1}`, bobot: 1, desc: GENERIC_DESC }]);

  // ---- Group ops ----
  const setGroup = (id: string, patch: Partial<Group>) =>
    setGroups((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const delGroup = (id: string) => setGroups((p) => p.filter((g) => g.id !== id));
  const addGroup = () =>
    setGroups((p) => [...p, { id: uid(), nama: `Kelompok ${p.length + 1}`, membersRaw: "", skor: {} }]);
  const setSkor = (gid: string, cid: string, val: number) =>
    setGroups((p) => p.map((g) => (g.id === gid ? { ...g, skor: { ...g.skor, [cid]: val } } : g)));

  const simpan = () => {
    if (groupCalc.length === 0) {
      toast.show("Tambahkan minimal 1 kelompok dulu", "error");
      return;
    }
    const critHead = "| Aspek | Bobot | Skor 1 (Kurang) | Skor 2 (Cukup) | Skor 3 (Baik) | Skor 4 (Sangat Baik) |\n|---|---|---|---|---|---|\n";
    const critBody = criteria.map((c) => `| ${c.nama} | ${c.bobot} | ${c.desc[0]} | ${c.desc[1]} | ${c.desc[2]} | ${c.desc[3]} |`).join("\n");
    const kelBody = groupCalc
      .map((g) => `| ${g.nama} | ${g.members.length} | ${g.totalBobot}/${maxTotal} | ${g.nilai} | ${g.predikat} | ${g.status} |`)
      .join("\n");
    const indBody = indivRows
      .map((r) => `| ${r.no} | ${r.nama} | ${r.kelompok} | ${r.nKel} | ${r.nInd ?? "-"} | ${r.nAkhir ?? "-"} | ${r.nAkhir === null ? "-" : statusOf(r.nAkhir)} |`)
      .join("\n");
    const md =
      `## Rubrik Penilaian${materi ? ` — ${materi}` : ""}\n\n` +
      `> KKM: ${kkmValid ? kkmVal : "-"} · Total Skor Maksimal: ${maxTotal}\n\n` +
      `### Tabel 1 — Rubrik Kriteria\n\n${critHead}${critBody}\n\n` +
      `### Tabel 2 — Lembar Penilaian Kelompok\n\n` +
      `| Kelompok | Anggota | Total Skor Bobot | Nilai | Predikat | Status KKM |\n|---|---|---|---|---|---|\n${kelBody}\n\n` +
      `> Nilai Kelompok = (Total Skor Bobot / ${maxTotal}) x 100\n\n` +
      `### Tabel 3 — Rekap Nilai Akhir Individu\n\n` +
      `| No | Nama | Kelompok | Nilai Kelompok | Nilai Individu | Nilai Akhir | Status |\n|---|---|---|---|---|---|---|\n${indBody}\n\n` +
      `> Nilai Akhir = (70% x Nilai Kelompok) + (30% x Nilai Individu)`;
    createArchive.mutate(
      { type: "rubrik", title: `Rubrik ${materi || "Penilaian"}`, markdown: md, meta: { show_kop: false } },
      {
        onSuccess: (data) => router.replace(`/viewer/${data.id}`),
        onError: (e: any) => toast.show(e?.message || "Gagal menyimpan", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Rubrik Penilaian" subtitle="Kriteria dinamis + KKM manual" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <Field
          label="Cabang Olahraga / Materi"
          placeholder="mis. Senam Lantai, Basket, Atletik"
          value={materi}
          onChangeText={setMateri}
          testID="input-rubrik-materi"
        />
        <Field
          label="Nilai KKM (bisa diubah manual)"
          placeholder="mis. 75"
          value={kkm}
          onChangeText={setKkm}
          keyboardType="numeric"
          testID="input-kkm"
        />

        {/* ================= TABEL 1 ================= */}
        <SectionLabel>Tabel 1 — Rubrik Kriteria</SectionLabel>
        <View testID="tabel-rubrik-kriteria">
          {criteria.map((c, ci) => (
            <View key={c.id} style={s.critCard} testID={`criterion-${ci}`}>
              <View style={s.critHead}>
                <TextInput
                  value={c.nama}
                  onChangeText={(v) => setCrit(c.id, { nama: v })}
                  placeholder="Nama aspek"
                  placeholderTextColor={colors.muted}
                  style={s.critName}
                  testID={`criterion-name-${ci}`}
                />
                <Pressable onPress={() => delCrit(c.id)} hitSlop={10} testID={`btn-del-criterion-${ci}`}>
                  <Icon name="trash-can-outline" size={20} color={colors.onSurface} />
                </Pressable>
              </View>
              <View style={s.bobotRow}>
                <Text style={s.bobotLabel}>Bobot</Text>
                {[1, 2, 3, 4].map((b) => (
                  <Chip key={b} label={String(b)} selected={c.bobot === b} onPress={() => setCrit(c.id, { bobot: b })} testID={`bobot-${ci}-${b}`} />
                ))}
              </View>
              {c.desc.map((d, di) => (
                <Text key={di} style={s.critDesc}>
                  {di + 1} ({SKOR_LABEL[di]}): {d}
                </Text>
              ))}
            </View>
          ))}
          <Button title="Tambah Kriteria" variant="outline" icon="plus" onPress={addCrit} testID="btn-add-criterion" />
          <View style={s.maxRow} testID="rubrik-max-total">
            <Text style={s.maxText}>TOTAL SKOR MAKSIMAL</Text>
            <Text style={s.maxVal}>{maxTotal}</Text>
          </View>
        </View>

        {/* ================= TABEL 2 ================= */}
        <SectionLabel>Tabel 2 — Lembar Penilaian Kelompok</SectionLabel>
        <View testID="tabel-kelompok">
          {groupCalc.map((g, gi) => (
            <View key={g.id} style={s.groupCard} testID={`group-${gi}`}>
              <View style={s.critHead}>
                <TextInput
                  value={g.nama}
                  onChangeText={(v) => setGroup(g.id, { nama: v })}
                  placeholder="Nama kelompok"
                  placeholderTextColor={colors.muted}
                  style={s.critName}
                  testID={`group-name-${gi}`}
                />
                <Pressable onPress={() => delGroup(g.id)} hitSlop={10} testID={`btn-del-group-${gi}`}>
                  <Icon name="trash-can-outline" size={20} color={colors.onSurface} />
                </Pressable>
              </View>
              <Field
                label="Anggota (satu nama per baris)"
                placeholder={"Andi\nBunga\nCitra"}
                value={g.membersRaw}
                onChangeText={(v) => setGroup(g.id, { membersRaw: v })}
                multiline
                testID={`group-members-${gi}`}
              />
              {criteria.map((c, ci) => (
                <View key={c.id} style={s.scoreRow}>
                  <Text style={s.scoreLabel} numberOfLines={1}>
                    {c.nama} (x{c.bobot})
                  </Text>
                  <View style={s.scoreChips}>
                    {[1, 2, 3, 4].map((v) => (
                      <Chip key={v} label={String(v)} selected={(g.skor[c.id] || 0) === v} onPress={() => setSkor(g.id, c.id, v)} testID={`score-${gi}-${ci}-${v}`} />
                    ))}
                  </View>
                </View>
              ))}
              <View style={s.groupResult}>
                <View style={s.grItem}>
                  <Text style={s.grLabel}>Total Skor Bobot</Text>
                  <Text style={s.grVal} testID={`group-total-${gi}`}>
                    {g.totalBobot}/{maxTotal}
                  </Text>
                </View>
                <View style={s.grItem}>
                  <Text style={s.grLabel}>Nilai</Text>
                  <Text style={s.grVal} testID={`group-nilai-${gi}`}>
                    {g.nilai}
                  </Text>
                </View>
                <View style={s.grItem}>
                  <Text style={s.grLabel}>Predikat</Text>
                  <Text style={s.grValSm} testID={`group-predikat-${gi}`}>
                    {g.predikat}
                  </Text>
                </View>
                <View style={[s.statusBadge, g.status === "REMEDIAL" && { backgroundColor: colors.error }]} testID={`group-status-${gi}`}>
                  <Text style={s.statusText}>{g.status}</Text>
                </View>
              </View>
            </View>
          ))}
          <Button title="Tambah Kelompok" variant="outline" icon="account-group-outline" onPress={addGroup} testID="btn-add-group" />
        </View>

        {/* ================= TABEL 3 ================= */}
        <SectionLabel>Tabel 3 — Rekap Nilai Akhir Individu</SectionLabel>
        <View style={s.table3} testID="tabel-individu">
          <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar>
            <View>
              <View style={[s.t3r, s.t3head]}>
                <Text style={[s.t3c, s.wNo, s.t3h]}>NO</Text>
                <Text style={[s.t3c, s.wName, s.t3h]}>NAMA</Text>
                <Text style={[s.t3c, s.wKel, s.t3h]}>KELOMPOK</Text>
                <Text style={[s.t3c, s.wNum, s.t3h]}>N.KELOMPOK</Text>
                <Text style={[s.t3c, s.wNum, s.t3h]}>N.INDIVIDU</Text>
                <Text style={[s.t3c, s.wNum, s.t3h]}>N.AKHIR</Text>
                <Text style={[s.t3c, s.wStatus, s.t3h]}>STATUS</Text>
              </View>
              {indivRows.length === 0 ? (
                <Text style={s.emptyT3}>Isi anggota pada Tabel 2 untuk menampilkan rekap individu.</Text>
              ) : (
                indivRows.map((r, i) => (
                  <View key={r.key} style={s.t3r} testID={`indiv-row-${i}`}>
                    <Text style={[s.t3c, s.wNo]}>{r.no}</Text>
                    <Text style={[s.t3c, s.wName, s.left]} numberOfLines={1}>
                      {r.nama}
                    </Text>
                    <Text style={[s.t3c, s.wKel, s.left]} numberOfLines={1}>
                      {r.kelompok}
                    </Text>
                    <Text style={[s.t3c, s.wNum]}>{r.nKel}</Text>
                    <View style={[s.t3c, s.wNum]}>
                      <TextInput
                        value={individu[r.key] ?? ""}
                        onChangeText={(v) => setIndividu((p) => ({ ...p, [r.key]: v }))}
                        keyboardType="numeric"
                        placeholder="-"
                        placeholderTextColor={colors.muted}
                        style={s.indInput}
                        testID={`ind-input-${i}`}
                      />
                    </View>
                    <Text style={[s.t3c, s.wNum, s.t3bold]} testID={`ind-akhir-${i}`}>
                      {r.nAkhir ?? "-"}
                    </Text>
                    <Text style={[s.t3c, s.wStatus, r.nAkhir !== null && r.nAkhir < kkmVal ? s.remedial : s.lulus]} testID={`ind-status-${i}`}>
                      {r.nAkhir === null ? "-" : statusOf(r.nAkhir)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          <Text style={s.formula}>Nilai Akhir = (70% x Nilai Kelompok) + (30% x Nilai Individu)</Text>
        </View>

        <Button title="Simpan ke Arsip" icon="content-save-outline" onPress={simpan} loading={createArchive.isPending} testID="btn-simpan-rubrik" />
      </KeyboardAwareScrollView>
      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"], gap: spacing.sm },

  critCard: { borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  critHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  critName: { flex: 1, fontSize: fontSize.lg, fontWeight: "800", color: c.onSurface, borderBottomWidth: 2, borderColor: c.border, paddingVertical: 4 },
  bobotRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bobotLabel: { fontSize: fontSize.sm, fontWeight: "800", color: c.muted, textTransform: "uppercase", marginRight: spacing.xs },
  critDesc: { fontSize: fontSize.sm, color: c.onSurfaceSecondary, fontFamily: fonts.mono },
  maxRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surfaceTertiary, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg },
  maxText: { fontSize: fontSize.base, fontWeight: "900", color: c.onSurface, textTransform: "uppercase" },
  maxVal: { fontSize: fontSize["2xl"], fontWeight: "900", color: c.onSurface, fontFamily: fonts.mono },

  groupCard: { borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderColor: c.border, paddingTop: spacing.xs },
  scoreLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: "700", color: c.onSurface },
  scoreChips: { flexDirection: "row", gap: spacing.xs },
  groupResult: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: 2, borderColor: c.borderStrong, paddingTop: spacing.sm, marginTop: spacing.xs, flexWrap: "wrap" },
  grItem: { alignItems: "flex-start" },
  grLabel: { fontSize: fontSize.sm, color: c.muted, textTransform: "uppercase", fontWeight: "700" },
  grVal: { fontSize: fontSize.xl, fontWeight: "900", color: c.onSurface, fontFamily: fonts.mono },
  grValSm: { fontSize: fontSize.base, fontWeight: "900", color: c.onSurface },
  statusBadge: { backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.sm, paddingVertical: 4, marginLeft: "auto" },
  statusText: { fontSize: fontSize.sm, fontWeight: "900", color: c.onSurfaceInverse, textTransform: "uppercase" },

  table3: { borderWidth: 2, borderColor: c.borderStrong, marginBottom: spacing.sm },
  t3r: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: c.border },
  t3head: { backgroundColor: c.surfaceTertiary, borderBottomWidth: 2, borderColor: c.borderStrong },
  t3c: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, fontSize: fontSize.sm, fontFamily: fonts.mono, color: c.onSurface, textAlign: "center" },
  t3h: { fontWeight: "900", fontFamily: undefined },
  t3bold: { fontWeight: "900" },
  wNo: { width: 36 },
  wName: { width: 130 },
  wKel: { width: 90 },
  wNum: { width: 78 },
  wStatus: { width: 88, fontWeight: "900" },
  left: { textAlign: "left" },
  indInput: { borderWidth: 1, borderColor: c.borderStrong, minWidth: 56, paddingVertical: 2, paddingHorizontal: 4, textAlign: "center", fontSize: fontSize.sm, fontFamily: fonts.mono, color: c.onSurface },
  lulus: { color: c.onSurface },
  remedial: { color: c.error },
  emptyT3: { padding: spacing.lg, fontSize: fontSize.sm, color: c.muted, fontFamily: fonts.mono },
  formula: { padding: spacing.sm, fontSize: fontSize.sm, color: c.muted, fontFamily: fonts.mono },
}));

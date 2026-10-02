import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Button, Field, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useCreateArchive } from "@/src/hooks";
import { makeStyles, spacing, fontSize, fonts } from "@/src/theme";

// IFERROR-safe number parse: empty/invalid tokens are dropped, never NaN into the calc.
function parseValues(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((x) => parseFloat(x.replace(",", ".")))
    .filter((n) => !isNaN(n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function Katrol() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createArchive = useCreateArchive();

  const [raw, setRaw] = useState("");
  const [targetMin, setTargetMin] = useState("75"); // KKM (manual)
  const [targetMax, setTargetMax] = useState("100"); // manual

  const vals = useMemo(() => parseValues(raw), [raw]);
  // Otomatisasi MIN & MAX (setara IFERROR(MIN()) / IFERROR(MAX()) Excel).
  const minAsli = vals.length ? Math.min(...vals) : null;
  const maxAsli = vals.length ? Math.max(...vals) : null;

  const tMin = parseFloat(targetMin);
  const tMax = parseFloat(targetMax);
  const targetsValid = !isNaN(tMin) && !isNaN(tMax);

  // Nilai Katrol = Target_Min + ((Nilai_Asli - Min_Asli)/(Max_Asli - Min_Asli) * (Target_Max - Target_Min))
  const rows = useMemo(() => {
    if (vals.length === 0 || !targetsValid || minAsli === null || maxAsli === null) return [];
    const range = maxAsli - minAsli;
    return vals.map((v) => ({
      asli: v,
      // Pengaman IFERROR: jika semua nilai sama (range 0) -> beri Target_Min, tanpa crash.
      baru: round1(range === 0 ? tMin : tMin + ((v - minAsli) / range) * (tMax - tMin)),
    }));
  }, [vals, targetsValid, minAsli, maxAsli, tMin, tMax]);

  const rata2 = rows.length ? round1(rows.reduce((a, r) => a + r.baru, 0) / rows.length) : null;

  const simpan = () => {
    if (rows.length === 0) {
      toast.show("Belum ada hasil katrol", "error");
      return;
    }
    const header = `| No | Nilai Asli | Nilai Katrol |\n|---|---|---|\n`;
    const body = rows.map((r, i) => `| ${i + 1} | ${r.asli} | ${r.baru} |`).join("\n");
    const md =
      `## Hasil Katrol Nilai (Linear Scaling)\n\n` +
      `| Parameter | Nilai |\n|---|---|\n` +
      `| Nilai Asli Terkecil | ${minAsli} |\n` +
      `| Nilai Asli Terbesar | ${maxAsli} |\n` +
      `| Target Nilai Min (KKM) | ${tMin} |\n` +
      `| Target Nilai Max | ${tMax} |\n\n` +
      `${header}${body}\n|  | **Rata-Rata Kelas** | **${rata2}** |`;
    createArchive.mutate(
      { type: "katrol", title: `Katrol Nilai (${rows.length} data)`, markdown: md, meta: { show_kop: false } },
      {
        onSuccess: (data) => router.replace(`/viewer/${data.id}`),
        onError: (e: any) => toast.show(e?.message || "Gagal menyimpan", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Katrol Nilai" subtitle="Linear scaling proporsional" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <Field
          label="Daftar Nilai Asli"
          placeholder="Pisahkan dengan koma/spasi, mis. 40, 55, 60, 72, 85"
          value={raw}
          onChangeText={setRaw}
          multiline
          testID="input-nilai"
        />

        <SectionLabel>Parameter Katrol</SectionLabel>
        <View style={s.paramTable} testID="katrol-params">
          <View style={[s.pr, s.prHead]}>
            <Text style={[s.pcell, s.pcellHead]}>PARAMETER</Text>
            <Text style={[s.pcell, s.pcellHead, s.pcellVal]}>NILAI</Text>
          </View>
          <View style={s.pr}>
            <Text style={s.pcell}>Nilai Asli Terkecil (otomatis)</Text>
            <Text style={[s.pcell, s.pcellVal, s.mono]} testID="param-min-asli">
              {minAsli ?? "-"}
            </Text>
          </View>
          <View style={s.pr}>
            <Text style={s.pcell}>Nilai Asli Terbesar (otomatis)</Text>
            <Text style={[s.pcell, s.pcellVal, s.mono]} testID="param-max-asli">
              {maxAsli ?? "-"}
            </Text>
          </View>
          <View style={s.pr}>
            <Text style={s.pcell}>Target Nilai Min (KKM)</Text>
            <View style={s.pcellVal}>
              <Field
                label=""
                value={targetMin}
                onChangeText={setTargetMin}
                keyboardType="numeric"
                style={s.paramInput}
                testID="input-target-min"
              />
            </View>
          </View>
          <View style={s.pr}>
            <Text style={s.pcell}>Target Nilai Max</Text>
            <View style={s.pcellVal}>
              <Field
                label=""
                value={targetMax}
                onChangeText={setTargetMax}
                keyboardType="numeric"
                style={s.paramInput}
                testID="input-target-max"
              />
            </View>
          </View>
        </View>
        {minAsli !== null && minAsli === maxAsli && (
          <Text style={s.note}>Semua nilai asli sama — hasil katrol diset ke Target Min.</Text>
        )}

        {rows.length > 0 && (
          <>
            <SectionLabel>Hasil Katrol</SectionLabel>
            <View style={s.tableWrap} testID="katrol-result">
              <View style={[s.tr, s.trHead]}>
                <Text style={[s.cell, s.cellHead, s.cNo]}>NO</Text>
                <Text style={[s.cell, s.cellHead]}>NILAI ASLI</Text>
                <Text style={[s.cell, s.cellHead]}>NILAI KATROL</Text>
              </View>
              <ScrollView style={s.tableBody} nestedScrollEnabled>
                {rows.map((r, i) => (
                  <View key={i} style={s.tr} testID={`katrol-row-${i}`}>
                    <Text style={[s.cell, s.cNo]}>{i + 1}</Text>
                    <Text style={s.cell}>{r.asli}</Text>
                    <Text style={[s.cell, s.cellBold]} testID={`katrol-new-${i}`}>
                      {r.baru}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View style={[s.tr, s.trAvg]} testID="katrol-avg">
                <Text style={[s.cell, s.cNo, s.avgText]}>Σ</Text>
                <Text style={[s.cell, s.avgText]}>RATA-RATA KELAS</Text>
                <Text style={[s.cell, s.avgText]}>{rata2}</Text>
              </View>
            </View>
            <Button
              title="Simpan ke Arsip"
              icon="content-save-outline"
              onPress={simpan}
              loading={createArchive.isPending}
              style={{ marginTop: spacing.md }}
              testID="btn-simpan-katrol"
            />
          </>
        )}
      </KeyboardAwareScrollView>
      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"], gap: spacing.sm },
  paramTable: { borderWidth: 2, borderColor: c.borderStrong, marginBottom: spacing.md },
  pr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: c.border },
  prHead: { backgroundColor: c.surfaceTertiary, borderBottomWidth: 2, borderColor: c.borderStrong },
  pcell: { flex: 1.4, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, fontSize: fontSize.sm, fontWeight: "700", color: c.onSurface },
  pcellHead: { fontWeight: "900", textTransform: "uppercase" },
  pcellVal: { flex: 1, textAlign: "center" },
  paramInput: { minHeight: 40, paddingVertical: 4, textAlign: "center", borderWidth: 0, borderBottomWidth: 2, fontSize: fontSize.base },
  mono: { fontFamily: fonts.mono, fontWeight: "900", fontSize: fontSize.base },
  note: { fontSize: fontSize.sm, color: c.muted, fontFamily: fonts.mono, marginBottom: spacing.sm },
  tableWrap: { borderWidth: 2, borderColor: c.borderStrong },
  tableBody: { maxHeight: 320 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: c.border },
  trHead: { backgroundColor: c.surfaceTertiary, borderBottomWidth: 2, borderColor: c.borderStrong },
  trAvg: { backgroundColor: c.surfaceTertiary, borderBottomWidth: 0, borderTopWidth: 2, borderColor: c.borderStrong },
  cell: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, fontFamily: fonts.mono, fontSize: fontSize.base, color: c.onSurface, textAlign: "center" },
  cellHead: { fontWeight: "900", fontFamily: undefined },
  cellBold: { fontWeight: "900" },
  cNo: { flex: 0.4 },
  avgText: { fontWeight: "900", fontFamily: fonts.mono },
}));

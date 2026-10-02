import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Button, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useCreateArchive } from "@/src/hooks";
import { makeStyles, spacing, fontSize, fonts } from "@/src/theme";

type Row = { asli: number; baru: number };

export default function Katrol() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createArchive = useCreateArchive();

  const [raw, setRaw] = useState("");
  const [minAsli, setMinAsli] = useState("");
  const [maxAsli, setMaxAsli] = useState("");
  const [minBaru, setMinBaru] = useState("75");
  const [maxBaru, setMaxBaru] = useState("100");
  const [rows, setRows] = useState<Row[]>([]);

  const parseValues = () =>
    raw
      .split(/[\s,;]+/)
      .map((x) => parseFloat(x.replace(",", ".")))
      .filter((n) => !isNaN(n));

  const autoFill = () => {
    const vals = parseValues();
    if (vals.length === 0) {
      toast.show("Masukkan daftar nilai asli dulu", "error");
      return;
    }
    setMinAsli(String(Math.min(...vals)));
    setMaxAsli(String(Math.max(...vals)));
    toast.show("Min & Max asli terisi otomatis", "success");
  };

  const hitung = () => {
    const vals = parseValues();
    if (vals.length === 0) {
      toast.show("Masukkan daftar nilai asli", "error");
      return;
    }
    const mnA = minAsli === "" ? Math.min(...vals) : parseFloat(minAsli);
    const mxA = maxAsli === "" ? Math.max(...vals) : parseFloat(maxAsli);
    const mnB = parseFloat(minBaru);
    const mxB = parseFloat(maxBaru);
    if ([mnB, mxB].some(isNaN)) {
      toast.show("Isi target Min & Max baru", "error");
      return;
    }
    if (mxA === mnA) {
      toast.show("Max Asli tidak boleh sama dengan Min Asli", "error");
      return;
    }
    const out = vals.map((v) => ({
      asli: v,
      baru: Math.round((mnB + ((v - mnA) / (mxA - mnA)) * (mxB - mnB)) * 10) / 10,
    }));
    setRows(out);
    toast.show(`${out.length} nilai dikonversi`, "success");
  };

  const simpan = () => {
    if (rows.length === 0) return;
    const header = `| No | Nilai Asli | Nilai Baru |\n|---|---|---|\n`;
    const body = rows.map((r, i) => `| ${i + 1} | ${r.asli} | ${r.baru} |`).join("\n");
    const md = `## Hasil Katrol Nilai (Linear Scaling)\n\n> Skala: Asli [${minAsli || "auto"} – ${maxAsli || "auto"}] → Baru [${minBaru} – ${maxBaru}]\n\n${header}${body}`;
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
      <Header back title="Katrol Nilai" subtitle="Konversi linear scaling" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <Field
          label="Daftar Nilai Asli"
          placeholder="Pisahkan dengan koma/spasi, mis. 40, 55, 60, 72, 85"
          value={raw}
          onChangeText={setRaw}
          multiline
          testID="input-nilai"
        />
        <Button title="Auto Min/Max dari Data" variant="outline" icon="auto-fix" onPress={autoFill} testID="btn-auto" />
        <View style={s.rowPair}>
          <View style={s.half}>
            <Field label="Min Asli" placeholder="auto" value={minAsli} onChangeText={setMinAsli} keyboardType="numeric" testID="input-min-asli" />
          </View>
          <View style={s.half}>
            <Field label="Max Asli" placeholder="auto" value={maxAsli} onChangeText={setMaxAsli} keyboardType="numeric" testID="input-max-asli" />
          </View>
        </View>
        <View style={s.rowPair}>
          <View style={s.half}>
            <Field label="Min Baru" value={minBaru} onChangeText={setMinBaru} keyboardType="numeric" testID="input-min-baru" />
          </View>
          <View style={s.half}>
            <Field label="Max Baru" value={maxBaru} onChangeText={setMaxBaru} keyboardType="numeric" testID="input-max-baru" />
          </View>
        </View>
        <Button title="Hitung Konversi" icon="calculator" onPress={hitung} testID="btn-hitung" />

        {rows.length > 0 && (
          <View style={s.tableWrap} testID="katrol-result">
            <View style={[s.tr, s.trHead]}>
              <Text style={[s.cell, s.cellHead, s.cNo]}>NO</Text>
              <Text style={[s.cell, s.cellHead]}>NILAI ASLI</Text>
              <Text style={[s.cell, s.cellHead]}>NILAI BARU</Text>
            </View>
            <ScrollView style={s.tableBody} nestedScrollEnabled>
              {rows.map((r, i) => (
                <View key={i} style={s.tr}>
                  <Text style={[s.cell, s.cNo]}>{i + 1}</Text>
                  <Text style={s.cell}>{r.asli}</Text>
                  <Text style={[s.cell, s.cellBold]}>{r.baru}</Text>
                </View>
              ))}
            </ScrollView>
            <Button title="Simpan ke Arsip" icon="content-save-outline" onPress={simpan} loading={createArchive.isPending} style={{ marginTop: spacing.md }} testID="btn-simpan-katrol" />
          </View>
        )}
      </KeyboardAwareScrollView>
      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"], gap: spacing.md },
  rowPair: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  tableWrap: { marginTop: spacing.lg, borderWidth: 2, borderColor: c.borderStrong, padding: spacing.sm },
  tableBody: { maxHeight: 320 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: c.border },
  trHead: { backgroundColor: c.surfaceTertiary, borderBottomWidth: 2, borderColor: c.borderStrong },
  cell: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, fontFamily: fonts.mono, fontSize: fontSize.base, color: c.onSurface, textAlign: "center" },
  cellHead: { fontWeight: "900", fontFamily: undefined },
  cellBold: { fontWeight: "900" },
  cNo: { flex: 0.4 },
}));

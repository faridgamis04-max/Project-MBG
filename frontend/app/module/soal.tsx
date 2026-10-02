import { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/src/components/Header";
import { Button, ChipSelect, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useGenerate } from "@/src/hooks";
import { makeStyles, spacing } from "@/src/theme";

const JENJANG = ["SD/MI", "SMP/MTs", "SMA/SMK/MA"];
const FASE = ["A", "B", "C", "D", "E", "F"];
const LEVEL = ["LOTS", "HOTS", "Campuran"];
const BENTUK = ["Pilihan Ganda", "Uraian", "Campuran"];

export default function Soal() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const gen = useGenerate("soal");

  const [jenjang, setJenjang] = useState("SMP/MTs");
  const [fase, setFase] = useState("D");
  const [level, setLevel] = useState("Campuran");
  const [bentuk, setBentuk] = useState("Pilihan Ganda");
  const [topik, setTopik] = useState("");
  const [jumlah, setJumlah] = useState("10");

  const onGenerate = () => {
    gen.mutate(
      { jenjang, fase, level, bentuk, topik, jumlah },
      {
        onSuccess: (data) => router.replace(`/viewer/${data.id}`),
        onError: (e: any) => toast.show(e?.message || "Gagal membuat soal", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Bank Soal" subtitle="Naskah soal siap cetak" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <ChipSelect label="Jenjang" options={JENJANG} value={jenjang} onChange={setJenjang} />
        <ChipSelect label="Fase" options={FASE} value={fase} onChange={setFase} />
        <ChipSelect label="Level Kognitif" options={LEVEL} value={level} onChange={setLevel} />
        <ChipSelect label="Bentuk Soal" options={BENTUK} value={bentuk} onChange={setBentuk} />
        <Field label="Topik" placeholder="mis. Kebugaran Jasmani" value={topik} onChangeText={setTopik} testID="input-topik" />
        <Field label="Jumlah Soal" placeholder="mis. 10" value={jumlah} onChangeText={setJumlah} keyboardType="number-pad" testID="input-jumlah" />
      </KeyboardAwareScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Generate Soal" icon="creation" onPress={onGenerate} loading={gen.isPending} testID="btn-generate" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

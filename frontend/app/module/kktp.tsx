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

export default function Kktp() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const gen = useGenerate("kktp");

  const [jenjang, setJenjang] = useState("SMP/MTs");
  const [fase, setFase] = useState("D");
  const [cp, setCp] = useState("");

  const onGenerate = () => {
    gen.mutate(
      { jenjang, fase, cp },
      {
        onSuccess: (data) => router.replace(`/viewer/${data.id}`),
        onError: (e: any) => toast.show(e?.message || "Gagal membuat KKTP", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Lingkup & KKTP" subtitle="Pemetaan materi & kriteria" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <ChipSelect label="Jenjang" options={JENJANG} value={jenjang} onChange={setJenjang} />
        <ChipSelect label="Fase" options={FASE} value={fase} onChange={setFase} />
        <Field
          label="Capaian Pembelajaran / Elemen"
          placeholder="Tempel teks CP / elemen PJOK di sini (opsional)"
          value={cp}
          onChangeText={setCp}
          multiline
          testID="input-cp"
        />
      </KeyboardAwareScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Generate KKTP" icon="creation" onPress={onGenerate} loading={gen.isPending} testID="btn-generate" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

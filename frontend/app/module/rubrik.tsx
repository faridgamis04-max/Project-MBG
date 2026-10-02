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

export default function Rubrik() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const gen = useGenerate("rubrik");

  const [jenjang, setJenjang] = useState("SMP/MTs");
  const [cabang, setCabang] = useState("");

  const onGenerate = () => {
    gen.mutate(
      { jenjang, cabang },
      {
        onSuccess: (data) => router.replace(`/viewer/${data.id}`),
        onError: (e: any) => toast.show(e?.message || "Gagal membuat rubrik", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Rubrik Nilai" subtitle="Instrumen penilaian otomatis" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <ChipSelect label="Jenjang" options={JENJANG} value={jenjang} onChange={setJenjang} />
        <Field label="Cabang Olahraga / Topik Materi" placeholder="mis. Bola Basket" value={cabang} onChangeText={setCabang} testID="input-cabang" />
      </KeyboardAwareScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Generate Rubrik" icon="creation" onPress={onGenerate} loading={gen.isPending} testID="btn-generate" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

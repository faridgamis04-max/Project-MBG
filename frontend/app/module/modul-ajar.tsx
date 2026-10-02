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
const SEMESTER = ["Ganjil", "Genap"];

export default function ModulAjar() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const gen = useGenerate("modul-ajar");

  const [jenjang, setJenjang] = useState("SMP/MTs");
  const [fase, setFase] = useState("D");
  const [semester, setSemester] = useState("Ganjil");
  const [materi, setMateri] = useState("");
  const [durasi, setDurasi] = useState("");

  const onGenerate = () => {
    gen.mutate(
      { jenjang, fase, semester, materi, durasi },
      {
        onSuccess: (data) => router.replace(`/viewer/${data.id}`),
        onError: (e: any) => toast.show(e?.message || "Gagal membuat modul ajar", "error"),
      },
    );
  };

  return (
    <View style={s.screen}>
      <Header back title="Modul Ajar" subtitle="Generator Kurikulum Merdeka" />
      <KeyboardAwareScrollView contentContainerStyle={s.content} bottomOffset={20} showsVerticalScrollIndicator={false}>
        <ChipSelect label="Jenjang" options={JENJANG} value={jenjang} onChange={setJenjang} />
        <ChipSelect label="Fase" options={FASE} value={fase} onChange={setFase} />
        <ChipSelect label="Semester" options={SEMESTER} value={semester} onChange={setSemester} />
        <Field label="Materi Utama" placeholder="mis. Permainan Bola Besar — Sepak Bola" value={materi} onChangeText={setMateri} testID="input-materi" />
        <Field label="Durasi (JP)" placeholder="mis. 3 JP (3 x 40 menit)" value={durasi} onChangeText={setDurasi} testID="input-durasi" />
      </KeyboardAwareScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Generate Modul Ajar" icon="creation" onPress={onGenerate} loading={gen.isPending} testID="btn-generate" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
  footer: { borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.md, backgroundColor: c.surface },
}));

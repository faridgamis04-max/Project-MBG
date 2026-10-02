import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { makeStyles, spacing, fontSize, useTheme } from "@/src/theme";
import { Icon } from "./Icon";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type BtnProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Icon>["name"];
  testID?: string;
  style?: any;
};

export function Button({ title, onPress, variant = "primary", disabled, loading, icon, testID, style }: BtnProps) {
  const s = useBtnStyles();
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const bg = isOutline ? "transparent" : isPrimary ? colors.brandPrimary : colors.surfaceTertiary;
  const fg = isOutline ? colors.onSurface : isPrimary ? colors.onBrandPrimary : colors.onSurfaceTertiary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        isOutline && { borderWidth: 2, borderColor: colors.borderStrong },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.btnRow}>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <Text style={[s.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useBtnStyles = makeStyles((c) => ({
  btn: { minHeight: 52, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btnText: { fontSize: fontSize.lg, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
}));

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------
type FieldProps = TextInputProps & { label: string; testID?: string };

export function Field({ label, testID, style, ...rest }: FieldProps) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        placeholderTextColor={colors.muted}
        style={[s.input, rest.multiline && s.multiline, style]}
        {...rest}
      />
    </View>
  );
}

const useFieldStyles = makeStyles((c) => ({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "800",
    color: c.onSurface,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    color: c.onSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    minHeight: 50,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
}));

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({ children, style, onPress, testID }: any) {
  const s = useCardStyles();
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.card, style, pressed && s.pressed]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[s.card, style]}>
      {children}
    </View>
  );
}

const useCardStyles = makeStyles((c) => ({
  card: { borderWidth: 2, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary, padding: spacing.lg },
  pressed: { opacity: 0.75 },
}));

// ---------------------------------------------------------------------------
// SectionLabel
// ---------------------------------------------------------------------------
export function SectionLabel({ children }: { children: string }) {
  const s = useSectionStyles();
  return <Text style={s.label}>{children}</Text>;
}

const useSectionStyles = makeStyles((c) => ({
  label: {
    fontSize: fontSize.sm,
    fontWeight: "800",
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
}));

// ---------------------------------------------------------------------------
// Chip (single-select pill, brutalist square)
// ---------------------------------------------------------------------------
export function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  const s = useChipStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[s.chip, { backgroundColor: selected ? colors.brandPrimary : colors.surface, borderColor: colors.borderStrong }]}
    >
      <Text style={[s.chipText, { color: selected ? colors.onBrandPrimary : colors.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

const useChipStyles = makeStyles((c) => ({
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: fontSize.sm, fontWeight: "700" },
}));

// ---------------------------------------------------------------------------
// ChipSelect — a label + horizontal single-select chip row (form control)
// ---------------------------------------------------------------------------
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  testID,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  const s = useChipSelectStyles();
  return (
    <View style={s.wrap} testID={testID}>
      <Text style={s.label}>{label}</Text>
      <ScrollViewHorizontal>
        {options.map((opt) => (
          <Chip key={opt} label={opt} selected={value === opt} onPress={() => onChange(opt)} testID={`chip-${opt}`} />
        ))}
      </ScrollViewHorizontal>
    </View>
  );
}

function ScrollViewHorizontal({ children }: { children: React.ReactNode }) {
  const s = useChipSelectStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      style={s.scroll}
    >
      {children}
    </ScrollView>
  );
}

const useChipSelectStyles = makeStyles((c) => ({
  wrap: { marginBottom: spacing.lg },
  scroll: { height: 56 },
  row: { gap: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "800",
    color: c.onSurface,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
}));


// ---------------------------------------------------------------------------
// Confirm modal (bottom sheet style)
// ---------------------------------------------------------------------------
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "HAPUS",
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const s = useConfirmStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.backdrop} onPress={onCancel}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.row}>
            <Button title="Batal" variant="outline" onPress={onCancel} style={{ flex: 1 }} testID="confirm-cancel" />
            <Button title={confirmLabel} onPress={onConfirm} style={{ flex: 1 }} testID="confirm-ok" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useConfirmStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surface, borderTopWidth: 3, borderColor: c.borderStrong, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: "800", color: c.onSurface, textTransform: "uppercase" },
  message: { fontSize: fontSize.base, color: c.onSurfaceSecondary, lineHeight: 20 },
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
}));

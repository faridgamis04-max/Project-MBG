import Markdown from "react-native-markdown-display";
import { fonts, fontSize, spacing, useTheme } from "@/src/theme";

export function MarkdownView({ content }: { content: string }) {
  const { colors } = useTheme();
  const styles = {
    body: { color: colors.onSurface, fontSize: fontSize.base, lineHeight: 22 },
    heading1: { color: colors.onSurface, fontSize: fontSize["2xl"], fontWeight: "900", marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: "uppercase" },
    heading2: { color: colors.onSurface, fontSize: fontSize.xl, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm, borderBottomWidth: 2, borderColor: colors.borderStrong, paddingBottom: spacing.xs },
    heading3: { color: colors.onSurface, fontSize: fontSize.lg, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.xs },
    heading4: { color: colors.onSurface, fontSize: fontSize.base, fontWeight: "800", marginTop: spacing.sm },
    strong: { fontWeight: "800", color: colors.onSurface },
    em: { fontStyle: "italic", color: colors.muted },
    paragraph: { marginTop: 0, marginBottom: spacing.sm, color: colors.onSurface },
    bullet_list: { marginBottom: spacing.sm },
    ordered_list: { marginBottom: spacing.sm },
    list_item: { marginVertical: 2, color: colors.onSurface },
    blockquote: {
      backgroundColor: colors.surfaceTertiary,
      borderLeftWidth: 4,
      borderColor: colors.borderStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    hr: { backgroundColor: colors.borderStrong, height: 2, marginVertical: spacing.md },
    table: { borderWidth: 2, borderColor: colors.borderStrong, marginVertical: spacing.sm },
    thead: { backgroundColor: colors.surfaceTertiary },
    th: { borderWidth: 1, borderColor: colors.borderStrong, padding: spacing.sm, fontWeight: "800", color: colors.onSurface, fontSize: fontSize.sm },
    tr: { borderBottomWidth: 1, borderColor: colors.border },
    td: { borderWidth: 1, borderColor: colors.border, padding: spacing.sm, color: colors.onSurface, fontFamily: fonts.mono, fontSize: fontSize.sm },
    code_inline: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, fontFamily: fonts.mono, paddingHorizontal: 4 },
    fence: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, fontFamily: fonts.mono, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
    code_block: { backgroundColor: colors.surfaceTertiary, color: colors.onSurface, fontFamily: fonts.mono, padding: spacing.sm },
  } as const;

  return <Markdown style={styles as any}>{content}</Markdown>;
}

import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, spacing, fontSize, useTheme } from "@/src/theme";
import { Icon } from "./Icon";

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightIcon?: React.ComponentProps<typeof Icon>["name"];
  onRightPress?: () => void;
  rightTestID?: string;
};

export function Header({ title, subtitle, back, rightIcon, onRightPress, rightTestID }: Props) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={s.row}>
        {back ? (
          <Pressable testID="header-back" onPress={() => router.back()} style={s.iconBtn} hitSlop={10}>
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
        ) : (
          <View style={s.iconBtn} />
        )}
        <View style={s.titleWrap}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={s.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightIcon ? (
          <Pressable testID={rightTestID || "header-right"} onPress={onRightPress} style={s.iconBtn} hitSlop={10}>
            <Icon name={rightIcon} size={24} color={colors.onSurface} />
          </Pressable>
        ) : (
          <View style={s.iconBtn} />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    backgroundColor: c.surface,
    borderBottomWidth: 3,
    borderColor: c.borderStrong,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: "900", color: c.onSurface, textTransform: "uppercase", letterSpacing: 0.5 },
  subtitle: { fontSize: fontSize.sm, color: c.muted, marginTop: 1 },
}));

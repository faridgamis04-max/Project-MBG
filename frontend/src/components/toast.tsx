import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, spacing, fontSize } from "@/src/theme";
import { Icon } from "./Icon";

type ToastKind = "info" | "success" | "error";
type ToastCtx = { show: (msg: string, kind?: ToastKind) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<ToastKind>("info");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const s = useStyles();

  const show = useCallback(
    (m: string, k: ToastKind = "info") => {
      setMsg(m);
      setKind(k);
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setVisible(false));
      }, 2600);
    },
    [opacity],
  );

  const iconName = kind === "success" ? "check-bold" : kind === "error" ? "close-thick" : "information-outline";

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {visible && (
        <Animated.View pointerEvents="none" style={[s.wrap, { top: insets.top + spacing.sm, opacity }]}>
          <View style={s.toast} testID="toast">
            <Icon name={iconName as any} size={18} color={s.text.color as string} />
            <Text style={s.text} numberOfLines={3}>
              {msg}
            </Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 9999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceInverse,
    borderWidth: 2,
    borderColor: c.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  text: { color: c.onSurfaceInverse, fontSize: fontSize.base, fontWeight: "700", flex: 1 },
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _sheet = StyleSheet;

// Design tokens for PJOK Super-App — Brutalist monochrome (abu-hitam).
// Light + Dark. Keys match the "color" block of /app/design_guidelines.json.
import { useMemo } from "react";
import { Appearance, Platform, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FAFAFA",
  onSurface: "#111111",
  surfaceSecondary: "#F4F4F4",
  onSurfaceSecondary: "#111111",
  surfaceTertiary: "#EAEAEA",
  onSurfaceTertiary: "#111111",
  surfaceInverse: "#111111",
  onSurfaceInverse: "#FAFAFA",
  muted: "#777777",

  brand: "#111111",
  onBrand: "#FAFAFA",
  brandPrimary: "#111111",
  onBrandPrimary: "#FAFAFA",
  brandSecondary: "#333333",
  onBrandSecondary: "#FAFAFA",
  brandTertiary: "#EAEAEA",
  onBrandTertiary: "#111111",

  success: "#111111",
  onSuccess: "#FAFAFA",
  warning: "#555555",
  onWarning: "#FAFAFA",
  error: "#000000",
  onError: "#FAFAFA",
  info: "#333333",
  onInfo: "#FAFAFA",

  border: "#CCCCCC",
  borderStrong: "#111111",
  divider: "#EAEAEA",
};

const dark: typeof light = {
  surface: "#0C0C0C",
  onSurface: "#FAFAFA",
  surfaceSecondary: "#161616",
  onSurfaceSecondary: "#FAFAFA",
  surfaceTertiary: "#242424",
  onSurfaceTertiary: "#FAFAFA",
  surfaceInverse: "#FAFAFA",
  onSurfaceInverse: "#111111",
  muted: "#9A9A9A",

  brand: "#FAFAFA",
  onBrand: "#111111",
  brandPrimary: "#FAFAFA",
  onBrandPrimary: "#111111",
  brandSecondary: "#CCCCCC",
  onBrandSecondary: "#111111",
  brandTertiary: "#2A2A2A",
  onBrandTertiary: "#FAFAFA",

  success: "#FAFAFA",
  onSuccess: "#111111",
  warning: "#BBBBBB",
  onWarning: "#111111",
  error: "#FFFFFF",
  onError: "#111111",
  info: "#CCCCCC",
  onInfo: "#111111",

  border: "#333333",
  borderStrong: "#FAFAFA",
  divider: "#242424",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

// Layout tokens (Brutalist: zero radius, rigid spacing).
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 } as const;
export const radius = { sm: 0, md: 0, lg: 0, pill: 0 } as const;
export const fontSize = { sm: 12, base: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 30 } as const;
export const fonts = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as string,
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

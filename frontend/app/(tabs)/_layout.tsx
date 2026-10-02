import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

const TABS = [
  { name: "index", label: "Beranda", icon: "view-dashboard-outline", sf: "square.grid.2x2" },
  { name: "kelas", label: "Kelas", icon: "account-group-outline", sf: "person.3" },
  { name: "arsip", label: "Arsip", icon: "folder-outline", sf: "folder" },
  { name: "profil", label: "Profil", icon: "account-cog-outline", sf: "person.crop.circle" },
] as const;

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf as any} />
            <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 3,
          borderTopColor: colors.borderStrong,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ color, size }) => (
              <MaterialDesignIcons name={t.icon as any} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

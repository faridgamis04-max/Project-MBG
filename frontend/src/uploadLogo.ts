import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { API } from "./api";

export type LogoResult = { ok: boolean; reason?: "permission" | "cancelled" | "error" };

// Picks a logo image and uploads it to the backend (which stores it in object storage).
export async function pickAndUploadLogo(): Promise<LogoResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: "permission" };

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (res.canceled || !res.assets?.length) return { ok: false, reason: "cancelled" };

  const asset = res.assets[0];
  const uri = asset.uri;
  const name = asset.fileName || `logo-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  const url = `${API}/profile/logo`;

  try {
    if (Platform.OS === "web") {
      const blob = await (await fetch(uri)).blob();
      const form = new FormData();
      form.append("file", blob, name);
      const r = await fetch(url, { method: "POST", body: form });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } else {
      const r = await FileSystem.uploadAsync(url, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: type,
        parameters: { filename: name },
      });
      if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

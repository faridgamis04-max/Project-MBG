import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { exportUrl } from "./api";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// Downloads the generated document and opens the native share sheet.
export async function downloadAndShare(archiveId: string, title: string, format: "pdf" | "docx" | "xlsx") {
  const url = exportUrl(archiveId, format);

  if (Platform.OS === "web") {
    // Web: open the file in a new tab so the browser downloads it.
    if (typeof window !== "undefined") window.open(url, "_blank");
    return;
  }

  const safe = (title || "dokumen").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 50) || "dokumen";
  const fileUri = `${FileSystem.cacheDirectory}${safe}.${format}`;
  const res = await FileSystem.downloadAsync(url, fileUri);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: MIME[format], dialogTitle: title });
  }
}

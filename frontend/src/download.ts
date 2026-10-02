import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { exportUrl, recapExportUrl } from "./api";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function safeName(title: string) {
  return (title || "dokumen").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 50) || "dokumen";
}

// Downloads a document from a URL and opens the native share sheet (web: new tab).
async function fetchAndShare(url: string, title: string, format: "pdf" | "docx" | "xlsx") {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.open(url, "_blank");
    return;
  }
  const fileUri = `${FileSystem.cacheDirectory}${safeName(title)}.${format}`;
  const res = await FileSystem.downloadAsync(url, fileUri);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: MIME[format], dialogTitle: title });
  }
}

// Downloads the generated document and opens the native share sheet.
export async function downloadAndShare(archiveId: string, title: string, format: "pdf" | "docx" | "xlsx") {
  await fetchAndShare(exportUrl(archiveId, format), title, format);
}

// Downloads the attendance recap as an Excel file and opens the native share sheet.
export async function downloadRecap(classId: string, className: string) {
  await fetchAndShare(recapExportUrl(classId), `Rekap_${className || "Kelas"}`, "xlsx");
}

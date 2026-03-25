import { supabaseConfig } from "./config.js";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);

export class StorageManager {
  constructor() {
    this.bucketName = supabaseConfig.bucketName;
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async uploadFile(file, userId, onProgress) {
    const safeName = this.sanitizeFilename(file.name);
    const filePath = `${userId}/${Date.now()}_${safeName}`;
    try {
      if (onProgress) onProgress(0);
      const { error } = await supabaseClient.storage
        .from(this.bucketName)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabaseClient.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      if (onProgress) onProgress(100);
      return { path: filePath, url: urlData.publicUrl };
    } catch (err) {
      console.error("Supabase upload error:", err);
      throw new Error(err.message || "Failed to upload file.");
    }
  }

  async deleteFile(filePath) {
    const { error } = await supabaseClient.storage.from(this.bucketName).remove([filePath]);
    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error(error.message || "Failed to delete file.");
    }
  }

  async downloadFile(filePath) {
    const { data, error } = await supabaseClient.storage.from(this.bucketName).download(filePath);
    if (error) {
      console.error("Supabase download error:", error);
      throw new Error(error.message || "Failed to download file.");
    }
    return data;
  }

  getFileIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const iconMap = {
      pdf: "pdf", doc: "doc", docx: "doc",
      xls: "excel", xlsx: "excel",
      ppt: "ppt", pptx: "ppt",
      jpg: "image", jpeg: "image", png: "image", gif: "image", svg: "image",
      mp4: "video", avi: "video", mov: "video",
      mp3: "audio", wav: "audio",
      zip: "archive", rar: "archive",
      txt: "text", csv: "excel",
    };
    return iconMap[ext] || "file";
  }

  getFontAwesomeIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const iconMap = {
      pdf: "fa-file-pdf",
      doc: "fa-file-word", docx: "fa-file-word",
      xls: "fa-file-excel", xlsx: "fa-file-excel",
      ppt: "fa-file-powerpoint", pptx: "fa-file-powerpoint",
      jpg: "fa-file-image", jpeg: "fa-file-image", png: "fa-file-image",
      gif: "fa-file-image", svg: "fa-file-image",
      mp4: "fa-file-video", avi: "fa-file-video", mov: "fa-file-video",
      mp3: "fa-file-audio", wav: "fa-file-audio",
      zip: "fa-file-zipper", rar: "fa-file-zipper",
      txt: "fa-file-lines", csv: "fa-file-csv",
      js: "fa-file-code", html: "fa-file-code", css: "fa-file-code", json: "fa-file-code",
    };
    return iconMap[ext] || "fa-file";
  }
}

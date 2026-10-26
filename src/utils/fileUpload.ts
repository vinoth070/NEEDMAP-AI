import type { ComplaintAttachment, UserRole } from '../types/needmap';

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const MAX_ATTACHMENT_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB per file for local storage safety
export const MAX_ATTACHMENTS_PER_STAGE = 4;

export interface FileValidationResult {
  ok: boolean;
  attachment?: ComplaintAttachment;
  error?: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode attachment.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Safely downscales large raster images in-browser so user camera photos succeed
 * without exhausting localStorage quotas, while keeping PDFs untouched.
 */
async function compressImageIfNeeded(file: File): Promise<{ dataUrl: string; sizeBytes: number }> {
  const rawDataUrl = await readAsDataUrl(file);
  if (!file.type.startsWith('image/') || file.size <= 450 * 1024) {
    return { dataUrl: rawDataUrl, sizeBytes: file.size };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: rawDataUrl, sizeBytes: file.size });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        const approxBytes = Math.round((compressed.length * 3) / 4);
        resolve({ dataUrl: compressed, sizeBytes: approxBytes });
      } catch {
        resolve({ dataUrl: rawDataUrl, sizeBytes: file.size });
      }
    };
    img.onerror = () => resolve({ dataUrl: rawDataUrl, sizeBytes: file.size });
    img.src = rawDataUrl;
  });
}

export async function validateAndProcessUpload(params: {
  file: File;
  actorRole: UserRole;
  actorName: string;
  stage: 'submission' | 'followup' | 'resolution';
  visibility: 'reporter_and_staff' | 'public_summary';
}): Promise<FileValidationResult> {
  const { file, actorRole, actorName, stage, visibility } = params;

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type "${file.type || file.name}". Allowed formats: JPG, PNG, WEBP, and PDF (executable/script files are blocked).`,
    };
  }

  // Allow up to 5MB raw images if compressible, strict 1.5MB on PDFs
  const maxRawBytes = file.type.startsWith('image/')
    ? 5 * 1024 * 1024
    : MAX_ATTACHMENT_SIZE_BYTES;

  if (file.size > maxRawBytes) {
    return {
      ok: false,
      error: `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the ${
        file.type.startsWith('image/') ? '5 MB image' : '1.5 MB PDF'
      } limit for local browser storage.`,
    };
  }

  try {
    const processed = await compressImageIfNeeded(file);
    if (processed.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      return {
        ok: false,
        error: `Processed file "${file.name}" exceeds the 1.5 MB storage cap. Choose a smaller file.`,
      };
    }

    const sanitizedName = file.name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80);

    return {
      ok: true,
      attachment: {
        id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: sanitizedName,
        mimeType: file.type.startsWith('image/') && processed.sizeBytes !== file.size
          ? 'image/jpeg'
          : file.type,
        sizeBytes: processed.sizeBytes,
        dataUrl: processed.dataUrl,
        uploadedByRole: actorRole,
        uploadedByName: actorName,
        uploadedAt: new Date().toISOString(),
        visibility,
        stage,
      },
    };
  } catch {
    return {
      ok: false,
      error: `Failed to read "${file.name}". Please retry with another file.`,
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

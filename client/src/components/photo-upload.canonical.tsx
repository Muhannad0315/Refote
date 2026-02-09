import { useState, useRef } from "react";
import { X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import LocalizedText from "@/components/LocalizedText";
import supabase from "@/lib/supabaseClient";

interface PhotoUploadProps {
  photoUrl?: string;
  onPhotoChange?: (url: string | undefined) => void;
  value?: string;
  onChange?: (url: string | undefined) => void;
  title?: string;
  hint?: string;
  // optional callbacks to report upload state/errors to parent
  onUploadError?: (message: string) => void;
  onUploading?: (isUploading: boolean) => void;
}

export function PhotoUpload({
  photoUrl,
  onPhotoChange,
  value,
  onChange,
  title,
  hint,
}: PhotoUploadProps) {
  const initial = photoUrl ?? value;
  const [preview, setPreview] = useState<string | undefined>(initial);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();

  const uploadToStorage = async (blob: Blob) => {
    const BUCKET = "check-ins";
    let userId: string | null = null;
    try {
      const s = await supabase.auth.getSession();
      userId = (s as any)?.data?.session?.user?.id ?? null;
    } catch (_) {
      userId = null;
    }
    const filename = `${userId ?? "anonymous"}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    let publicUrl = (pub as any)?.publicUrl ?? null;
    if (!publicUrl) {
      const { data: signed, error: signedErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filename, 60 * 60);
      if (signedErr) throw signedErr;
      publicUrl = (signed as any)?.signedURL ?? null;
    }

    if (!publicUrl) throw new Error("Unable to obtain storage URL");

    if (fileInputRef.current)
      (fileInputRef.current as any).__uploadedPath = filename;
    return publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(undefined);
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = async () => {
        try {
          const MAX_DIM = 1200;
          let { width, height } = img as any;
          let targetW = width;
          let targetH = height;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              targetW = MAX_DIM;
              targetH = Math.round((height / width) * MAX_DIM);
            } else {
              targetH = MAX_DIM;
              targetW = Math.round((width / height) * MAX_DIM);
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          const blob = await (await fetch(resizedDataUrl)).blob();

          // signal uploading
          try {
            onUploading?.(true);
          } catch (_) {}

          const publicUrl = await uploadToStorage(blob);
          setPreview(publicUrl);
          const cb = onPhotoChange ?? onChange;
          if (cb) cb(publicUrl);

          try {
            onUploading?.(false);
          } catch (_) {}
        } catch (err: any) {
          console.error("PhotoUpload upload failed:", err);
          const msg = (t("checkIn.uploadError") as string) ?? "Upload failed";
          setError(msg);
          try {
            onUploadError?.(msg);
          } catch (_) {}
          try {
            onUploading?.(false);
          } catch (_) {}
          // do NOT call onChange or return base64
        }
      };
      img.onerror = () => {
        const msg = (t("checkIn.uploadError") as string) ?? "Upload failed";
        setError(msg);
        try {
          onUploadError?.(msg);
        } catch (_) {}
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (file: File | null) => {
    if (!file) return;
    // reuse existing file input flow by creating a DataTransfer-like event
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      const ev = { target: fileInputRef.current } as any;
      handleFileChange(ev);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleDrop(file);
  };

  const handleRemove = async () => {
    setPreview(undefined);
    setError(undefined);
    const cb = onPhotoChange ?? onChange;
    if (cb) cb(undefined);

    if (fileInputRef.current) {
      const uploadedPath = (fileInputRef.current as any).__uploadedPath as
        | string
        | undefined;
      if (uploadedPath) {
        try {
          await supabase.storage.from("check-ins").remove([uploadedPath]);
        } catch (_) {}
        (fileInputRef.current as any).__uploadedPath = undefined;
      }
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-photo"
      />

      {preview ? (
        <div
          className={`relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-border ${
            isDragging ? "ring-2 ring-primary/60" : ""
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          data-testid="upload-dropzone"
        >
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
            data-testid="img-preview"
            onClick={() => fileInputRef.current?.click()}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            data-testid="button-remove-photo"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-2 left-2">
            <Button
              type="button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-replace-photo"
            >
              <LocalizedText>{t("photo.replace")}</LocalizedText>
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`w-full aspect-video max-w-xs mx-auto flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer ${
            isDragging ? "ring-2 ring-primary/60" : ""
          }`}
          data-testid="button-upload-photo"
        >
          <div className="p-4 rounded-full bg-primary/10">
            <ImagePlus className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              <LocalizedText>{title ?? t("photo.add")}</LocalizedText>
            </p>
            <p className="text-xs text-muted-foreground">
              <LocalizedText>{hint ?? t("photo.dragDrop")}</LocalizedText>
            </p>
          </div>
        </button>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

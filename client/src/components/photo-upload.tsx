import { useState, useRef } from "react";
import { Camera, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface PhotoUploadProps {
  photoUrl?: string;
  onPhotoChange?: (url: string | undefined) => void;
  // support alternate prop names used elsewhere
  value?: string;
  onChange?: (url: string | undefined) => void;
  title?: string;
  hint?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        const cb = onPhotoChange ?? onChange;
        if (cb) cb(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    const cb = onPhotoChange ?? onChange;
    if (cb) cb(undefined);
    if (fileInputRef.current) {
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
        <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
            data-testid="img-preview"
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
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video max-w-xs mx-auto flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
          data-testid="button-upload-photo"
        >
          <div className="p-4 rounded-full bg-primary/10">
            <ImagePlus className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {title ?? t("checkIn.addPhoto")}
            </p>
            <p className="text-xs text-muted-foreground">
              {hint ?? t("checkIn.addPhotoHint")}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

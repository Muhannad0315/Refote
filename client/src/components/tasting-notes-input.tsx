import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const commonTastingNotes = [
  "fruity",
  "nutty",
  "chocolate",
  "caramel",
  "floral",
  "citrus",
  "berry",
  "spicy",
  "earthy",
  "smooth",
  "bold",
  "sweet",
  "bitter",
  "creamy",
  "bright",
];

interface TastingNotesInputProps {
  notes: string[];
  onChange: (notes: string[]) => void;
  maxNotes?: number;
}

export function TastingNotesInput({
  notes,
  onChange,
  maxNotes = 5,
}: TastingNotesInputProps) {
  const [customNote, setCustomNote] = useState("");

  const { t } = useI18n();

  const addNote = (note: string) => {
    if (notes.length >= maxNotes) return;
    if (notes.includes(note)) return;
    onChange([...notes, note]);
  };

  const removeNote = (note: string) => {
    onChange(notes.filter((n) => n !== note));
  };

  const handleAddCustom = () => {
    if (customNote.trim() && notes.length < maxNotes) {
      addNote(customNote.trim());
      setCustomNote("");
    }
  };

  const availableNotes = commonTastingNotes.filter((n) => !notes.includes(n));

  return (
    <div className="space-y-4">
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {notes.map((note) => (
            <Badge
              key={note}
              variant="default"
              className="cursor-pointer"
              onClick={() => removeNote(note)}
              data-testid={`badge-note-selected-${note}`}
            >
              {note}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {notes.length < maxNotes && (
        <>
          <div className="flex gap-2">
            <Input
              placeholder={t("tasting.addCustomNotePlaceholder")}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
              className="flex-1"
              data-testid="input-custom-note"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddCustom}
              disabled={!customNote.trim()}
              data-testid="button-add-note"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableNotes.slice(0, 8).map((note) => (
              <Badge
                key={note}
                variant="outline"
                className="cursor-pointer hover-elevate"
                onClick={() => addNote(note)}
                data-testid={`badge-note-available-${note}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t(`note.${note}`) || note}
              </Badge>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {t("tasting.notesCount")
          .replace("{count}", String(notes.length))
          .replace("{max}", String(maxNotes))}
      </p>
    </div>
  );
}

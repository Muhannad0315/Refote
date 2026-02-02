import { Coffee, Leaf, MapPin, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterChip {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export const defaultFilterChips: FilterChip[] = [
  { id: "coffee", label: "Coffee", icon: <Coffee className="h-4 w-4" /> },
  { id: "tea", label: "Tea", icon: <Leaf className="h-4 w-4" /> },
  { id: "nearby", label: "Near Me", icon: <MapPin className="h-4 w-4" /> },
  { id: "trending", label: "Trending", icon: <Flame className="h-4 w-4" /> },
];

export function FilterChips({ chips, selectedIds, onToggle }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {chips.map((chip) => {
        const isSelected = selectedIds.includes(chip.id);
        
        return (
          <Button
            key={chip.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(chip.id)}
            className="flex-shrink-0"
            data-testid={`chip-${chip.id}`}
          >
            {chip.icon}
            <span className="ml-1.5">{chip.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

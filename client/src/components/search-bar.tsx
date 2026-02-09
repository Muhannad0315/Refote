import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { localizedClassForText } from "@/components/LocalizedText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFilterClick?: () => void;
  filters?: string[];
  onFilterRemove?: (filter: string) => void;
}

export function SearchBar({
  placeholder = "Search cafés, roasters, drinks...",
  value = "",
  onChange,
  onFilterClick,
  filters = [],
  onFilterRemove,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange?.("");
  };

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholder}
            value={localValue}
            onChange={handleChange}
            className={`pl-10 pr-10 ${localizedClassForText(placeholder)}`}
            data-testid="input-search"
          />
          {localValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {onFilterClick && (
          <Button
            variant="outline"
            size="icon"
            onClick={onFilterClick}
            data-testid="button-filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge
              key={filter}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onFilterRemove?.(filter)}
              data-testid={`badge-filter-${filter}`}
            >
              {filter}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

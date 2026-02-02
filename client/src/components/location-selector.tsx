import { useState } from "react";
import { Check, ChevronsUpDown, Coffee, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Cafe } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

interface LocationSelectorProps {
  cafes: Cafe[];
  selectedCafe?: Cafe;
  onSelectCafe: (cafe: Cafe) => void;
  onClear: () => void;
}

export function LocationSelector({
  cafes,
  selectedCafe,
  onSelectCafe,
  onClear,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { language } = useI18n();

  const searchLower = search.toLowerCase();

  const filteredCafes = (cafes || []).filter((c) => {
    const nameEn = c.nameEn ?? "";
    const nameAr = c.nameAr ?? "";
    return (
      nameEn.toLowerCase().includes(searchLower) ||
      nameAr.toLowerCase().includes(searchLower)
    );
  });

  const selectedLocation = selectedCafe;
  const selectedType = selectedCafe ? "cafe" : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 py-2"
          data-testid="button-location-selector"
        >
          {selectedLocation ? (
            <div className="flex items-center gap-2">
              {selectedType === "cafe" ? (
                <Coffee className="h-4 w-4 text-primary" />
              ) : (
                <MapPin className="h-4 w-4 text-primary" />
              )}
              <div className="text-left">
                <div>
                  {selectedType === "cafe" ? (
                    <Link
                      href={`/cafe/${
                        (selectedLocation as Cafe).placeId ||
                        (selectedLocation as Cafe).id
                      }`}
                      onClick={(e: any) => {
                        e.stopPropagation();
                        setOpen(false);
                      }}
                    >
                      {language === "ar"
                        ? (selectedLocation as Cafe).nameAr
                        : (selectedLocation as Cafe).nameEn}
                    </Link>
                  ) : (
                    (selectedLocation as any).name
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedType === "cafe"
                    ? language === "ar"
                      ? (selectedLocation as Cafe).cityAr
                      : (selectedLocation as Cafe).cityEn
                    : (selectedLocation as any).location}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {language === "ar" ? "اختر الموقع" : "Select a location..."}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={
              language === "ar" ? "ابحث عن المواقع..." : "Search locations..."
            }
            value={search}
            onValueChange={setSearch}
            data-testid="input-location-search"
          />
          <CommandList>
            <CommandEmpty>
              {language === "ar" ? "لا توجد مواقع." : "No locations found."}
            </CommandEmpty>

            {filteredCafes.length > 0 && (
              <CommandGroup heading={language === "ar" ? "المقاهي" : "Cafés"}>
                {filteredCafes.map((cafe) => (
                  <CommandItem
                    key={cafe.id}
                    value={language === "ar" ? cafe.nameAr : cafe.nameEn}
                    onSelect={() => {
                      onSelectCafe(cafe);
                      setOpen(false);
                    }}
                    data-testid={`item-cafe-${cafe.id}`}
                  >
                    <Coffee className="h-4 w-4 mr-2 text-primary" />
                    <div className="flex-1">
                      <div>{language === "ar" ? cafe.nameAr : cafe.nameEn}</div>
                      <div className="text-xs text-muted-foreground">
                        {language === "ar" ? cafe.cityAr : cafe.cityEn}
                      </div>
                    </div>
                    {selectedCafe?.id === cafe.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Roasters removed */}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

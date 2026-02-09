import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Check, ChevronsUpDown, Coffee, Leaf, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocalizedText, {
  localizedClassForText,
} from "@/components/LocalizedText";
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
import type { Drink } from "@shared/schema";

interface DrinkSelectorProps {
  drinks: Drink[];
  selectedDrinkName?: string; // Display name of the drink
  onSelect: (drinkName: string, isCustom?: boolean) => void;
  onCreateNew?: (name: string, type: "coffee" | "tea") => void;
}

export function DrinkSelector({
  drinks,
  selectedDrinkName,
  onSelect,
  onCreateNew,
}: DrinkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDrinkName, setCustomDrinkName] = useState("");

  const { t, language } = useI18n();

  const coffeeDrinks = drinks.filter((d) => d.type === "coffee");
  const teaDrinks = drinks.filter((d) => d.type === "tea");

  const filteredCoffee = coffeeDrinks.filter((d) => {
    const translated = t(`drink.${d.id}`) || d.name;
    return (
      translated.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase())
    );
  });
  const filteredTea = teaDrinks.filter((d) => {
    const translated = t(`drink.${d.id}`) || d.name;
    return (
      translated.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const noResults =
    filteredCoffee.length === 0 &&
    filteredTea.length === 0 &&
    search.length > 0;

  const handleCustomDrinkSubmit = () => {
    if (customDrinkName.trim()) {
      onSelect(customDrinkName.trim(), true);
      setCustomDrinkName("");
      setShowCustomInput(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 py-2"
          data-testid="button-drink-selector"
        >
          {selectedDrinkName ? (
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-primary" />
              <LocalizedText>{selectedDrinkName}</LocalizedText>
            </div>
          ) : (
            <span className="text-muted-foreground">
              <LocalizedText>{t("drink.selectPlaceholder")}</LocalizedText>
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("drink.searchPlaceholder")}
            className={localizedClassForText(t("drink.searchPlaceholder"))}
            value={search}
            onValueChange={setSearch}
            data-testid="input-drink-search"
          />
          <CommandList>
            {showCustomInput ? (
              <CommandEmpty>
                <div className="p-4 space-y-2">
                  <input
                    type="text"
                    placeholder={
                      language === "ar"
                        ? "اسم المشروب المخصص"
                        : "Custom drink name"
                    }
                    value={customDrinkName}
                    onChange={(e) => setCustomDrinkName(e.target.value)}
                    className={`w-full px-2 py-1 border rounded text-sm ${localizedClassForText(
                      language === "ar"
                        ? "اسم المشروب المخصص"
                        : "Custom drink name",
                    )}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCustomDrinkSubmit();
                      } else if (e.key === "Escape") {
                        setShowCustomInput(false);
                      }
                    }}
                    data-testid="input-custom-drink"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCustomDrinkSubmit}
                      className="flex-1"
                      data-testid="button-confirm-custom"
                    >
                      <LocalizedText>
                        {language === "ar" ? "تأكيد" : "Confirm"}
                      </LocalizedText>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomDrinkName("");
                      }}
                      className="flex-1"
                    >
                      <LocalizedText>
                        {language === "ar" ? "إلغاء" : "Cancel"}
                      </LocalizedText>
                    </Button>
                  </div>
                </div>
              </CommandEmpty>
            ) : noResults ? (
              <CommandEmpty>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <LocalizedText>{t("drink.noResults")}</LocalizedText>
                  </p>
                  {search && onCreateNew && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onCreateNew(search, "coffee");
                          setOpen(false);
                          setSearch("");
                        }}
                        data-testid="button-create-coffee"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <Coffee className="h-3 w-3 mr-1" />
                        <LocalizedText>{t("drink.addAsCoffee")}</LocalizedText>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onCreateNew(search, "tea");
                          setOpen(false);
                          setSearch("");
                        }}
                        data-testid="button-create-tea"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <Leaf className="h-3 w-3 mr-1" />
                        <LocalizedText>{t("drink.addAsTea")}</LocalizedText>
                      </Button>
                    </div>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <>
                {filteredCoffee.length > 0 && (
                  <CommandGroup heading={language === "ar" ? "قهوة" : "Coffee"}>
                    {filteredCoffee.map((drink) => {
                      const displayName = t(`drink.${drink.id}`) || drink.name;
                      return (
                        <CommandItem
                          key={drink.id}
                          value={displayName}
                          onSelect={() => {
                            onSelect(displayName);
                            setOpen(false);
                          }}
                          data-testid={`item-drink-${drink.id}`}
                        >
                          <Coffee className="h-4 w-4 mr-2 text-primary" />
                          <LocalizedText>{displayName}</LocalizedText>
                          {selectedDrinkName === displayName && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {filteredTea.length > 0 && (
                  <CommandGroup heading={language === "ar" ? "شاي" : "Tea"}>
                    {filteredTea.map((drink) => {
                      const displayName = t(`drink.${drink.id}`) || drink.name;
                      return (
                        <CommandItem
                          key={drink.id}
                          value={displayName}
                          onSelect={() => {
                            onSelect(displayName);
                            setOpen(false);
                          }}
                          data-testid={`item-drink-${drink.id}`}
                        >
                          <Leaf className="h-4 w-4 mr-2 text-green-600" />
                          <LocalizedText>{displayName}</LocalizedText>
                          {selectedDrinkName === displayName && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}

            {/* "Other" option - always visible unless in custom input mode */}
            {!showCustomInput && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => setShowCustomInput(true)}
                  className="cursor-pointer"
                  data-testid="item-drink-other"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <LocalizedText>
                    {language === "ar" ? "مشروب آخر" : "Other"}
                  </LocalizedText>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

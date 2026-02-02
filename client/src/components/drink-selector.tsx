import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Check, ChevronsUpDown, Coffee, Leaf, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  selectedDrink?: Drink;
  onSelect: (drink: Drink) => void;
  onCreateNew?: (name: string, type: "coffee" | "tea") => void;
}

export function DrinkSelector({
  drinks,
  selectedDrink,
  onSelect,
  onCreateNew,
}: DrinkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

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
          {selectedDrink ? (
            <div className="flex items-center gap-2">
              {selectedDrink.type === "coffee" ? (
                <Coffee className="h-4 w-4 text-primary" />
              ) : (
                <Leaf className="h-4 w-4 text-green-600" />
              )}
              <span>
                {t(`drink.${selectedDrink.id}`) || selectedDrink.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {t("drink.selectPlaceholder")}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("drink.searchPlaceholder")}
            value={search}
            onValueChange={setSearch}
            data-testid="input-drink-search"
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("drink.noResults")}
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
                      {t("drink.addAsCoffee")}
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
                      {t("drink.addAsTea")}
                    </Button>
                  </div>
                )}
              </div>
            </CommandEmpty>

            {filteredCoffee.length > 0 && (
              <CommandGroup heading={language === "ar" ? "قهوة" : "Coffee"}>
                {filteredCoffee.map((drink) => (
                  <CommandItem
                    key={drink.id}
                    value={drink.name}
                    onSelect={() => {
                      onSelect(drink);
                      setOpen(false);
                    }}
                    data-testid={`item-drink-${drink.id}`}
                  >
                    <Coffee className="h-4 w-4 mr-2 text-primary" />
                    <span>{t(`drink.${drink.id}`) || drink.name}</span>
                    {selectedDrink?.id === drink.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredTea.length > 0 && (
              <CommandGroup heading={language === "ar" ? "شاي" : "Tea"}>
                {filteredTea.map((drink) => (
                  <CommandItem
                    key={drink.id}
                    value={drink.name}
                    onSelect={() => {
                      onSelect(drink);
                      setOpen(false);
                    }}
                    data-testid={`item-drink-${drink.id}`}
                  >
                    <Leaf className="h-4 w-4 mr-2 text-green-600" />
                    <span>{t(`drink.${drink.id}`) || drink.name}</span>
                    {selectedDrink?.id === drink.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

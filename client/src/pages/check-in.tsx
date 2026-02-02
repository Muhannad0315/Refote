import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DrinkSelector } from "@/components/drink-selector";
import { LocationSelector } from "@/components/location-selector";
import { RatingStars } from "@/components/rating-stars";
import { TastingNotesInput } from "@/components/tasting-notes-input";
import { PhotoUpload } from "@/components/photo-upload";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Drink, Cafe, CheckInWithDetails } from "@shared/schema";

export default function CheckIn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language, isRTL } = useI18n();
  // Build the form schema with localized validation messages
  const checkInFormSchema = z.object({
    drinkId: z.string().min(1, t("validation.selectDrink")),
    rating: z.number().min(0.5, t("validation.rateDrink")).max(5),
    notes: z.string().optional(),
    tastingNotes: z.array(z.string()).optional(),
    photoUrl: z.string().optional(),
    cafeId: z.string().min(1, t("validation.selectCafe")),
  });

  type CheckInFormValues = z.infer<typeof checkInFormSchema>;
  const [selectedDrink, setSelectedDrink] = useState<Drink | undefined>();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | undefined>();

  const { data: drinks = [] } = useQuery<Drink[]>({
    queryKey: ["/api/drinks"],
  });

  const { data: cafes = [] } = useQuery<Cafe[]>({
    queryKey: ["/api/cafes", language],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("lang", language === "ar" ? "ar" : "en");
      const res = await fetch(`/api/cafes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cafes");
      return res.json();
    },
  });

  // Lock the location selector when `cafeId` is present in the URL (user
  // clicked "Check In" from a cafe in Discover). This prevents changing
  // the selection — we'll render a static display instead of the dropdown.
  const _initialParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const _initialCafeId = _initialParams.get("cafeId");
  // start unlocked; we'll lock only if we successfully resolve the cafe
  const [lockLocation, setLockLocation] = useState<boolean>(false);

  // If the user navigated from a cafe/roaster card it will include a query
  // parameter like `?cafeId=...` or `?roasterId=...`. Read those and
  // pre-select the appropriate location once the lists are loaded.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cafeId = params.get("cafeId");
      const roasterId = params.get("roasterId");

      if (cafeId && cafes.length > 0) {
        const found = cafes.find(
          (c) =>
            String(c.id) === String(cafeId) ||
            String((c as any).placeId) === String(cafeId),
        );
        if (found) {
          handleCafeSelect(found);
          setLockLocation(true);
          return;
        } else {
          // no matching cafe found — don't lock the selector
          setLockLocation(false);
        }
      }
      // roasters removed — ignore roasterId fallback
    } catch (e) {
      // ignore
    }
  }, [cafes]);

  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues: {
      drinkId: "",
      rating: 0,
      notes: "",
      tastingNotes: [],
      photoUrl: "",
      cafeId: "",
    },
  });

  // Editing existing check-in if `editId` query param is present
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const editId = params.get("editId");

  const { data: editCheckIn } = useQuery<CheckInWithDetails>({
    queryKey: ["/api/check-ins", editId],
    enabled: Boolean(editId),
    queryFn: async () => {
      const res = await fetch(
        `/api/check-ins/${encodeURIComponent(editId || "")}`,
      );
      if (!res.ok) throw new Error("Failed to load check-in");
      return (await res.json()) as CheckInWithDetails;
    },
  });

  useEffect(() => {
    if (!editCheckIn) return;
    const data = editCheckIn;
    // populate form
    setSelectedDrink({
      id: data.drink.id,
      name: data.drink.name,
      type: data.drink.type,
      style: data.drink.style,
      description: data.drink.description,
    } as any);
    form.setValue("drinkId", data.drink.id);
    form.setValue("rating", data.rating);
    form.setValue("notes", data.notes || "");
    form.setValue("tastingNotes", data.tastingNotes || []);
    form.setValue("photoUrl", data.photoUrl || "");
    if (data.cafe) {
      setSelectedCafe(data.cafe);
      form.setValue("cafeId", data.cafe.id);
    }
  }, [editCheckIn]);

  const updateCheckInMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: CheckInFormValues;
    }) => {
      const payload: any = { ...values };
      if (selectedCafe) {
        payload.cafe = {
          placeId: selectedCafe.placeId ?? selectedCafe.id,
          nameEn:
            (selectedCafe as any).nameEn || (selectedCafe as any).nameAr || "",
          nameAr:
            (selectedCafe as any).nameAr || (selectedCafe as any).nameEn || "",
          addressEn:
            (selectedCafe as any).addressEn ||
            (selectedCafe as any).addressAr ||
            "",
          addressAr:
            (selectedCafe as any).addressAr ||
            (selectedCafe as any).addressEn ||
            "",
          cityEn: (selectedCafe as any).cityEn || "",
          cityAr: (selectedCafe as any).cityAr || "",
          latitude: (selectedCafe as any).latitude ?? null,
          longitude: (selectedCafe as any).longitude ?? null,
          rating: (selectedCafe as any).rating ?? null,
          reviews: (selectedCafe as any).reviews ?? null,
          imageUrl:
            (selectedCafe as any).photoUrl ||
            (selectedCafe as any).imageUrl ||
            null,
          description: null,
          specialty: null,
        };
      }
      return apiRequest("PUT", `/api/check-ins/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      // refresh cafes so top-drinks update
      queryClient.invalidateQueries({ queryKey: ["/api/cafes"] });
      if (selectedCafe) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/cafes",
            (selectedCafe as any).placeId || (selectedCafe as any).id,
          ],
        });
      }
      toast({
        title: language === "ar" ? "تم التحديث!" : "Check-in updated!",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar"
            ? "فشل في تحديث التسجيل. حاول مرة أخرى."
            : "Failed to update check-in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createCheckInMutation = useMutation({
    mutationFn: async (values: CheckInFormValues) => {
      const payload: any = { ...values };
      if (selectedCafe) {
        payload.cafe = {
          placeId: selectedCafe.placeId ?? selectedCafe.id,
          nameEn:
            (selectedCafe as any).nameEn || (selectedCafe as any).nameAr || "",
          nameAr:
            (selectedCafe as any).nameAr || (selectedCafe as any).nameEn || "",
          addressEn:
            (selectedCafe as any).addressEn ||
            (selectedCafe as any).addressAr ||
            "",
          addressAr:
            (selectedCafe as any).addressAr ||
            (selectedCafe as any).addressEn ||
            "",
          cityEn: (selectedCafe as any).cityEn || "",
          cityAr: (selectedCafe as any).cityAr || "",
          latitude: (selectedCafe as any).latitude ?? null,
          longitude: (selectedCafe as any).longitude ?? null,
          rating: (selectedCafe as any).rating ?? null,
          reviews: (selectedCafe as any).reviews ?? null,
          imageUrl:
            (selectedCafe as any).photoUrl ||
            (selectedCafe as any).imageUrl ||
            null,
          description: null,
          specialty: null,
        };
      }
      return apiRequest("POST", "/api/check-ins", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      // ensure cafe lists and details refresh so top-drinks reflect new check-ins
      queryClient.invalidateQueries({ queryKey: ["/api/cafes"] });
      if (selectedCafe) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/cafes",
            (selectedCafe as any).placeId || (selectedCafe as any).id,
          ],
        });
      }
      toast({
        title: language === "ar" ? "تم التسجيل!" : "Check-in complete!",
        description:
          language === "ar"
            ? "تم تسجيل مشروبك بنجاح."
            : "Your drink has been logged successfully.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar"
            ? "فشل في إنشاء التسجيل. حاول مرة أخرى."
            : "Failed to create check-in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createDrinkMutation = useMutation({
    mutationFn: async ({
      name,
      type,
    }: {
      name: string;
      type: "coffee" | "tea";
    }) => {
      const res = await apiRequest("POST", "/api/drinks", { name, type });
      return res.json() as Promise<Drink>;
    },
    onSuccess: (data: Drink) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks"] });
      setSelectedDrink(data);
      form.setValue("drinkId", data.id);
    },
  });

  const handleDrinkSelect = (drink: Drink) => {
    setSelectedDrink(drink);
    form.setValue("drinkId", drink.id);
  };

  const handleCafeSelect = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    form.setValue("cafeId", cafe.id);
  };
  const handleLocationClear = () => {
    setSelectedCafe(undefined);
    form.setValue("cafeId", "");
  };

  const handleCreateDrink = (name: string, type: "coffee" | "tea") => {
    createDrinkMutation.mutate({ name, type });
  };

  const onSubmit = (values: CheckInFormValues) => {
    if (editId) {
      updateCheckInMutation.mutate({ id: editId, values });
    } else {
      createCheckInMutation.mutate(values);
    }
  };

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="relative">
          <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <a
              href="/"
              className="pointer-events-auto font-serif text-xl font-bold"
            >
              Cafnote
            </a>
          </div>
          <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
              </Button>
              <h1
                className="font-serif text-xl font-bold"
                data-testid="text-checkin-title"
              >
                {t("checkIn.title")}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PhotoUpload
                      photoUrl={field.value}
                      onPhotoChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drinkId"
              render={() => (
                <FormItem>
                  <FormLabel>{t("checkIn.selectDrink")}</FormLabel>
                  <FormControl>
                    <DrinkSelector
                      drinks={drinks}
                      selectedDrink={selectedDrink}
                      onSelect={handleDrinkSelect}
                      onCreateNew={handleCreateDrink}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("checkIn.rating")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <RatingStars
                        rating={field.value}
                        size="lg"
                        interactive
                        onRatingChange={field.onChange}
                      />
                      {field.value > 0 && (
                        <span className="text-lg font-medium">
                          {field.value.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cafeId"
              render={() => (
                <FormItem>
                  <FormLabel>
                    {language === "ar" ? "الموقع" : "Location"}
                  </FormLabel>
                  <FormControl>
                    {lockLocation && selectedCafe ? (
                      <div className="flex items-center gap-2 p-2 rounded border border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-primary">
                            {/* use coffee icon for cafe */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18 3H6a2 2 0 00-2 2v7a5 5 0 005 5h3a5 5 0 005-5V5a2 2 0 00-2-2z" />
                              <path d="M7 21h10v-2H7v2z" />
                            </svg>
                          </span>
                          <div className="text-left">
                            <div>
                              {/* show localized name with fallbacks */}
                              <a
                                href={`/cafe/${
                                  selectedCafe.placeId || selectedCafe.id
                                }`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-block"
                              >
                                {language === "ar"
                                  ? selectedCafe.nameAr || selectedCafe.nameEn
                                  : selectedCafe.nameEn || selectedCafe.nameAr}
                              </a>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {language === "ar"
                                ? selectedCafe.cityAr
                                : selectedCafe.cityEn}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <LocationSelector
                        cafes={cafes}
                        selectedCafe={selectedCafe}
                        onSelectCafe={handleCafeSelect}
                        onClear={handleLocationClear}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {language === "ar"
                      ? "ملاحظات (اختياري)"
                      : "Notes (optional)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("checkIn.notesPlaceholder")}
                      className="resize-none min-h-[100px]"
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tastingNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("checkIn.tastingNotes")}</FormLabel>
                  <FormControl>
                    <TastingNotesInput
                      notes={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                createCheckInMutation.isPending ||
                updateCheckInMutation.isPending
              }
              data-testid="button-submit-checkin"
            >
              {createCheckInMutation.isPending ||
              updateCheckInMutation.isPending ? (
                language === "ar" ? (
                  "جاري التسجيل..."
                ) : editId ? (
                  "Updating..."
                ) : (
                  "Checking in..."
                )
              ) : (
                <>
                  <Check className="h-5 w-5 me-2" />
                  {editId
                    ? language === "ar"
                      ? "تحديث"
                      : "Update"
                    : t("checkIn.submit")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}

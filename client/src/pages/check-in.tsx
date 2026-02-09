import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
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
import { PhotoUpload } from "@/components/photo-upload.canonical";
import supabase from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { localizedClassForText } from "@/components/LocalizedText";
import LocalizedText from "@/components/LocalizedText";
import TopHeader from "@/components/top-header";
import BackButton from "@/components/back-button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
// Language and theme toggles are provided by TopHeader
import { DrinkSelector } from "@/components/drink-selector";
import { RatingStars } from "@/components/rating-stars";
import { LocationSelector } from "@/components/location-selector";
import { TastingNotesInput } from "@/components/tasting-notes-input";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Drink, Cafe, CheckInWithDetails } from "@shared/schema";

export default function CheckIn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language, isRTL } = useI18n();
  const handleMutationError = (err: unknown, fallbackDescription: string) => {
    try {
      const raw = String((err as any)?.message ?? err ?? "");
      const match = raw.match(/^(\d{3}):\s*(.*)$/);
      const status = match ? Number(match[1]) : null;
      const body = match ? match[2] : raw;
      let message = body || fallbackDescription;
      try {
        const parsed = JSON.parse(body);
        message = parsed?.error || parsed?.message || message;
      } catch (_) {
        // not JSON — keep body as-is
      }
      toast({
        title: t("common.error"),
        description: message || fallbackDescription,
        variant: "destructive",
      });
      if (status === 403) {
        navigate("/profile/complete");
      }
    } catch (e) {
      toast({
        title: t("common.error"),
        description: fallbackDescription,
        variant: "destructive",
      });
    }
  };
  const requireAuth = useRequireAuth();
  // Build the form schema with localized validation messages
  const checkInFormSchema = z.object({
    drinkId: z.string().min(1, t("validation.selectDrink")), // Now stores drink name
    temperature: z.enum(["Hot", "Cold"]), // Required temperature
    rating: z.number().min(0.5, t("validation.rateDrink")).max(5),
    notes: z.string().optional(),
    tastingNotes: z.array(z.string()).optional(),
    photoUrl: z.string().optional(),
    cafeId: z.string().min(1, t("validation.selectCafe")),
  });

  type CheckInFormValues = z.infer<typeof checkInFormSchema>;
  const [selectedDrinkName, setSelectedDrinkName] = useState<
    string | undefined
  >();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | undefined>();
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);

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
      temperature: undefined,
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
      const res = await apiRequest(
        "GET",
        `/api/check-ins/${encodeURIComponent(editId || "")}`,
      );
      return (await res.json()) as CheckInWithDetails;
    },
  });

  useEffect(() => {
    if (!editCheckIn) return;
    const data = editCheckIn;
    // populate form with drink name (not ID) and other fields
    setSelectedDrinkName(data.drink.name);
    form.setValue("drinkId", data.drink.name);
    const temp = (data as any).temperature as "Hot" | "Cold" | undefined;
    if (temp !== undefined) {
      form.setValue("temperature", temp as "Hot" | "Cold");
    }
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
      // ensure we have an access token before calling protected API
      try {
        const session = await supabase.auth.getSession();
        // removed verbose session debug
        const token = session?.data?.session?.access_token;
        if (!token) throw new Error('401: {"error":"Missing auth token"}');
      } catch (e) {
        throw new Error('401: {"error":"Missing auth token"}');
      }
      const payload: any = { ...values };
      try {
        console.info("updateCheckIn payload (before API):", {
          drinkId: payload.drinkId,
          temperature: payload.temperature,
          rating: payload.rating,
        });
      } catch (_) {}
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
      const res = await apiRequest("PUT", `/api/check-ins/${id}`, payload);
      return res.json();
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
        title: t("checkIn.updated"),
      });
      navigate("/");
    },
    onError: (err: unknown) => {
      handleMutationError(err, t("error.updateCheckIn"));
    },
  });

  const createCheckInMutation = useMutation({
    mutationFn: async (values: CheckInFormValues) => {
      // ensure we have an access token before calling protected API
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) throw new Error('401: {"error":"Missing auth token"}');
      } catch (e) {
        throw new Error('401: {"error":"Missing auth token"}');
      }

      const payload: any = { ...values };
      try {
        console.info("createCheckIn payload (before API):", {
          drinkId: payload.drinkId,
          temperature: payload.temperature,
          rating: payload.rating,
        });
      } catch (_) {}
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
      const res = await apiRequest("POST", "/api/check-ins", payload);
      return res.json();
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
        title: t("checkIn.createdTitle"),
        description: t("checkIn.createdDescription"),
      });
      navigate("/");
    },
    onError: (err: unknown) => {
      handleMutationError(err, t("error.createCheckIn"));
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
      // Use the drink name from the response (display name)
      const displayName = data.name;
      setSelectedDrinkName(displayName);
      form.setValue("drinkId", displayName);
    },
  });

  const handleDrinkSelect = (drinkName: string) => {
    setSelectedDrinkName(drinkName);
    form.setValue("drinkId", drinkName);
  };

  const temperatureValue = form.watch("temperature");

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

  const onSubmit = async (values: CheckInFormValues) => {
    const ok = await requireAuth();
    if (!ok) return;
    if (photoUploading) {
      toast({
        title: t("photo.uploadInProgressTitle"),
        description: t("photo.uploadInProgressDescription"),
        variant: "destructive",
      });
      return;
    }
    if (photoUploadError) {
      toast({
        title: t("photo.uploadErrorTitle"),
        description: photoUploadError,
        variant: "destructive",
      });
      return;
    }
    if (editId) {
      updateCheckInMutation.mutate({ id: editId, values });
    } else {
      createCheckInMutation.mutate(values);
    }
  };

  // If the user landed directly on the check-in page, ensure unauthenticated
  // visitors are redirected to signup only after auth state is resolved.
  useEffect(() => {
    (async () => {
      await requireAuth();
    })();
  }, []);

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        title={t("checkIn.title")}
        leftIcon={<Check className="h-4 w-4 text-primary" />}
      />
      {/* Back button must live below the header (not inside it) */}
      <BackButton onClick={() => navigate("/")} testId="button-back" />

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
                  <FormLabel>
                    <LocalizedText>{t("checkIn.selectDrink")}</LocalizedText>
                  </FormLabel>
                  <FormControl>
                    <DrinkSelector
                      drinks={drinks}
                      selectedDrinkName={selectedDrinkName}
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
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <LocalizedText>{t("checkIn.temperature")}</LocalizedText>
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange("Hot")}
                        className={`flex-1 py-2 px-3 rounded border transition-colors ${
                          field.value === "Hot"
                            ? "bg-orange-100 border-orange-300 text-orange-700"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <LocalizedText>
                          {t("cafe.temperature.hot")}
                        </LocalizedText>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("Cold")}
                        className={`flex-1 py-2 px-3 rounded border transition-colors ${
                          field.value === "Cold"
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <LocalizedText>
                          {t("cafe.temperature.cold")}
                        </LocalizedText>
                      </button>
                    </div>
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
                  <FormLabel>
                    <LocalizedText>{t("checkIn.rating")}</LocalizedText>
                  </FormLabel>
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
                    <LocalizedText>{t("checkIn.selectLocation")}</LocalizedText>
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
                                <LocalizedText>
                                  {language === "ar"
                                    ? selectedCafe.nameAr || selectedCafe.nameEn
                                    : selectedCafe.nameEn ||
                                      selectedCafe.nameAr}
                                </LocalizedText>
                              </a>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <LocalizedText>
                                {language === "ar"
                                  ? selectedCafe.cityAr
                                  : selectedCafe.cityEn}
                              </LocalizedText>
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
                    <LocalizedText>{t("checkIn.notes")}</LocalizedText>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("checkIn.notesPlaceholder")}
                      className={`resize-none min-h-[100px] ${localizedClassForText(
                        t("checkIn.notesPlaceholder"),
                      )}`}
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
                  <FormLabel>
                    <LocalizedText>{t("checkIn.tastingNotes")}</LocalizedText>
                  </FormLabel>
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
                updateCheckInMutation.isPending ||
                !temperatureValue
              }
              data-testid="button-submit-checkin"
            >
              {createCheckInMutation.isPending ||
              updateCheckInMutation.isPending ? (
                <LocalizedText>{t("common.loading")}</LocalizedText>
              ) : (
                <>
                  <Check className="h-5 w-5 me-2" />
                  <LocalizedText>
                    {editId ? t("checkIn.update") : t("checkIn.submit")}
                  </LocalizedText>
                </>
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}

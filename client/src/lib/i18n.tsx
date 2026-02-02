import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Language = "ar" | "en";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.discover": "Discover",
    "nav.checkIn": "Check In",
    "nav.activity": "Activity",
    "nav.profile": "Profile",

    // Common
    "common.search": "Search",
    "common.filter": "Filter",
    "common.all": "All",
    "common.nearby": "Nearby",
    "common.km": "km",
    "common.loading": "Loading...",
    "common.noResults": "No results found",
    "common.error": "Something went wrong",
    "common.retry": "Retry",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.changePhoto": "Change Photo",
    "common.remove": "Remove",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.follow": "Follow",
    "common.following": "Following",
    "common.submit": "Submit",
    "common.back": "Back",

    // Discover page
    "discover.title": "Discover",
    "discover.searchPlaceholder": "Search cafes...",
    "discover.cafes": "Cafes",
    "discover.roasters": "Roasters",
    "discover.nearYou": "Near You",
    "discover.allCities": "All Cities",
    "discover.selectCity": "Select City",
    "discover.locationRequired": "Enable location to see nearby cafes",
    "discover.enableLocation": "Enable Location",
    "discover.locationDenied": "Location access denied. Showing cafes by city.",
    "discover.noCafesFound": "No cafes found",
    "discover.cafesIn": "Cafes in",

    // Cities
    "city.jeddah": "Jeddah",
    "city.medina": "Medina",
    "city.riyadh": "Riyadh",

    // Check-in page
    "checkIn.title": "Check In",
    "checkIn.selectDrink": "Select Drink",
    "checkIn.selectLocation": "Select Location",
    "checkIn.rating": "Rating",
    "checkIn.notes": "Notes",
    "checkIn.notesPlaceholder": "How was your drink?",
    "checkIn.addPhoto": "Add Photo",
    "checkIn.addPhotoHint": "Click to upload your drink",
    "checkIn.tastingNotes": "Tasting Notes",
    "checkIn.submit": "Check In",
    "checkIn.success": "Check-in posted!",
    "checkIn.isDrinking": "is drinking",
    // Validation
    "validation.selectDrink": "Please select a drink",
    "validation.rateDrink": "Please rate your drink",
    "validation.selectCafe": "Please select a cafe",

    // Drinks (seeded)
    "drink.drink-1": "Espresso",
    "drink.drink-2": "Cappuccino",
    "drink.drink-3": "Pour Over",
    "drink.drink-4": "Cold Brew",
    "drink.drink-5": "Flat White",
    "drink.drink-6": "Cortado",
    "drink.drink-7": "Latte",
    "drink.drink-8": "Matcha Latte",
    "drink.drink-9": "Earl Grey",
    "drink.drink-10": "Oolong",
    "drink.drink-11": "Chai Latte",
    "drink.drink-12": "Hojicha",
    "drink.selectPlaceholder": "Select a drink...",
    "drink.searchPlaceholder": "Search drinks...",
    "drink.noResults": "No drinks found",
    "drink.addAsCoffee": "Add as Coffee",
    "drink.addAsTea": "Add as Tea",

    // Tasting notes
    "note.fruity": "Fruity",
    "note.nutty": "Nutty",
    "note.chocolate": "Chocolate",
    "note.caramel": "Caramel",
    "note.floral": "Floral",
    "note.citrus": "Citrus",
    "note.berry": "Berry",
    "note.spicy": "Spicy",
    "note.earthy": "Earthy",
    "note.smooth": "Smooth",
    "note.bold": "Bold",
    "note.sweet": "Sweet",
    "note.bitter": "Bitter",
    "note.creamy": "Creamy",
    "note.bright": "Bright",
    "tasting.addCustomNotePlaceholder": "Add custom note...",
    "tasting.notesCount": "{count}/{max} tasting notes selected",

    // Location / selector
    "location.selectPlaceholder": "Select a location...",
    "location.searchPlaceholder": "Search locations...",
    "location.noResults": "No locations found.",

    // Profile page
    "profile.title": "Profile",

    "profile.editProfile": "Edit Profile",
    "profile.checkIns": "Check-ins",
    "profile.followers": "Followers",
    "profile.following": "Following",
    "profile.uniqueDrinks": "Cafe Visited",
    "profile.myCheckIns": "My Check-ins",
    "profile.badges": "Badges",
    "profile.wishlist": "Wishlist",
    "profile.avatarLabel": "Avatar",
    "profile.displayNamePlaceholder": "Display name",
    "profile.bioPlaceholder": "Bio",
    "wishlist.emptyTitle": "Your wishlist is empty",
    "wishlist.emptyDescription": "Save drinks and cafés you want to try later",

    // Activity page
    "activity.title": "Activity",
    "activity.likedYour": "liked your check-in",
    "activity.followedYou": "started following you",
    "activity.earnedBadge": "earned the",
    "activity.noActivity": "No activity yet",

    // Home page
    "home.title": "Feed",
    "home.noCheckIns": "No check-ins yet",
    "home.noCheckInsDescription":
      "Start your coffee journey by checking in your first drink!",
    "home.checkInNow": "Check In Now",
    // Feed empty state
    "feed.emptyTitle": "Your feed is empty",
    "feed.emptyDescription":
      "Start by checking in your first drink or follow other coffee lovers!",
    "confirm.deleteCheckIn": "Delete this check-in?",
    "confirm.deleteCheckInDescription":
      "Are you sure you want to delete this check-in?",
    // Cafe detail
    "cafe.googleRating": "Google Rating",
    "cafe.topDrinks": "Top Drinks",
    "cafe.noDrinksRatings": "No drinks ratings yet!",
    "cafe.googleReviews": "Google Reviews",

    // Settings
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.light": "Light",
    "settings.dark": "Dark",
  },
  ar: {
    // Navigation
    "nav.home": "الرئيسية",
    "nav.discover": "استكشف",
    "nav.checkIn": "تسجيل",
    "nav.activity": "النشاط",
    "nav.profile": "الملف",

    // Common
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.all": "الكل",
    "common.nearby": "قريب",
    "common.km": "كم",
    "common.loading": "جاري التحميل...",
    "common.noResults": "لا توجد نتائج",
    "common.error": "حدث خطأ ما",
    "common.retry": "إعادة المحاولة",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.changePhoto": "تغيير الصورة",
    "common.remove": "مسح",
    "common.edit": "تعديل",
    "common.delete": "حذف",
    "common.follow": "تابع",
    "common.following": "يتابع",
    "common.submit": "إرسال",
    "common.back": "رجوع",

    // Discover page
    "discover.title": "استكشف",
    "discover.searchPlaceholder": "ابحث عن المقاهي...",
    "discover.cafes": "المقاهي",
    "discover.roasters": "المحامص",
    "discover.nearYou": "بالقرب منك",
    "discover.allCities": "كل المدن",
    "discover.selectCity": "اختر المدينة",
    "discover.locationRequired": "فعّل الموقع لرؤية المقاهي القريبة",
    "discover.enableLocation": "تفعيل الموقع",
    "discover.locationDenied": "تم رفض الوصول للموقع. عرض المقاهي حسب المدينة.",
    "discover.noCafesFound": "لا توجد مقاهي",
    "discover.cafesIn": "المقاهي في",

    // Cities
    "city.jeddah": "جدة",
    "city.medina": "المدينة المنورة",
    "city.riyadh": "الرياض",

    // Check-in page
    "checkIn.title": "تسجيل",
    "checkIn.selectDrink": "اختر المشروب",
    "checkIn.selectLocation": "اختر الموقع",
    "checkIn.rating": "التقييم",
    "checkIn.notes": "ملاحظات",
    "checkIn.notesPlaceholder": "كيف كان مشروبك؟",
    "checkIn.addPhoto": "إضافة صورة",
    "checkIn.addPhotoHint": "انقر لتحميل مشروبك",
    "checkIn.tastingNotes": "ملاحظات التذوق",
    "checkIn.submit": "تسجيل",
    "checkIn.success": "تم نشر التسجيل!",
    "checkIn.isDrinking": "يشرب الآن",
    // Validation
    "validation.selectDrink": "الرجاء اختيار مشروب",
    "validation.rateDrink": "الرجاء تقييم مشروبك",
    "validation.selectCafe": "الرجاء اختيار مقهى",

    // Drinks (seeded)
    "drink.drink-1": "إسبريسو",
    "drink.drink-2": "كابتشينو",
    "drink.drink-3": "بور أوفر",
    "drink.drink-4": "كولد برو",
    "drink.drink-5": "فلات وايت",
    "drink.drink-6": "كورتادو",
    "drink.drink-7": "لاتيه",
    "drink.drink-8": "لاتيه ماتشا",
    "drink.drink-9": "إيرل غراي",
    "drink.drink-10": "أولونج",
    "drink.drink-11": "شاي تشاي",
    "drink.drink-12": "هوجيتشا",
    "drink.selectPlaceholder": "اختر المشروب",
    "drink.searchPlaceholder": "ابحث عن المشروبات...",
    "drink.noResults": "لا توجد مشروبات",
    "drink.addAsCoffee": "أضف كمشروب قهوة",
    "drink.addAsTea": "أضف كمشروب شاي",

    // Tasting notes
    "note.fruity": "فاكهي",
    "note.nutty": "مكسرات",
    "note.chocolate": "شيكولاتة",
    "note.caramel": "كراميل",
    "note.floral": "زهري",
    "note.citrus": "حمضي",
    "note.berry": "توت",
    "note.spicy": "بهارات",
    "note.earthy": "ترابي",
    "note.smooth": "ناعم",
    "note.bold": "جريء",
    "note.sweet": "حلو",
    "note.bitter": "مر",
    "note.creamy": "كريمي",
    "note.bright": "مشرق",
    "tasting.addCustomNotePlaceholder": "أضف ملاحظة مخصصة...",
    "tasting.notesCount": "{count}/{max} ملاحظات تذوق مختارة",

    // Location / selector
    "location.selectPlaceholder": "اختر الموقع",
    "location.searchPlaceholder": "ابحث عن المواقع...",
    "location.noResults": "لا توجد مواقع.",

    // Profile page
    "profile.title": "الملف الشخصي",

    "profile.editProfile": "عدل الملف الشخصي",
    "profile.checkIns": "التسجيلات",
    "profile.followers": "المتابعون",
    "profile.following": "يتابع",
    "profile.uniqueDrinks": "المقاهي التي زرتها",
    "profile.myCheckIns": "تسجيلاتي",
    "profile.badges": "الشارات",
    "profile.wishlist": "قائمة الأمنيات",
    "profile.avatarLabel": "الصورة",
    "profile.displayNamePlaceholder": "الاسم الظاهر",
    "profile.bioPlaceholder": "نبذة عنك",
    "wishlist.emptyTitle": "قائمة الأمنيات فارغة",
    "wishlist.emptyDescription":
      "احفظ المشروبات والمقاهي التي تريد تجربتها لاحقًا",

    // Activity page
    "activity.title": "النشاط",
    "activity.likedYour": "أعجب بتسجيلك",
    "activity.followedYou": "بدأ متابعتك",
    "activity.earnedBadge": "حصل على",
    "activity.noActivity": "لا يوجد نشاط بعد",

    // Home page
    "home.title": "الخلاصة",
    "home.noCheckIns": "سجل حضورك خالي",
    "home.noCheckInsDescription": "ابدا رحلتك باول رشفة قهوة من هنا",
    "home.checkInNow": "سجل حضورك",
    // Feed empty state
    "feed.emptyTitle": "الخلاصة فارغة",
    "feed.emptyDescription": "ابدأ برشف مشروبك الأول أو تابع عشّاق القهوة",
    "confirm.deleteCheckIn": "حذف التسجيل؟",
    "confirm.deleteCheckInDescription":
      "هل أنت متأكد أنك تريد حذف هذا التسجيل؟",
    // Cafe detail
    "cafe.googleRating": "تقييم جوجل",
    "cafe.topDrinks": "أفضل المشروبات",
    "cafe.noDrinksRatings": "لا توجد تقييمات للمشروبات بعد!",
    "cafe.googleReviews": "مراجعات جوجل",

    // Settings
    "settings.language": "اللغة",
    "settings.theme": "المظهر",
    "settings.light": "فاتح",
    "settings.dark": "داكن",
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getDefaultLanguage(): Language {
  const stored = localStorage.getItem("language") as Language;
  if (stored === "ar" || stored === "en") {
    return stored;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("ar")) {
    return "ar";
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getDefaultLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const langTranslations = translations[language];
    return (langTranslations as Record<string, string>)[key] || key;
  };

  const isRTL = language === "ar";

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

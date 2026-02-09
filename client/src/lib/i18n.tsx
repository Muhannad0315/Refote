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
    "nav.cafe": "Cafe",
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
    "common.signOut": "Sign Out",
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
    "discover.locationDenied": "Location access denied.",
    "discover.locationError": "Unable to get your location. Please try again.",
    "discover.noCafesFound": "No cafes found",
    "discover.cafesIn": "Cafes in",
    "discover.distance": "Search radius",
    "discover.distance.500": "500 m (≈ 0.3 mi)",
    "discover.distance.1000": "1000 m (≈ 0.6 mi)",
    "discover.distance.1500": "1500 m (≈ 1 mile)",
    "discover.distance.3000": "3000 m (≈ 2 miles)",

    // Cities
    "city.jeddah": "Jeddah",
    "city.medina": "Medina",
    "city.riyadh": "Riyadh",

    // Check-in page
    "checkIn.title": "Check In",
    "checkIn.selectDrink": "Select Drink",
    "checkIn.selectLocation": "Select Location",
    "checkIn.rating": "Rating",
    "checkIn.temperature": "Temperature",
    "checkIn.notes": "Notes",
    "checkIn.notesPlaceholder": "How was your drink?",
    "checkIn.addPhoto": "Add Photo",
    "checkIn.addPhotoHint": "Click to upload your drink",
    "checkIn.tastingNotes": "Tasting Notes",
    "checkIn.submit": "Check In",
    "checkIn.update": "Update",
    "checkIn.updated": "Check-in updated!",
    "checkIn.createdTitle": "Check-in complete!",
    "checkIn.createdDescription": "Your drink has been logged successfully.",
    "checkIn.success": "Check-in posted!",
    "checkIn.isDrinking": "is drinking",

    // App
    "app.name": "Refote",
    "app.supportEmail": "support@refote.com",
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
    "settings.title": "Settings",
    "settings.back": "Back",
    "settings.changePassword": "Change Password",
    "settings.newPassword": "New password",
    "settings.newPasswordPlaceholder": "New password",
    "settings.confirmNewPassword": "Confirm new password",
    "settings.confirmNewPasswordPlaceholder": "Confirm new password",
    "settings.passwordRequirements":
      "At least 8 characters with uppercase, lowercase, and a number",
    "settings.passwordUpdated": "✓ Password updated successfully",
    "settings.updatePassword": "Update password",
    "settings.updating": "Updating...",
    "settings.enterNewPassword": "Please enter your new password",
    "settings.passwordMismatch": "Passwords do not match",
    "settings.passwordStrength":
      "Password must be at least 8 characters with uppercase, lowercase, and a number",
    // Profile / auth
    "profile.confirmEmailTitle": "Please confirm your email to continue.",
    "profile.confirmEmailBody": "We sent a confirmation link to ",
    "profile.didntSeeEmail": "Didn't see the email?",
    "profile.checkSpam": "Please check your spam or junk folder just in case.",
    "profile.resendIn": "Resend in",
    "profile.sending": "Sending...",
    "profile.resendConfirmationEmail": "Resend confirmation email",
    "profile.resendTooMany":
      "Too many resend attempts. Please wait a moment before trying again.",
    "profile.resendFailed":
      "Could not resend confirmation email. Please try again later.",
    "auth.emailNotFound": "Email not found. Please sign up first.",
    "auth.signOut": "Sign out",
    "profile.completeTitle": "Complete your profile",
    "profile.completeDescription":
      "Please choose a username and complete your profile.",
    "profile.usernamePlaceholder": "Username",
    "profile.usernameExample": "e.g. brew.john or john_coffee",
    "profile.saveAndContinue": "Save",
    // Signup / profile completion
    "signup.createAccount": "Sign up",
    // Auth page titles
    "auth.signup.title": "Sign up",
    "auth.login.title": "Login",
    "auth.login.welcome": "Welcome back",
    "auth.login.subtitle": "Sign in to your account",
    "auth.login.cardTitle": "Login to your account",
    "auth.signup.create": "Create your account",
    "auth.signup.subtitle": "Join Refote to discover cafés near you",
    "auth.signup.cardTitle": "Join Refote",
    "auth.signedInAs": "Signed in as",
    // Auth button labels
    "auth.signup.submit": "Sign up",
    "auth.login.submit": "Login",
    "auth.tabs.login": "Login",
    "auth.tabs.signup": "Sign up",
    "auth.switch.toSignup": "Switch to Sign up",
    "auth.switch.toLogin": "Switch to Login",
    "auth.emailAlreadyConfirmed.message":
      "This email is already registered. Please sign in instead.",
    "auth.rateLimit.wait": "Please wait {seconds} seconds before trying again.",
    "auth.forgotPassword": "Forgot password",
    "signup.completeProfile": "Complete your profile",
    "signup.username.length": "Username must be 3–20 characters",
    "signup.username.reserved": "This username is reserved",
    "signup.username.invalidChars":
      "Only lowercase letters, numbers, . and _ allowed; cannot start or end with . or _",
    "signup.username.checking": "Checking availability...",
    "signup.username.available": "Username available ✅",
    "signup.username.taken": "Username already taken ❌",
    "signup.username.notAvailable": "Username not available ❌",
    "signup.username.errorChecking": "Error checking username",
    "signup.usernamePlaceholder": "Username (required)",
    "signup.displayNamePlaceholder": "Display name",
    "signup.avatar.add": "Add avatar",
    "signup.avatar.hint": "Click to upload your avatar",
    "signup.bioPlaceholder": "Bio",
    "signup.save": "Save",
    "signup.checking": "Checking...",
    "signup.legal.privacyPrefix": "I agree to the",
    "signup.legal.privacy": "Privacy Policy",
    "signup.legal.termsPrefix": "I agree to the",
    "signup.legal.terms": "Terms of Use",
    "signup.errors.legalRequired":
      "You must accept the Privacy Policy and Terms of Use to continue.",
    // Auth / reset
    "auth.resetTitle": "Reset your password",
    "auth.passwordChangedDescription":
      "Your password has been changed. You can now log in with your new password.",
    "auth.goToLogin": "Go to login",
    "auth.backToSignup": "Back to signup",
    "settings.light": "Light",
    "settings.dark": "Dark",
    // Auth errors
    "auth.errors.invalidLogin":
      "This email or password is incorrect. Please try again.",
    // Photo upload labels
    "photo.add": "Add a photo",
    "photo.dragDrop": "Drag & drop an image here, or click to browse",
    "photo.replace": "Replace photo",
    "photo.remove": "Remove photo",
    "photo.uploadInProgressTitle": "Photo upload in progress",
    "photo.uploadInProgressDescription":
      "Please wait until the photo upload completes.",
    "photo.uploadErrorTitle": "Photo upload error",
    // Loading and error states
    "error.loading": "Loading...",
    "error.cafeNotFound": "Cafe not found",
    "error.failedToFetch": "Failed to fetch cafe",
    "error.updateCheckIn": "Failed to update check-in. Please try again.",
    "error.createCheckIn": "Failed to create check-in. Please try again.",
    "error.userNotFound": "User not found",
    // Common small labels
    "common.view": "View",
    // User lists
    "user.notFollowingYet": "Not following anyone yet",
    "user.noFollowersYet": "No followers yet",
    // Auth small labels
    "auth.backToLogin": "Back to login",
    "auth.changeEmail": "Change email",
    "auth.confirmExpired": "Your confirmation link may have expired.",
    "auth.resetInstructions":
      "Enter your email and we'll send you a link to set a new password.",
    "auth.emailPlaceholder": "Email",
    "auth.passwordPlaceholder": "Password",
    "auth.checkYourEmail": "Check your email",
    "auth.resetSentBody": "We've sent a password reset link to",
    "auth.resetSentFooter":
      "Click the link in your email to create a new password.",
    "auth.resetSentCheckSpam":
      "If you don't see it, check your spam/junk folder.",
    "auth.sendResetEmail": "Send reset email",
    "auth.sentConfirmationTitle": "We've sent you a confirmation email.",
    "auth.checkInbox": "Please check your inbox and spam/junk folder.",
    // Cafe map labels
    "cafe.viewOnMaps": "View on Maps",
    "cafe.directions": "Directions",
    "cafe.checkIns": "check-ins",
    // Cafe detail specific
    "cafe.temperature.hot": "Hot",
    "cafe.temperature.cold": "Cold",
    "cafe.providedByGoogle": "Provided by Google",
    "cafe.noRatings": "No ratings",
    "cafe.ratings": "ratings",
    "cafe.recentCheckIns": "Recent Check-ins",
    "cafe.checkInHere": "Check In Here",
    // 404 page
    "notfound.title": "404 Page Not Found",
    "notfound.description": "The page you're looking for doesn't exist.",
    "notfound.goHome": "Go to Home",
    // Empty state / placeholders
    "empty.nothingHere": "Nothing here",
    "empty.checkBackLater": "Check back later for updates.",
    // Policies
    "nav.footer": "Footer",
    "nav.privacy": "Privacy Policy",
    "nav.terms": "Terms of Service",
    "nav.feedback": "Feedback",

    // Privacy policy (English)
    "privacy.title": "Privacy Policy",
    "privacy.lastUpdated": "Last updated: February 9, 2026",
    "privacy.intro":
      'Refote ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use the Refote application and related services.',

    "privacy.collect.title": "1. Information We Collect",
    "privacy.collect.content":
      "We may collect the following information: - Account information (such as username and profile details) - Location data (only when you grant permission) - User-generated content (check-ins, ratings, reviews, photos) - Technical data (device type, app usage, and logs for performance and security)",

    "privacy.use.title": "2. How We Use Your Information",
    "privacy.use.content":
      "We use your information to: - Provide and improve the Refote service - Show nearby cafés and relevant content - Enable check-ins, ratings, and reviews - Maintain app security and prevent abuse - Improve user experience and features",

    "privacy.location.title": "3. Location Data",
    "privacy.location.content":
      "Location data is used solely to show nearby cafés and is never shared publicly without your consent. You can disable location access at any time from your device settings.",

    "privacy.sharing.title": "4. Data Sharing",
    "privacy.sharing.content":
      "We do not sell your personal data. We may share limited data with: - Service providers (e.g., maps and hosting services) - Legal authorities if required by law",

    "privacy.retention.title": "5. Data Retention",
    "privacy.retention.content":
      "We retain your data only as long as necessary to provide the service or comply with legal obligations.",

    "privacy.rights.title": "6. Your Rights",
    "privacy.rights.content":
      "You have the right to: - Access your data - Update or delete your account - Withdraw consent for location access",

    "privacy.security.title": "7. Security",
    "privacy.security.content":
      "We implement reasonable technical and organizational measures to protect your data. However, no system is 100% secure.",

    "privacy.changes.title": "8. Changes to This Policy",
    "privacy.changes.content":
      "We may update this Privacy Policy from time to time. Continued use of Refote means you accept the updated policy.",

    "privacy.contact.title": "9. Contact Us",
    "privacy.contact.content":
      "If you have questions about this Privacy Policy, please contact us at: support@refote.com",

    // Feedback page
    "feedback.title": "Feedback",
    "feedback.subtitle":
      "We'd love to hear from you. Tell us about bugs, suggestions, or general feedback.",
    "feedback.name": "Your name",
    "feedback.email": "Your email",
    "feedback.message": "Message",
    "feedback.send": "Send",
    "feedback.sending": "Sending...",
    "feedback.success": "Thanks — your feedback was sent!",
    "feedback.error": "Failed to send feedback. Please try again later.",
    "feedback.validation.name": "Please enter your name",
    "feedback.validation.email": "Please enter a valid email address",
    "feedback.validation.message": "Please enter a message",

    // Terms of Use (English)
    "terms.title": "Terms of Use",
    "terms.lastUpdated": "Last updated: February 9, 2026",
    "terms.intro":
      "By using Refote, you agree to the following Terms of Use. If you do not agree, please do not use the application.",

    "terms.eligibility.title": "1. Eligibility",
    "terms.eligibility.content":
      "You must be at least 13 years old to use Refote.",

    "terms.accounts.title": "2. User Accounts",
    "terms.accounts.content":
      "You are responsible for maintaining the confidentiality of your account and for all activities under it.",

    "terms.userContent.title": "3. User Content",
    "terms.userContent.content":
      "You are solely responsible for any content you submit, including ratings, reviews, and photos. Content must not be illegal, misleading, or abusive.",

    "terms.acceptableUse.title": "4. Acceptable Use",
    "terms.acceptableUse.content":
      "You agree not to: - Misuse the app or attempt to disrupt its operation - Post false or harmful content - Violate any applicable laws or regulations",

    "terms.intellectual.title": "5. Intellectual Property",
    "terms.intellectual.content":
      "All trademarks, logos, and app content belong to Refote or its licensors. You may not use them without permission.",

    "terms.termination.title": "6. Termination",
    "terms.termination.content":
      "We reserve the right to suspend or terminate accounts that violate these terms.",

    "terms.disclaimer.title": "7. Disclaimer",
    "terms.disclaimer.content":
      'Refote is provided "as is" without warranties of any kind. We do not guarantee the accuracy of café information.',

    "terms.liability.title": "8. Limitation of Liability",
    "terms.liability.content":
      "Refote is not liable for any indirect or consequential damages arising from your use of the app.",

    "terms.changes.title": "9. Changes to Terms",
    "terms.changes.content":
      "We may update these terms at any time. Continued use of the app means acceptance of the updated terms.",
  },
  ar: {
    // Navigation
    "nav.home": "الرئيسية",
    "nav.footer": "تذييل",
    "nav.discover": "استكشف",
    "nav.cafe": "المقهى",
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
    "common.signOut": "تسجيل خروج",
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
    "discover.locationDenied": "تم رفض الوصول للموقع.",
    "discover.locationError": "يتعذر الحصول على موقعك. حاول مرة أخرى.",
    "discover.noCafesFound": "لا توجد مقاهي",
    "discover.cafesIn": "المقاهي في",
    "discover.distance": "نطاق البحث",
    "discover.distance.500": "500 م (≈ 0.3 ميل)",
    "discover.distance.1000": "1000 م (≈ 0.6 ميل)",
    "discover.distance.1500": "1500 م (≈ 1 ميل)",
    "discover.distance.3000": "3000 م (≈ 2 ميل)",

    // Cities
    "city.jeddah": "جدة",
    "city.medina": "المدينة المنورة",
    "city.riyadh": "الرياض",

    // Check-in page
    "checkIn.title": "تسجيل",
    "checkIn.selectDrink": "اختر المشروب",
    "checkIn.selectLocation": "اختر الموقع",
    "checkIn.rating": "التقييم",
    "checkIn.temperature": "درجة الحرارة",
    "checkIn.notes": "ملاحظات",
    "checkIn.notesPlaceholder": "كيف كان مشروبك؟",
    "checkIn.addPhoto": "إضافة صورة",
    "checkIn.addPhotoHint": "انقر لتحميل مشروبك",
    "checkIn.tastingNotes": "ملاحظات التذوق",
    "checkIn.submit": "تسجيل",
    "checkIn.update": "تحديث",
    "checkIn.updated": "تم التحديث!",
    "checkIn.createdTitle": "تم التسجيل!",
    "checkIn.createdDescription": "تم تسجيل مشروبك بنجاح.",
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

    "profile.editProfile": "عدل الملف",
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
    "settings.title": "الإعدادات",
    "settings.back": "رجوع",
    "settings.changePassword": "تغيير كلمة المرور",
    "settings.newPassword": "كلمة المرور الجديدة",
    "settings.newPasswordPlaceholder": "كلمة المرور الجديدة",
    "settings.confirmNewPassword": "تأكيد كلمة المرور الجديدة",
    "settings.confirmNewPasswordPlaceholder": "تأكيد كلمة المرور الجديدة",
    "settings.passwordRequirements": "على الأقل 8 أحرف مع حرف كبير وصغير ورقم",
    "settings.passwordUpdated": "✓ تم تحديث كلمة المرور بنجاح",
    "settings.updatePassword": "تحديث كلمة المرور",
    "settings.updating": "جارٍ التحديث...",
    "settings.enterNewPassword": "الرجاء إدخال كلمة المرور الجديدة",
    "settings.passwordMismatch": "كلمات المرور غير متطابقة",
    "settings.passwordStrength":
      "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل مع حرف كبير وصغير ورقم",
    // Auth errors
    "auth.errors.invalidLogin":
      "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.",
    // Photo upload labels
    "photo.add": "أضف صورة",
    "photo.dragDrop": "اسحب وأفلت الصورة هنا، أو انقر للتصفح",
    "photo.replace": "استبدال الصورة",
    "photo.remove": "إزالة الصورة",
    "photo.uploadInProgressTitle": "جاري رفع الصورة",
    "photo.uploadInProgressDescription":
      "الرجاء الانتظار حتى يكتمل رفع الصورة.",
    "photo.uploadErrorTitle": "خطأ في رفع الصورة",
    // Profile / auth
    "profile.confirmEmailTitle": "يرجى تأكيد بريدك الإلكتروني للمتابعة.",
    "profile.confirmEmailBody": "أرسلنا رابط تأكيد إلى ",
    "profile.didntSeeEmail": "لم يصل البريد؟",
    "profile.checkSpam": "تحقق من مجلد الرسائل غير المرغوب فيها أو السبام.",
    "profile.resendIn": "إعادة الإرسال بعد",
    "profile.sending": "جاري الإرسال...",
    "profile.resendConfirmationEmail": "إعادة إرسال رسالة التأكيد",
    "profile.resendTooMany":
      "محاولات إعادة الإرسال كثيرة. الرجاء الانتظار للحظة قبل المحاولة مرة أخرى.",
    "profile.resendFailed":
      "تعذّر إعادة إرسال رسالة التأكيد. الرجاء المحاولة لاحقًا.",
    "auth.signOut": "تسجيل خروج",
    "profile.completeTitle": "أكمل ملفك الشخصي",
    "profile.completeDescription": "اختر اسم مستخدم وأكمل ملفك الشخصي.",
    "profile.usernamePlaceholder": "اسم المستخدم",
    "profile.usernameExample": "مثال: brew.john أو john_coffee",
    "profile.saveAndContinue": "حفظ",
    // Signup / profile completion
    "signup.createAccount": "التسجيل",
    "auth.signup.title": "التسجيل",
    "auth.login.title": "تسجيل الدخول",
    "auth.login.welcome": "مرحبًا بعودتك",
    "auth.login.subtitle": "سجّل الدخول إلى حسابك",
    "auth.login.cardTitle": "تسجيل الدخول إلى حسابك",
    "auth.signup.create": "إنشاء حسابك",
    "auth.signup.subtitle": "انضم إلى ريفوت لاكتشاف المقاهي القريبة منك",
    "auth.signup.cardTitle": "انضم إلى ريفوت",
    "auth.signedInAs": "مسجل الدخول كـ",
    "auth.signup.submit": "تسجيل",
    "auth.login.submit": "تسجيل الدخول",
    "auth.tabs.login": "تسجيل الدخول",
    "auth.tabs.signup": "التسجيل",
    "auth.switch.toSignup": "الانتقال إلى التسجيل",
    "auth.switch.toLogin": "الانتقال إلى تسجيل الدخول",
    "auth.emailAlreadyConfirmed.message":
      "هذا البريد مسجل بالفعل. يرجى تسجيل الدخول.",
    "auth.rateLimit.wait":
      "الرجاء الانتظار {seconds} ثانية قبل المحاولة مرة أخرى.",
    "auth.forgotPassword": "هل نسيت كلمة المرور؟",
    "signup.completeProfile": "أكمل ملفك الشخصي",
    "signup.username.length": "يجب أن يكون اسم المستخدم من 3 إلى 20 حرفًا",
    "signup.username.reserved": "اسم المستخدم محجوز",
    "signup.username.invalidChars":
      "يسمح بأحرف صغيرة، أرقام، . و _ فقط؛ لا يمكن أن يبدأ أو ينتهي بـ . أو _",
    "signup.username.checking": "التحقق من التوافر...",
    "signup.username.available": "اسم المستخدم متاح ✅",
    "signup.username.taken": "اسم المستخدم محجوز ❌",
    "signup.username.notAvailable": "اسم المستخدم غير متاح ❌",
    "signup.username.errorChecking": "حدث خطأ أثناء التحقق",
    "signup.usernamePlaceholder": "اسم المستخدم (مطلوب)",
    "signup.displayNamePlaceholder": "الاسم الظاهر",
    "signup.avatar.add": "أضف الصورة",
    "signup.avatar.hint": "انقر لتحميل صورتك",
    "signup.bioPlaceholder": "نبذة",
    "signup.save": "حفظ",
    "signup.checking": "جارٍ التحقق...",
    "signup.legal.privacyPrefix": "أنا أوافق على",
    "signup.legal.privacy": "سياسة الخصوصية",
    "signup.legal.termsPrefix": "وأوافق على",
    "signup.legal.terms": "شروط الاستخدام",
    "signup.errors.legalRequired":
      "يجب قبول سياسة الخصوصية وشروط الاستخدام للمتابعة.",

    // Feedback page (Arabic)
    "nav.feedback": "تواصل معنا",
    "feedback.title": "تواصل معنا",
    "feedback.subtitle":
      "نحب سماع آرائك. أخبرنا عن الأخطاء أو الاقتراحات أو الملاحظات العامة.",
    "feedback.name": "الاسم",
    "feedback.email": "البريد الإلكتروني",
    "feedback.message": "الرسالة",
    "feedback.send": "إرسال",
    "feedback.sending": "جارٍ الإرسال...",
    "feedback.success": "شكرًا — تم إرسال ملاحظتك!",
    "feedback.error": "فشل إرسال الملاحظة. حاول مرة أخرى لاحقًا.",
    "feedback.validation.name": "الرجاء إدخال اسمك",
    "feedback.validation.email": "الرجاء إدخال بريد إلكتروني صالح",
    "feedback.validation.message": "الرجاء إدخال رسالة",
    // Ensure app name is localized
    "app.name": "ريفوت",
    "app.supportEmail": "support@refote.com",
    // Policies (Arabic)
    "nav.privacy": "سياسة الخصوصية",
    "nav.terms": "شروط الاستخدام",

    "privacy.title": "سياسة الخصوصية",
    "privacy.lastUpdated": "آخر تحديث: 9 فبراير 2026",
    "privacy.intro":
      'يحترم تطبيق ريفوت ("نحن" أو "التطبيق") خصوصيتك ويلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحفظ وحماية بياناتك عند استخدامك لتطبيق ريفوت والخدمات المرتبطة به.',

    "privacy.collect.title": "1. المعلومات التي نجمعها",
    "privacy.collect.content":
      "قد نقوم بجمع المعلومات التالية: - معلومات الحساب (مثل اسم المستخدم وبيانات الملف الشخصي) - بيانات الموقع (فقط عند منح الإذن) - المحتوى الذي ينشئه المستخدم (التسجيلات، التقييمات، المراجعات، الصور) - البيانات التقنية (نوع الجهاز، استخدام التطبيق، وسجلات الأداء والأمان)",

    "privacy.use.title": "2. كيفية استخدام المعلومات",
    "privacy.use.content":
      "نستخدم المعلومات من أجل: - تشغيل وتحسين خدمة ريفوت - عرض المقاهي القريبة والمحتوى المناسب - تمكين التسجيلات والتقييمات والمراجعات - الحفاظ على أمان التطبيق ومنع إساءة الاستخدام - تحسين تجربة المستخدم والميزات",

    "privacy.location.title": "3. بيانات الموقع",
    "privacy.location.content":
      "تُستخدم بيانات الموقع فقط لعرض المقاهي القريبة، ولا يتم مشاركتها علنًا دون موافقتك. يمكنك إيقاف إذن الموقع في أي وقت من إعدادات جهازك.",

    "privacy.sharing.title": "4. مشاركة البيانات",
    "privacy.sharing.content":
      "نحن لا نبيع بياناتك الشخصية. قد نشارك بيانات محدودة مع: - مزودي الخدمات (مثل خدمات الخرائط والاستضافة) - الجهات القانونية إذا طُلب ذلك بموجب القانون",

    "privacy.retention.title": "5. الاحتفاظ بالبيانات",
    "privacy.retention.content":
      "نحتفظ ببياناتك فقط للمدة اللازمة لتقديم الخدمة أو الامتثال للمتطلبات القانونية.",

    "privacy.rights.title": "6. حقوقك",
    "privacy.rights.content":
      "يحق لك: - الوصول إلى بياناتك - تحديث أو حذف حسابك - سحب الموافقة على استخدام الموقع",

    "privacy.security.title": "7. الأمان",
    "privacy.security.content":
      "نطبق إجراءات تقنية وتنظيمية معقولة لحماية بياناتك، مع العلم أنه لا يوجد نظام آمن بنسبة 100%.",

    "privacy.changes.title": "8. التعديلات على السياسة",
    "privacy.changes.content":
      "قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. استمرارك في استخدام ريفوت يعني موافقتك على التحديثات.",

    "privacy.contact.title": "9. التواصل معنا",
    "privacy.contact.content":
      "لأي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر: support@refote.com",

    "terms.title": "شروط الاستخدام",
    "terms.lastUpdated": "آخر تحديث: 9 فبراير 2026",
    "terms.intro":
      "باستخدامك لتطبيق ريفوت، فإنك توافق على شروط الاستخدام التالية. إذا لم توافق عليها، يرجى عدم استخدام التطبيق.",

    "terms.eligibility.title": "1. الأهلية",
    "terms.eligibility.content":
      "يجب أن يكون عمرك 13 عامًا على الأقل لاستخدام ريفوت.",

    "terms.accounts.title": "2. حساب المستخدم",
    "terms.accounts.content":
      "أنت مسؤول عن الحفاظ على سرية حسابك وعن جميع الأنشطة التي تتم من خلاله.",

    "terms.userContent.title": "3. محتوى المستخدم",
    "terms.userContent.content":
      "أنت المسؤول الوحيد عن المحتوى الذي تنشره، بما في ذلك التقييمات والمراجعات والصور. يجب ألا يكون المحتوى غير قانوني أو مضلل أو مسيء.",

    "terms.acceptableUse.title": "4. الاستخدام المقبول",
    "terms.acceptableUse.content":
      "توافق على عدم: - إساءة استخدام التطبيق أو محاولة تعطيله - نشر محتوى كاذب أو ضار - انتهاك أي قوانين أو أنظمة سارية",

    "terms.intellectual.title": "5. الملكية الفكرية",
    "terms.intellectual.content":
      "جميع العلامات التجارية والشعارات ومحتوى التطبيق مملوكة لريفوت أو للمرخصين لها، ولا يجوز استخدامها دون إذن.",

    "terms.termination.title": "6. إنهاء الخدمة",
    "terms.termination.content":
      "نحتفظ بالحق في تعليق أو إنهاء أي حساب ينتهك هذه الشروط.",

    "terms.disclaimer.title": "7. إخلاء المسؤولية",
    "terms.disclaimer.content":
      'يُقدَّم تطبيق ريفوت "كما هو" دون أي ضمانات، ولا نضمن دقة معلومات المقاهي.',

    "terms.liability.title": "8. تحديد المسؤولية",
    "terms.liability.content":
      "لا تتحمل ريفوت أي مسؤولية عن الأضرار غير المباشرة أو التبعية الناتجة عن استخدام التطبيق.",

    "terms.changes.title": "9. التعديلات",
    "terms.changes.content":
      "قد نقوم بتحديث شروط الاستخدام في أي وقت. استمرارك في استخدام التطبيق يعني موافقتك على الشروط المحدثة.",
    // Auth / reset
    "auth.resetTitle": "إعادة تعيين كلمة المرور",
    "auth.passwordChangedDescription":
      "تم تغيير كلمة المرور الخاصة بك. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.",
    "auth.goToLogin": "الانتقال إلى تسجيل الدخول",
    "auth.backToSignup": "العودة للتسجيل",
    "error.userNotFound": "المستخدم غير موجود",
    // Common small labels
    "common.view": "عرض",
    // User lists
    "user.notFollowingYet": "لم تتبع أحدًا بعد",
    "user.noFollowersYet": "لا يوجد متابعون حتى الآن",
    // Auth small labels
    "auth.backToLogin": "العودة لتسجيل الدخول",
    "auth.changeEmail": "تغيير البريد الإلكتروني",
    "auth.confirmExpired": "قد تكون صلاحية رابط التأكيد انتهت.",
    "auth.resetInstructions":
      "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.",
    "auth.emailPlaceholder": "البريد الإلكتروني",
    "auth.passwordPlaceholder": "كلمة المرور",
    "auth.checkYourEmail": "تحقق من بريدك الإلكتروني",
    "auth.resetSentBody": "أرسلنا رابط إعادة تعيين كلمة المرور إلى",
    "auth.resetSentFooter": "انقر على الرابط في بريدك لإنشاء كلمة مرور جديدة.",
    "auth.resetSentCheckSpam":
      "إذا لم يصل، فتحقق من مجلد البريد العشوائي/السبام.",
    "auth.sendResetEmail": "إرسال رابط إعادة التعيين",
    "auth.emailNotFound": "البريد الإلكتروني غير موجود. الرجاء التسجيل أولاً.",
    "auth.sentConfirmationTitle": "أرسلنا رسالة تأكيد إلى بريدك.",
    "auth.checkInbox":
      "يرجى التحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.",
    // Cafe map labels
    "cafe.viewOnMaps": "عرض على الخريطة",
    "cafe.directions": "الاتجاهات",
    "cafe.checkIns": "تسجيل",
    // Loading and error states
    "error.loading": "جاري التحميل...",
    "error.cafeNotFound": "لم يتم العثور على المقهى",
    "error.failedToFetch": "فشل في جلب البيانات",
    "error.updateCheckIn": "فشل في تحديث التسجيل. حاول مرة أخرى.",
    "error.createCheckIn": "فشل في إنشاء التسجيل. حاول مرة أخرى.",
    // Cafe detail specific
    "cafe.temperature.hot": "ساخن",
    "cafe.temperature.cold": "بارد",
    "cafe.providedByGoogle": "مقدم من Google",
    "cafe.noRatings": "بدون تقييمات",
    "cafe.ratings": "تقييمات",
    "cafe.recentCheckIns": "أحدث التسجيلات",
    "cafe.checkInHere": "سجّل هنا",
    // 404 page
    "notfound.title": "404 الصفحة غير موجودة",
    "notfound.description": "الصفحة التي تبحث عنها غير موجودة.",
    "notfound.goHome": "العودة للرئيسية",
    // Empty state / placeholders
    "empty.nothingHere": "لا شيء هنا",
    "empty.checkBackLater": "تحقق لاحقًا للحصول على التحديثات.",
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

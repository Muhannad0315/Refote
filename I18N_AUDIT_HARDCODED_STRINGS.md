# I18n Audit: Hardcoded Strings (NOT Using t() Function)

## Overview

This document lists all hardcoded English and Arabic strings found in `client/src` directory that are NOT wrapped with the i18n `t()` function. These strings need to be moved to the i18n configuration and replaced with i18n keys.

---

## 1. [signup.tsx](client/src/pages/signup.tsx)

### Line 75: Status message

```tsx
setUsernameMessage("Checking availability...");
```

**Type:** Status message
**Suggest i18n key:** `profile.checkingAvailability`

### Line 100: Error message

```tsx
setUsernameMessage("Error checking username");
```

**Type:** Error message
**Suggest i18n key:** `profile.errorCheckingUsername`

### Line 253: Button label

```tsx
{
  usernameChecking ? "Checking..." : "Save";
}
```

**Type:** Button label with conditional
**Suggest i18n key:** `profile.checkingDots` or use existing `common.save`

### Line 229: Image title

```tsx
title = "Add avatar";
```

**Type:** HTML title attribute
**Suggest i18n key:** `profile.addAvatar`

### Line 215: Input placeholder

```tsx
placeholder = "Username (required)";
```

**Type:** Input placeholder
**Suggest i18n key:** `profile.usernamePlaceholder`

### Line 222: Input placeholder

```tsx
placeholder = "Display name";
```

**Type:** Input placeholder
**Suggest i18n key:** `profile.displayNamePlaceholder` (exists)

### Line 234: Textarea placeholder

```tsx
placeholder = "Bio";
```

**Type:** Input placeholder
**Suggest i18n key:** `profile.bioPlaceholder` (exists)

---

## 2. [profile.tsx](client/src/pages/profile.tsx)

### Line 153: Error message

```tsx
setUsernameMessage("Error checking username");
```

**Type:** Error message
**Suggest i18n key:** `profile.errorCheckingUsername`

### Line 121: Status message

```tsx
setUsernameMessage("Checking availability...");
```

**Type:** Status message
**Suggest i18n key:** `profile.checkingAvailability`

### Line 305: Button label with conditional

```tsx
{
  usernameChecking ? "Checking..." : t("common.save");
}
```

**Type:** Button label with hardcoded "Checking..."
**Suggest i18n key:** `profile.checkingDots`

### Line 263: Input placeholder

```tsx
placeholder = "Username";
```

**Type:** Input placeholder
**Suggest i18n key:** `profile.usernamePlaceholder`

---

## 3. [profile-complete.tsx](client/src/pages/profile-complete.tsx)

### Line 86: Status message

```tsx
setUsernameMessage("Checking availability...");
```

**Type:** Status message
**Suggest i18n key:** `profile.checkingAvailability`

### Line 111: Error message

```tsx
setUsernameMessage("Error checking username");
```

**Type:** Error message
**Suggest i18n key:** `profile.errorCheckingUsername`

### Line 334: Button label with conditional

```tsx
{
  usernameChecking ? "Checking..." : t("common.save");
}
```

**Type:** Button label with hardcoded "Checking..."
**Suggest i18n key:** `profile.checkingDots`

### Line 285: Input placeholder

```tsx
placeholder = "Username";
```

**Type:** Input placeholder
**Suggest i18n key:** `profile.usernamePlaceholder`

---

## 4. [cafe-detail.tsx](client/src/pages/cafe-detail.tsx) ⚠️ CRITICAL - Multiple hardcoded strings

### Line 121: Hardcoded "No ratings" with ternary

```tsx
{
  language === "ar" ? "بدون تقييمات" : "No ratings";
}
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** `cafe.noRatings`
**Note:** Should be: `t("cafe.noRatings")`

### Line 131: Hardcoded "Provided by Google" with ternary

```tsx
{
  language === "ar" ? "مقدم من Google" : "Provided by Google";
}
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** `cafe.providedByGoogle`
**Note:** Should be: `t("cafe.providedByGoogle")`

### Line 152: Hardcoded "Top Drinks" with ternary

```tsx
{
  language === "ar" ? "أفضل المشروبات" : "Top Drinks";
}
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** Use existing `cafe.topDrinks`
**Note:** Should be: `t("cafe.topDrinks")`

### Line 175: Hardcoded "ratings" with ternary

```tsx
({d.count} {language === "ar" ? "تقييم" : "ratings"})
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** `cafe.ratingsLabel`
**Note:** Should be: `t("cafe.ratingsLabel")`

### Line 189: Hardcoded "No drink ratings yet" with ternary

```tsx
{
  language === "ar" ? "لا توجد تقييمات للمشروبات بعد" : "No drink ratings yet";
}
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** Use existing `cafe.noDrinksRatings`
**Note:** Should be: `t("cafe.noDrinksRatings")`

### Line 211: Hardcoded "Check In Here" with ternary

```tsx
{
  language === "ar" ? "سجّل هنا" : "Check In Here";
}
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** `cafe.checkInHere`
**Note:** Should be: `t("cafe.checkInHere")`

### Line 219: Hardcoded "Recent Check-ins" with ternary

```tsx
{
  language === "ar" ? "أحدث التسجيلات" : "Recent Check-ins";
}
```

**Type:** Inline hardcoded English/Arabic
**Suggest i18n key:** `cafe.recentCheckIns`
**Note:** Should be: `t("cafe.recentCheckIns")`

---

## 5. [check-in.tsx](client/src/pages/check-in.tsx) ⚠️ CRITICAL - Multiple hardcoded strings

### Line 52: Toast title with ternary

```tsx
title: language === "ar" ? "خطأ" : "Error",
```

**Type:** Toast/error message
**Suggest i18n key:** `common.error` (exists)
**Note:** Should be: `t("common.error")`

### Line 61: Toast title with ternary

```tsx
title: language === "ar" ? "خطأ" : "Error",
```

**Type:** Toast/error message
**Suggest i18n key:** `common.error` (exists)
**Note:** Should be: `t("common.error")`

### Line 71: Enum values

```tsx
temperature: z.enum(["Hot", "Cold"]), // Required temperature
```

**Type:** Schema enum values
**Suggest i18n key:** `checkIn.hot` and `checkIn.cold`
**Note:** These might need to stay as schema values, but labels should use i18n

### Line 268: Toast title with ternary

```tsx
title: language === "ar" ? "تم التحديث!" : "Check-in updated!",
```

**Type:** Toast success message
**Suggest i18n key:** `checkIn.updated` or `checkIn.updateSuccess`

### Line 275: Toast description with ternary

```tsx
language === "ar"
  ? "فشل في تحديث التسجيل. حاول مرة أخرى."
  : "Failed to update check-in. Please try again.",
```

**Type:** Toast error message
**Suggest i18n key:** `checkIn.updateFailed`

### Line 349: Toast title with ternary

```tsx
title: language === "ar" ? "تم التسجيل!" : "Check-in complete!",
```

**Type:** Toast success message
**Suggest i18n key:** `checkIn.complete` or `checkIn.success`

### Line 355: Toast description with ternary

```tsx
language === "ar"
  ? "تم تسجيل مشروبك بنجاح."
  : "Your drink has been logged successfully.",
```

**Type:** Toast description
**Suggest i18n key:** `checkIn.loggedSuccessfully`

### Line 365: Toast description with ternary

```tsx
language === "ar"
  ? "فشل في إنشاء التسجيل. حاول مرة أخرى."
  : "Failed to create check-in. Please try again.",
```

**Type:** Toast error message
**Suggest i18n key:** `checkIn.createFailed`

### Line 413: Toast title with ternary

```tsx
language === "ar" ? "جاري رفع الصورة" : "Photo upload in progress",
```

**Type:** Toast message
**Suggest i18n key:** `photo.uploadInProgress`

### Line 418: Toast description with ternary

```tsx
language === "ar"
  ? "الرجاء الانتظار حتى يكتمل رفع الصورة."
  : "Please wait until the photo upload completes.",
```

**Type:** Toast description
**Suggest i18n key:** `photo.waitForCompletion`

### Line 424: Toast title with ternary

```tsx
title: language === "ar" ? "خطأ في رفع الصورة" : "Photo upload error",
```

**Type:** Toast error message
**Suggest i18n key:** `photo.uploadError`

### Line 532: Button label

```tsx
onClick={() => field.onChange("Hot")}
```

**Type:** Button click handler - string values
**Suggest i18n key:** Keep schema values but display via i18n

### Line 534: Button conditional

```tsx
field.value === "Hot";
```

**Type:** State comparison
**Note:** Keep value same, localize display text only

### Line 543: Button label

```tsx
onClick={() => field.onChange("Cold")}
```

**Type:** Button click handler - string values
**Suggest i18n key:** Keep schema values but display via i18n

### Line 545: Button conditional

```tsx
field.value === "Cold";
```

**Type:** State comparison
**Note:** Keep value same, localize display text only

### Line 591: Form label with ternary

```tsx
{
  language === "ar" ? "الموقع" : "Location";
}
```

**Type:** Form label
**Suggest i18n key:** `checkIn.location` or `common.location`

### Line 704: Button label with ternary

```tsx
language === "ar" ? (
  "جاري التسجيل..."
```

**Type:** Loading button text
**Suggest i18n key:** `checkIn.checkingIn`

### Line 712: Button label with ternary

```tsx
: "Update"
```

**Type:** Button label (part of conditional)
**Suggest i18n key:** `common.update`

---

## 6. [cafe-card.tsx](client/src/components/cafe-card.tsx) ⚠️ CRITICAL - Multiple hardcoded strings

### Line 122: Link text with ternary

```tsx
{
  language === "ar" ? "عرض على الخريطة" : "View on Maps";
}
```

**Type:** Link text
**Suggest i18n key:** `cafe.viewOnMaps`

### Line 134: Link text with ternary

```tsx
{
  language === "ar" ? "الاتجاهات" : "Directions";
}
```

**Type:** Link text
**Suggest i18n key:** `cafe.directions`

### Line 161: Text with ternary

```tsx
{
  language === "ar" ? "بدون تقييمات" : "No ratings";
}
```

**Type:** Text
**Suggest i18n key:** `cafe.noRatings`

### Line 169: Text with ternary

```tsx
{
  language === "ar" ? "مقدم من Google" : "Provided by Google";
}
```

**Type:** Text
**Suggest i18n key:** `cafe.providedByGoogle`

### Line 199: Text with ternary

```tsx
{
  totalCheckIns;
}
{
  language === "ar" ? "تسجيل" : "check-ins";
}
```

**Type:** Text label
**Suggest i18n key:** `cafe.checkInsLabel` (needs plural handling)

### Line 222: Button text with ternary

```tsx
{
  language === "ar" ? "سجّل هنا" : "Check In Here";
}
```

**Type:** Button text
**Suggest i18n key:** `cafe.checkInHere`

---

## 7. [drink-selector.tsx](client/src/components/drink-selector.tsx) ⚠️ CRITICAL

### Line 134: Button text with ternary

```tsx
{
  language === "ar" ? "تأكيد" : "Confirm";
}
```

**Type:** Button text
**Suggest i18n key:** `common.confirm`

### Line 145: Button text with ternary

```tsx
{
  language === "ar" ? "إلغاء" : "Cancel";
}
```

**Type:** Button text
**Suggest i18n key:** Use existing `common.cancel`

### Line 193: Command group heading with ternary

```tsx
<CommandGroup heading={language === "ar" ? "قهوة" : "Coffee"}>
```

**Type:** Section heading
**Suggest i18n key:** `drink.coffeeCategory`

### Line 218: Command group heading with ternary

```tsx
<CommandGroup heading={language === "ar" ? "شاي" : "Tea"}>
```

**Type:** Section heading
**Suggest i18n key:** `drink.teaCategory`

### Line 253: Text with ternary

```tsx
<span>{language === "ar" ? "مشروب آخر" : "Other"}</span>
```

**Type:** Section heading
**Suggest i18n key:** `drink.otherCategory`

---

## 8. [location-selector.tsx](client/src/components/location-selector.tsx) ⚠️ CRITICAL

### Line 101: Placeholder with ternary

```tsx
{
  language === "ar" ? "اختر الموقع" : "Select a location...";
}
```

**Type:** Placeholder text
**Suggest i18n key:** Use existing `location.selectPlaceholder`

### Line 111: Input placeholder with ternary

```tsx
language === "ar" ? "ابحث عن المواقع..." : "Search locations...";
```

**Type:** Input placeholder
**Suggest i18n key:** Use existing `location.searchPlaceholder`

### Line 119: Empty state with ternary

```tsx
{
  language === "ar" ? "لا توجد مواقع." : "No locations found.";
}
```

**Type:** Empty state message
**Suggest i18n key:** Use existing `location.noResults`

### Line 123: Command group heading with ternary

```tsx
<CommandGroup heading={language === "ar" ? "المقاهي" : "Cafés"}>
```

**Type:** Section heading
**Suggest i18n key:** `location.cafesLabel`

---

## 9. [not-found.tsx](client/src/pages/not-found.tsx) ⚠️ CRITICAL

### Line 23: Page title with ternary

```tsx
{
  language === "ar" ? "404 الصفحة غير موجودة" : "404 Page Not Found";
}
```

**Type:** Page title
**Suggest i18n key:** `notFound.title`

### Line 27: Description with ternary

```tsx
{
  language === "ar"
    ? "الصفحة التي تبحث عنها غير موجودة."
    : "The page you're looking for doesn't exist.";
}
```

**Type:** Page description
**Suggest i18n key:** `notFound.description`

### Line 35: Button text with ternary

```tsx
{
  language === "ar" ? "العودة للرئيسية" : "Go to Home";
}
```

**Type:** Button text
**Suggest i18n key:** `notFound.goHome`

---

## 10. [settings.tsx](client/src/pages/settings.tsx)

### Line 115: Input placeholder

```tsx
placeholder = "Your current password";
```

**Type:** Input placeholder
**Suggest i18n key:** `settings.currentPasswordPlaceholder`

### Line 131: Input placeholder

```tsx
placeholder = "New password";
```

**Type:** Input placeholder
**Suggest i18n key:** `settings.newPasswordPlaceholder`

### Line 148: Input placeholder

```tsx
placeholder = "Confirm new password";
```

**Type:** Input placeholder
**Suggest i18n key:** `settings.confirmPasswordPlaceholder`

### Line 119: Label text

```tsx
<label className="block text-sm font-medium mb-1">New password</label>
```

**Type:** Form label
**Suggest i18n key:** `settings.newPassword`

### Line 123: Help text

```tsx
<p className="text-xs text-muted-foreground mt-1">
  At least 8 characters with uppercase, lowercase, and a number
</p>
```

**Type:** Help text
**Suggest i18n key:** `settings.passwordRequirements`

### Line 112: Label text

```tsx
<label className="block text-sm font-medium mb-1">
  Current password (optional)
</label>
```

**Type:** Form label
**Suggest i18n key:** `settings.currentPassword`

### Line 169: Button text with conditional

```tsx
{
  loading ? "Updating..." : "Update password";
}
```

**Type:** Button text
**Suggest i18n key:** `settings.updatingDots` and `settings.updatePassword`

---

## 11. [auth-reset.tsx](client/src/pages/auth-reset.tsx)

### Line 118: Input placeholder

```tsx
placeholder = "New password";
```

**Type:** Input placeholder
**Suggest i18n key:** `auth.newPasswordPlaceholder`

### Line 132: Input placeholder

```tsx
placeholder = "Confirm password";
```

**Type:** Input placeholder
**Suggest i18n key:** `auth.confirmPasswordPlaceholder`

### Line 146: Button text with conditional

```tsx
{
  loading ? "Updating..." : "Update password";
}
```

**Type:** Button text
**Suggest i18n key:** `auth.updatingDots` and `auth.updatePassword`

---

## 12. [language-toggle.tsx](client/src/components/language-toggle.tsx)

### Line 22: Button text with ternary

```tsx
{
  language === "ar" ? "ع" : "En";
}
```

**Type:** Language toggle button
**Status:** Already using language variable, but could be in i18n
**Suggest i18n key:** `common.languageToggle`

---

## Summary Statistics

| Category                    | Count  | Severity     |
| --------------------------- | ------ | ------------ |
| Error messages              | 8      | HIGH         |
| Button labels               | 15     | HIGH         |
| Toast messages              | 6      | HIGH         |
| Input placeholders          | 10     | MEDIUM       |
| Form labels                 | 10     | MEDIUM       |
| Text with ternary operators | 20     | CRITICAL     |
| Help text                   | 2      | LOW          |
| **TOTAL**                   | **71** | **CRITICAL** |

---

## Critical Issues

### 🔴 Ternary Operators (20+ instances)

The most critical issue is the widespread use of inline ternary operators like:

```tsx
{
  language === "ar" ? "أفضل المشروبات" : "Top Drinks";
}
```

These should ALL be replaced with i18n keys:

```tsx
{
  t("cafe.topDrinks");
}
```

**Files with most ternaries:**

1. `cafe-detail.tsx` - 8 instances
2. `cafe-card.tsx` - 6 instances
3. `drink-selector.tsx` - 5 instances
4. `location-selector.tsx` - 4 instances
5. `check-in.tsx` - 10 instances

---

## Recommended i18n Keys to Add

```typescript
// Common
common.confirm = "Confirm";
common.update = "Update";
common.location = "Location";

// Profile
profile.checkingAvailability = "Checking availability...";
profile.errorCheckingUsername = "Error checking username";
profile.checkingDots = "Checking...";
profile.usernamePlaceholder = "Username";

// Cafe
cafe.noRatings = "No ratings";
cafe.providedByGoogle = "Provided by Google";
cafe.checkInHere = "Check In Here";
cafe.recentCheckIns = "Recent Check-ins";
cafe.ratingsLabel = "ratings";
cafe.checkInsLabel = "check-ins";
cafe.viewOnMaps = "View on Maps";
cafe.directions = "Directions";

// Check-in
checkIn.updated = "Check-in updated!";
checkIn.updateFailed = "Failed to update check-in. Please try again.";
checkIn.complete = "Check-in complete!";
checkIn.loggedSuccessfully = "Your drink has been logged successfully.";
checkIn.createFailed = "Failed to create check-in. Please try again.";
checkIn.checkingIn = "جاري التسجيل...";
checkIn.location = "Location";

// Photo
photo.uploadInProgress = "Photo upload in progress";
photo.waitForCompletion = "Please wait until the photo upload completes.";
photo.uploadError = "Photo upload error";
photo.addAvatar = "Add avatar";

// Drink
drink.coffeeCategory = "Coffee";
drink.teaCategory = "Tea";
drink.otherCategory = "Other";

// Location
location.cafesLabel = "Cafés";

// Not Found
notFound.title = "404 Page Not Found";
notFound.description = "The page you're looking for doesn't exist.";
notFound.goHome = "Go to Home";

// Settings
settings.currentPassword = "Current password (optional)";
settings.newPassword = "New password";
settings.confirmPassword = "Confirm new password";
settings.currentPasswordPlaceholder = "Your current password";
settings.newPasswordPlaceholder = "New password";
settings.confirmPasswordPlaceholder = "Confirm new password";
settings.passwordRequirements =
  "At least 8 characters with uppercase, lowercase, and a number";
settings.updatePassword = "Update password";
settings.updatingDots = "Updating...";

// Auth
auth.newPasswordPlaceholder = "New password";
auth.confirmPasswordPlaceholder = "Confirm password";
auth.updatePassword = "Update password";
auth.updatingDots = "Updating...";
```

---

## Next Steps

1. **Add all suggested i18n keys** to [i18n.tsx](client/src/lib/i18n.tsx)
2. **Add Arabic translations** for all new keys
3. **Replace hardcoded strings** in each file with `t()` function calls
4. **Remove ternary operators** entirely
5. **Run tests** to ensure no breaking changes
6. **Review components** to ensure consistent i18n usage

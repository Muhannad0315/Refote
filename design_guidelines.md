# Refote Design Guidelines

## Design Approach

**Reference-Based Strategy** drawing from Instagram (photo-forward social), Untappd (check-in mechanics), and Airbnb (location discovery). Create a visually rich, mobile-first experience that celebrates coffee/tea culture through photography and community.

## Typography System

- **Primary Font**: Inter (via Google Fonts CDN)
- **Accent Font**: DM Serif Display for café/roaster names and featured content
- **Hierarchy**:
  - H1: text-4xl font-bold (hero headings)
  - H2: text-2xl font-semibold (section titles, café names)
  - H3: text-lg font-semibold (drink names, card titles)
  - Body: text-base (reviews, descriptions)
  - Small: text-sm (metadata, timestamps, stats)
  - Caption: text-xs (badges, labels)

## Layout System

**Tailwind Spacing**: Use units of 2, 4, 6, 8, 12, and 16 for consistent rhythm

- Mobile-first: Single column with full-width cards
- Desktop: max-w-6xl container, 2-3 column grids where appropriate
- Feed layouts: Stacked cards with generous padding (p-4 to p-6)

## Core Components

### Check-In Cards (Primary Content Unit)

- Large drink photo at top (aspect-ratio-square or 4:3)
- User avatar + name + timestamp
- Drink name (DM Serif, text-xl)
- Rating stars (filled/outline pattern)
- Location tag with café/roaster name (clickable)
- Tasting notes section with collapsible text
- Action bar: Like, comment, share icons (Heroicons)

### Café/Roaster Cards

- Hero image (aspect-ratio-video, showcasing space)
- Overlay gradient with name and location
- Quick stats row: Average rating, total check-ins, specialty tags
- "Check In Here" prominent CTA
- Grid of recent check-in photos (3-column)

### Bottom Navigation (Mobile)

Fixed navigation with 5 icons:

- Home (feed), Discover (search), Check-In (center, elevated), Activity (notifications), Profile
- Active state with icon fill + subtle label

### Discovery/Search Interface

- Search bar with filters (Coffee/Tea, Style, Location)
- Trending section with horizontal scroll cards
- "Near You" map integration
- Category chips for quick filtering

### User Profile

- Cover photo area with profile avatar overlap
- Stats row: Check-ins, Following, Followers, Unique Drinks
- Tab navigation: Feed, Reviews, Badges, Wishlist
- Personal feed in masonry grid (2-column mobile, 3-column desktop)

## Interactive Patterns

- Pull-to-refresh on feeds
- Swipe gestures for card actions
- Bottom sheet modals for check-in flow
- Sticky headers on scroll
- Skeleton loading states for images

## Images

### Hero Images

**Landing Page**: Full-width hero (h-96 md:h-[600px]) featuring artful latte art or coffee brewing scene. Overlay with blurred-background CTA buttons for "Sign Up" and "Explore Cafés"

### Throughout App

- Check-in photos: User-generated, square or 4:3 crops
- Café photos: Wide landscape format showcasing ambiance
- Roaster photos: Product-focused, clean backgrounds
- Badge illustrations: Custom vector graphics for achievements

## Form Elements

- Rounded input fields (rounded-lg) with subtle borders
- Rating stars: Interactive tap/click with smooth fill animation
- Photo upload: Large dropzone with preview thumbnails
- Autocomplete dropdowns for café/drink selection

## Icon Library

**Heroicons** (via CDN) for all interface icons:

- Outline style for inactive states
- Solid style for active/selected states
- Consistent 24px size for navigation, 20px for inline actions

## Feed Architecture

- Infinite scroll main feed
- Story-style highlights for featured cafés/roasters at top
- Mix of check-ins, achievements, and recommendations
- "You might like" suggestions between organic content

**Accessibility**: Maintain WCAG 2.1 AA standards across all inputs, interactive elements, and content. Ensure tap targets minimum 44px, sufficient contrast ratios, and clear focus states.

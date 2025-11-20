# Yanck Design System

## Overview
This document outlines the creative, distinctive design system implemented for Yanck - avoiding generic "AI slop" aesthetics while maintaining a light, sophisticated appearance.

## Design Philosophy

### Core Principles
- **Bold & Geometric Typography**: Using distinctive font combinations that elevate the aesthetic
- **Cohesive Color Palette**: Warm light background with strategic accent colors
- **Motion & Delight**: Smooth animations and micro-interactions
- **Depth & Atmosphere**: Layered backgrounds and subtle visual effects

## Typography

### Font Families
- **Display/Headings**: `Bricolage Grotesque` (700-800 weight)
  - Distinctive, geometric sans-serif
  - Used for all headings (h1-h6)
  - Letter-spacing: -0.02em to -0.03em
  
- **Body Text**: `Manrope` (400-700 weight)
  - Clean, readable sans-serif
  - Used for paragraphs, buttons, and UI text
  - Excellent legibility at all sizes

### Typography Classes
- `.text-display` - Extra bold display text (font-weight: 800, letter-spacing: -0.03em)
- `.text-heading` - Bold heading text (font-weight: 700, letter-spacing: -0.02em)
- Regular body text uses the default Manrope font

## Color Palette

### Light Theme
```css
--background: 35 25% 97%        /* Warm cream #FAFAF7 */
--foreground: 0 0% 10%          /* Near black */

--primary: 185 65% 32%          /* Deep teal #0D7377 */
--primary-foreground: 35 25% 97%

--secondary: 14 90% 60%         /* Warm orange #FF6B35 */
--secondary-foreground: 0 0% 10%

--accent: 150 25% 45%           /* Sage green #4C7C65 */
--accent-foreground: 35 25% 97%

--muted: 35 20% 92%
--muted-foreground: 0 0% 45%

--border: 35 15% 88%
--radius: 0.75rem
```

### Usage Guidelines
- **Primary (Deep Teal)**: Main actions, primary buttons, branding
- **Secondary (Warm Orange)**: Accents, highlights, CTAs
- **Accent (Sage Green)**: Supporting elements, icons, subtle emphasis
- **Background**: Warm cream for sophistication and reduced eye strain

## Backgrounds

### Animated Mesh Background
```css
.mesh-bg
```
- Subtle animated radial gradients
- Creates depth without overwhelming content
- 20s animation cycle for gentle movement

### Gradient Background
```css
.gradient-bg
```
- Multiple layered radial gradients
- Static but creates visual interest
- Combines all three accent colors at low opacity

### Pattern Overlay
```css
.pattern-dots
```
- Subtle dot pattern for texture
- 24px grid spacing
- Low opacity (4%)

## Animations

### Page Transitions
```css
.page-enter
```
- Smooth fade-in on page load
- 0.4s ease-out duration

### Staggered Reveals
```css
.fade-in-up
.stagger-1 through .stagger-5
```
- Sequential element reveals
- Creates orchestrated page load
- 0.1s delay increment between elements
- Opacity 0→1 with 20px upward translation

### Floating Elements
```css
.float
```
- 6s ease-in-out infinite cycle
- 20px vertical movement
- Used for decorative elements

### Hover Effects
```css
.hover-lift
```
- Subtle lift on hover (-4px translateY)
- Smooth shadow transition
- 0.3s cubic-bezier timing

## Components

### Buttons
- **Rounded Corners**: `rounded-xl` (0.75rem)
- **Active State**: Scale to 98% on click
- **Primary Button**: Includes shimmer effect (`.btn-primary`)
- **Shadows**: Shadow increases on hover
- **Sizes**:
  - Small: h-8, px-3
  - Default: h-10, px-5
  - Large: h-12, px-8

### Cards
- **Border Radius**: `rounded-2xl` (1rem)
- **Elevated Style**: `.card-elevated`
  - Translucent background with backdrop blur
  - Subtle border transitions on hover
  - Shadow increases on hover
- **Hover Lift**: Works with `.hover-lift` class

### Inputs & Textareas
- **Border Radius**: `rounded-xl`
- **Border Width**: 2px for emphasis
- **Focus State**: 
  - Ring with 2px width
  - Border color changes to primary/40
  - Smooth transition (200ms)
- **Height**: 
  - Input: h-10 (2.5rem)
  - Textarea: min-h-20 (5rem)

### Badges
- **Shape**: Fully rounded (pill-shaped)
- **Font Weight**: Bold (700)
- **Padding**: px-3 py-1
- **Shadow**: Medium shadow with hover increase

## Layout Guidelines

### Spacing
- **Container Padding**: px-4 sm:px-6 lg:px-8
- **Section Padding**: py-12 to py-24 (larger for hero sections)
- **Component Spacing**: Consistent 6-8 unit gaps

### Navigation
- **Height**: h-20 (5rem) - larger for prominence
- **Background**: Semi-transparent card with backdrop blur
- **Border**: Subtle bottom border (border-border/50)
- **Logo**: Glowing effect with blur background

### Hero Sections
- **Heading Sizes**: 
  - Mobile: text-5xl
  - Desktop: text-7xl to text-8xl
- **Line Height**: 0.95 for display text
- **Accent Decorations**: 
  - Gradient text with bg-clip-text
  - Underline effects with skewed backgrounds

## Micro-interactions

### Button Shimmer
The `.btn-primary::before` pseudo-element creates a subtle shimmer effect on hover using a linear gradient that moves from left to right.

### Icon Glows
Icons in headers and feature cards have:
- Subtle blur background
- Color-coordinated glow effect
- Increased glow on hover (group-hover)

### Form Feedback
- Focus states are visually prominent (2px ring, border color change)
- Disabled states are obvious (50% opacity)
- Error states use destructive color with 2px border

## Responsive Design

### Breakpoints (Tailwind defaults)
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

### Typography Scale
Headings scale down on mobile:
- Desktop h1: text-7xl or text-8xl
- Mobile h1: text-5xl
- Proportional scaling for all heading levels

### Layout Adjustments
- Single column on mobile
- 2 columns at md breakpoint
- 3-4 columns at lg breakpoint for cards

## Accessibility

### Focus States
- Visible focus rings (2px)
- High contrast focus indicators
- Keyboard navigation support

### Color Contrast
- All text meets WCAG AA standards
- Primary color: 5.5:1 contrast ratio on light background
- Foreground text: 14:1 contrast ratio

### Motion
- All animations are subtle
- No rapid flashing or strobing
- Respects prefers-reduced-motion (can be implemented)

## Best Practices

### Do's
✓ Use the custom font stack consistently
✓ Apply rounded-xl or rounded-2xl for modern feel
✓ Add subtle shadows for depth
✓ Use the defined color palette exclusively
✓ Implement staggered animations for lists
✓ Apply hover effects for interactive elements

### Don'ts
✗ Don't mix different border radius values
✗ Avoid using generic system fonts
✗ Don't use harsh shadows or borders
✗ Avoid conflicting with the color palette
✗ Don't overuse animations (keep them subtle)
✗ Don't forget focus states

## Performance Considerations

- Animations use CSS transforms (GPU-accelerated)
- Backdrop blur is used sparingly
- Font files are optimized through Next.js font loading
- Gradient backgrounds are simple CSS (no images)

## Future Enhancements

Potential additions while maintaining the aesthetic:
- Dark mode variant with adjusted opacity and colors
- Additional animation patterns for data visualization
- Expanded component library (tabs, modals, etc.)
- Interactive element hover states
- Skeleton loading states with brand colors


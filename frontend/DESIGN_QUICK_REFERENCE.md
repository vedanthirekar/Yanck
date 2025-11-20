# Design System Quick Reference

## Common Patterns & Code Examples

### Typography

```tsx
// Large display heading (hero)
<h1 className="text-display text-7xl md:text-8xl tracking-tight">
  Your Heading
</h1>

// Section heading
<h2 className="text-heading text-4xl md:text-5xl tracking-tight">
  Section Title
</h2>

// Body text with emphasis
<p className="text-lg text-foreground/70 font-medium">
  Your content here
</p>
```

### Buttons

```tsx
// Primary button with all effects
<Button className="btn-primary font-bold shadow-xl shadow-primary/30">
  Click Me <ArrowRight className="ml-2 h-5 w-5" />
</Button>

// Outline button
<Button variant="outline" className="border-2 font-semibold">
  Secondary Action
</Button>

// Large button
<Button size="lg" className="px-8 py-6 text-base">
  Large Button
</Button>
```

### Cards

```tsx
// Elevated card with hover effect
<Card className="card-elevated hover-lift border-2">
  <CardHeader>
    <CardTitle className="text-heading text-xl">Title</CardTitle>
    <CardDescription className="text-base">Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Glowing Icons

```tsx
// Icon with glow effect
<div className="relative inline-block">
  <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
  <Bot className="h-8 w-8 text-primary relative" strokeWidth={2.5} />
</div>

// Icon with group hover (in cards)
<div className="relative inline-block group">
  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:blur-2xl transition-all" />
  <Icon className="h-10 w-10 text-primary relative" strokeWidth={2} />
</div>
```

### Backgrounds

```tsx
// Animated mesh background (full page)
<div className="min-h-screen mesh-bg">
  {/* Content */}
</div>

// Gradient background
<div className="min-h-screen gradient-bg">
  {/* Content */}
</div>

// Pattern overlay
<div className="pattern-dots p-8">
  {/* Content */}
</div>
```

### Animations

```tsx
// Fade in on load
<div className="fade-in-up">
  Content appears with animation
</div>

// Staggered list items
{items.map((item, idx) => (
  <div key={item.id} className={`fade-in-up stagger-${Math.min(idx + 1, 5)}`}>
    {item.content}
  </div>
))}

// Floating decorative element
<div className="float w-32 h-32 rounded-full bg-primary/5 blur-3xl" />
```

### Forms

```tsx
// Input with label
<div className="space-y-3">
  <Label className="text-base font-semibold">Field Label</Label>
  <Input 
    placeholder="Enter value..."
    className="h-12 text-base border-2"
  />
  <p className="text-sm text-foreground/60 font-medium">
    Helper text
  </p>
</div>

// Textarea
<Textarea
  placeholder="Enter text..."
  rows={4}
  className="text-base border-2 resize-none"
/>

// Select (custom styling)
<select className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-base font-medium focus:border-primary/40 focus:outline-none">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Status Badges

```tsx
// Success badge
<Badge variant="default" className="font-bold">
  Ready
</Badge>

// Warning badge
<Badge variant="secondary" className="font-bold">
  Processing
</Badge>

// Error badge
<Badge variant="destructive" className="font-bold">
  Error
</Badge>
```

### Chat Messages

```tsx
// User message
<div className="flex gap-4 justify-end">
  <div className="rounded-2xl px-5 py-4 bg-primary text-primary-foreground shadow-lg shadow-primary/20 max-w-[80%]">
    <p className="text-base font-medium leading-relaxed">
      User message here
    </p>
  </div>
  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
    <User className="h-6 w-6" strokeWidth={2.5} />
  </div>
</div>

// Assistant message
<div className="flex gap-4 justify-start">
  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
    <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
    <Bot className="h-6 w-6 text-primary relative" strokeWidth={2.5} />
  </div>
  <div className="rounded-2xl px-5 py-4 bg-card/80 backdrop-blur-sm border border-border/50 max-w-[80%]">
    <p className="text-base font-medium leading-relaxed">
      Assistant response
    </p>
  </div>
</div>
```

### Navigation

```tsx
<nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex h-20 items-center justify-between">
      <Link href="/" className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
          <Bot className="h-9 w-9 text-primary relative" strokeWidth={2.5} />
        </div>
        <span className="text-3xl font-display font-bold">Brand</span>
      </Link>
      {/* Nav items */}
    </div>
  </div>
</nav>
```

### Empty States

```tsx
<Card className="card-elevated text-center py-16 border-2">
  <CardContent>
    <div className="relative inline-block mb-6">
      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
      <Icon className="h-20 w-20 mx-auto text-primary relative" strokeWidth={2} />
    </div>
    <h3 className="text-heading text-2xl mb-3">
      No Items Yet
    </h3>
    <p className="text-foreground/70 mb-8 text-lg">
      Get started by creating your first item
    </p>
    <Button className="btn-primary font-bold">
      Create Item
    </Button>
  </CardContent>
</Card>
```

### Loading States

```tsx
// Centered loading spinner
<div className="flex justify-center items-center py-20">
  <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={2.5} />
</div>

// Inline loading
<Button disabled>
  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
  Loading...
</Button>
```

### Grid Layouts

```tsx
// Responsive card grid
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item, idx) => (
    <Card 
      key={item.id} 
      className={`card-elevated hover-lift border-2 fade-in-up stagger-${Math.min(idx + 1, 5)}`}
    >
      {/* Card content */}
    </Card>
  ))}
</div>

// Two-column layout
<div className="grid md:grid-cols-2 gap-8">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

## Color Usage

```tsx
// Primary color (teal) - main actions
className="bg-primary text-primary-foreground"

// Secondary color (orange) - accents, CTAs
className="bg-secondary text-secondary-foreground"

// Accent color (sage green) - supporting elements
className="bg-accent text-accent-foreground"

// Muted backgrounds
className="bg-muted text-muted-foreground"

// Borders
className="border border-border"
className="border-2 border-primary/30"  // Emphasized with color
```

## Spacing Scale

```tsx
// Small gap
className="gap-2"      // 0.5rem

// Medium gap
className="gap-4"      // 1rem

// Large gap
className="gap-6"      // 1.5rem

// Section spacing
className="py-12"      // Small section
className="py-24"      // Large section/hero

// Container padding
className="px-4 sm:px-6 lg:px-8"
```

## Pro Tips

1. **Always use `font-display` class for headings** - Ensures Bricolage Grotesque is applied
2. **Add `font-bold` or `font-semibold` to important text** - Increases visual hierarchy
3. **Use `strokeWidth={2.5}` on Lucide icons** - Makes them bolder and more prominent
4. **Layer backgrounds** - Combine mesh-bg with floating elements for depth
5. **Stagger animations** - Use on lists and grids for polished loading
6. **Add glow effects to icons** - Use the blur background pattern for visual interest
7. **Use 2px borders for emphasis** - Makes interactive elements stand out
8. **Apply shadow classes to buttons** - `shadow-lg shadow-primary/30` for depth
9. **Use `transition-all duration-200`** - Smooth all property changes
10. **Keep text contrast high** - Use `/70` opacity for secondary text

## Common Mistakes to Avoid

❌ Using generic font weights (400, 500)
✅ Use semibold (600) or bold (700) for prominence

❌ Small border radius (`rounded-md`)
✅ Use `rounded-xl` or `rounded-2xl`

❌ Thin borders (1px)
✅ Use `border-2` for interactive elements

❌ Plain backgrounds
✅ Add texture with `mesh-bg` or gradients

❌ No animations
✅ Add `fade-in-up` or `hover-lift`

❌ Small, timid buttons
✅ Make buttons prominent with size and shadows

❌ Low contrast text
✅ Keep text at 60-70% opacity minimum for readability


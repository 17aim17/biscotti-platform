// Class strings shared by storefront components. Values come from the
// restaurant's theme variables (lib/brand.ts).

// Lettering for buttons: letterspaced caps in "classic", plain in others.
export const buttonText =
  "font-semibold [text-transform:var(--sf-btn-case)] tracking-(--sf-btn-tracking) text-(length:--sf-btn-size)"

// Filled brand button.
export const solidButton = `inline-flex items-center justify-center gap-2 rounded-(--sf-radius-control) bg-(image:--sf-btn) text-white shadow-(--sf-btn-shadow) transition hover:brightness-110 ${buttonText}`

// Small letterspaced label above headings and on facts.
export const eyebrow = "text-[0.68rem] font-medium tracking-[0.3em] uppercase"

// Text inputs on forms.
export const inputClass =
  "h-12 w-full rounded-(--sf-radius-control) bg-(--sf-card) px-4 text-base ring-1 ring-(--sf-line) outline-none transition focus:ring-2 focus:ring-(--sf-ink)"

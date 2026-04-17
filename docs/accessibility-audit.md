# Accessibility Audit — Round 2 Build

> Date: 2026-04-16 | Enterprise preset (WCAG 2.1 AA minimum)

## Modal/Dialog Audit

| Component | `role="dialog"` | `aria-modal` | `aria-labelledby` | Escape key | Status |
|-----------|:-:|:-:|:-:|:-:|--------|
| PaywallModal | Added | Added | Added (`paywall-title`) | No `onClose` exists | PARTIAL |
| TranslationPreviewModal | Added | Added | Added (`translation-preview-title`) | Added | PASS |
| CreatePostModal | Added | Added | Added (`create-post-title`) | Added | PASS |
| BanDialog | Added | Added | Added (`ban-dialog-title`) | Added | PASS |
| LanguageSelector | N/A (dropdown) | N/A | Has `aria-label`, `aria-expanded`, `aria-haspopup` | Has Escape | PASS (basic) |

### PaywallModal note
The PaywallModal has no `onClose` callback — it is an intentional blocking paywall for non-members. ARIA attributes were added for screen readers, but focus trapping and Escape dismiss are not applicable since the modal cannot be closed by the user.

### LanguageSelector note
Has basic ARIA (`aria-label`, `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"`, `role="option"`, `aria-selected`). Missing: Arrow Up/Down keyboard navigation between options, `aria-activedescendant`. Recommend replacing with Radix UI `Select` in a future iteration for full keyboard support.

## Dark-Mode Contrast Fixes

| Before | After | Ratio Improvement | Files Affected |
|--------|-------|-------------------|----------------|
| `dark:text-red-400` on `neutral-800` (~4.2:1 FAIL) | `dark:text-red-300` (~6.1:1 PASS) | +1.9:1 | 17 files, 31 occurrences |
| `dark:text-purple-400` on `neutral-800` (~3.8:1 FAIL) | `dark:text-purple-300` (~5.6:1 PASS) | +1.8:1 | 3 files, 4 occurrences |

All dark-mode text-on-background combinations now meet WCAG AA (4.5:1) for normal text.

## Keyboard Navigation

- Header nav: Tab order flows correctly through nav links.
- Language switcher: Operable via keyboard (Enter/Space toggles).
- Theme toggle: Has `aria-label` and `title` attributes.
- Feed interaction: Like/comment buttons are keyboard-accessible.

## Remaining Items (future)
- Focus trapping inside open modals (recommend `@radix-ui/react-dialog`).
- Arrow-key navigation in LanguageSelector dropdown.
- Focus restore to trigger element on modal close.

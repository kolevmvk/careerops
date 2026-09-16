---
name: i18n
description: Locale set, language detection rules, and how translated career facts stay truthful. Load before adding a locale, a translated string, language detection, or any content that renders on the public site.
---

# Internationalisation

Locales in the first version: **`en`, `de`, `sr`**. English is the source of
truth and the fallback. German covers ATOSS, TimeTac and SD Worx; Serbian covers
the region. `fr`, `sl` and `bg` are deliberately deferred until a target company
justifies the maintenance, and the infrastructure is built so adding one is a
content task rather than an engineering one.

## Two kinds of text, different rules

**Interface strings** are ordinary translation: navigation, labels, the consent
banner, error messages. They live in message catalogues and may be translated
freely.

**Career facts are not interface strings.** They come from `public_facts` and
they are claims about a person's work. A translated fact is still a claim, so it
carries the same obligations as the English one:

- A translation is a new row against the same fact, never an overwrite.
- It passes the same source validator (SPECIFICATION §8). A German rendering
  that introduces a number, date or proper name the source does not support is
  rejected exactly as the English one would be.
- An untranslated fact falls back to English rather than being hidden or
  machine-translated on the fly. A reader seeing English is fine; a reader
  seeing an invented claim is not.
- Machine translation may draft, never publish. A draft translation is
  unverified and unverified facts do not reach a public surface.

## Detection

Detection is a default, never a decision the visitor cannot undo.

1. An explicit choice wins, remembered in a `necessary` cookie - the preference
   is a functional cookie and needs no consent.
2. Otherwise negotiate `Accept-Language` against the supported set.
3. Otherwise English.

A Serbian speaker working in Munich may want the English page; never trap
anyone in a locale because of their headers or their IP. **Never detect by IP** -
it is wrong often, it is a personal data question, and the header is already
there.

Detection must not break caching. Each locale is a separate static path
(`/`, `/de`, `/sr`), negotiation issues a redirect, and the pages themselves
stay cacheable. A page that varies per visitor cannot be served from a CDN,
which would cost more speed than the detection is worth.

## Serbian script

Serbian is written in both Latin and Cyrillic. Default to Latin for a
professional technical audience, offer a toggle, and make sure fonts are
subset for Cyrillic if it renders.

## Mechanics

- Locale is a path segment, not a query parameter or a cookie-only state.
- `hreflang` on every page for every locale, plus `x-default` pointing at
  English.
- `lang` on `<html>` matches what is rendered, always.
- Dates, numbers and currency go through `Intl`, never hand-formatted. A German
  reader sees `3.000 €`, an English reader `€3,000`.
- Never concatenate translated fragments into a sentence; word order differs.
  One message, one complete sentence, with placeholders.
- German runs roughly 30% longer than English. Layouts are checked in German at
  the narrowest breakpoint, not in English.

## Before adding a locale

- [ ] Every interface string has a value, none fall through to a key
- [ ] Every published fact either has a verified translation or falls back to English
- [ ] `hreflang` and `x-default` updated
- [ ] Layout checked at 360px in the new locale
- [ ] Fonts subset for the scripts the locale needs

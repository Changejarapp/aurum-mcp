# Tool reference

All 9 tools, their input schemas, and an example response sketch.

---

## `list_components`

Enumerate all Aurum components in the current manifest, grouped by family,
with one-line descriptions.

**Input:**
```jsonc
{ "platform": "android" | "ios" | "all" }   // default: "all"
```

**Returns:** markdown with H2 sections per family, bulleted component
list with summary + supported platforms.

---

## `get_component`

Fetch full details for a single component: KDoc, Compose signature,
parameters, previews, Figma deeplink, Code Connect path, gallery URL.

**Input:**
```jsonc
{ "name": "AurumChip", "platform": "android" | "ios" | "all" }
```

**Returns:** markdown — name + summary, metadata block, KDoc body,
Kotlin code-fence with the signature, parameters list, preview names.

---

## `list_tokens`

Token tables. Categories: `color` (semantic + visual palette), `spacing`,
`radius`, `borderWidth`, `iconSize`, `elevation`, `typography`.

**Input:**
```jsonc
{ "category": "color" }   // optional; omit for a summary across all categories
```

**Returns:** markdown tables.

---

## `search_icons`

Search the Aurum icon catalog by name fragment or category.

**Input:**
```jsonc
{ "query": "arrow", "category": "Navigation" }
```

**Returns:** matching icons with drawable resource names, paired
line/fill Figma node IDs, and Compose paths.

---

## `get_icon`

Full details for a single icon by name.

**Input:**
```jsonc
{ "name": "ChevronRight", "weight": "line" | "fill" | "both" }
```

**Returns:** drawable paths, Compose usage snippet, line + fill Figma
deeplinks.

---

## `get_changelog`

Return the changelog as markdown.

**Input:**
```jsonc
{ "version": "Unreleased" | "0.1.5" | "all" }   // default: "Unreleased"
```

**Returns:** the requested version's section with all `Added` / `Changed`
/ `Fixed` / etc. bullets preserved.

---

## `lookup_figma_node`

Reverse-lookup: given a Figma node ID or full URL, return matching
Aurum components, Code Connect mappings, and icons.

**Input:**
```jsonc
{ "nodeIdOrUrl": "5126:2507" }
// also accepts: "5126-2507", or any URL containing the ID
```

**Returns:** matched components + icons + Code Connect mappings.

---

## `search`

Free-text search across all content (components, tokens, icons,
changelog). Returns top hits with the next-tool suggestion.

**Input:**
```jsonc
{ "query": "negative feedback color", "limit": 5 }
```

**Returns:** markdown list of matches, each with the kind (component /
token / icon / changelog) and the next tool to call.

---

## `get_aurum_version`

Manifest provenance — version, SHA, generation timestamp, platforms.

**Input:** none.

**Returns:** structured markdown listing the library version, source
SHA, manifest SHA, generation timestamp, Figma file key, and gallery
URL. Use this to verify which Aurum snapshot the LLM is reasoning
about before answering version-specific questions.

---

## Footer convention

Every content tool's response ends with a footer like:

```
---
*aurum aurum-android@0.1.5 · manifest sha `9af3b21c` · generated 2026-05-03 12:00:00 UTC*
```

This gives the LLM (and any human reading a conversation transcript) a
self-checkable provenance signal.

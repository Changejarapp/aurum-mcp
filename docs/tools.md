# Tool reference

Full per-tool reference for all 12 tools surfaced by `aurum-mcp`. Each
section gives:

- **What it does** — the description as the LLM sees it.
- **Input** — the JSON schema fields and any quirks.
- **Output** — what comes back as markdown text and (for 10 of 12) as
  structured JSON.
- **Example prompts** — what to type at your LLM client.
- **Common follow-ups** — which tool you'd call next in a multi-step flow.

For ready-to-paste prompts grouped by use case, see
[`cookbook.md`](cookbook.md).

All tools are read-only. All have these annotations on the wire:
`readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`,
`openWorldHint: false` — clients can use these to skip "this tool may
make changes" confirmation prompts.

Every content response ends with a footer like:

```
---
*aurum aurum-android@0.1.5 · manifest sha `9af3b21c` · generated 2026-05-03 12:00:00 UTC*
```

Use it (or `aurum_get_aurum_version`) to verify which Aurum snapshot
the conversation is grounded in.

---

## Discovery

### `aurum_search`

Free-text search across components, tokens, icons, and changelog
entries. Powered by a lunr.js index over titles and bodies. The
quickest way in for any natural-language query.

**Input:**
```jsonc
{
  "query": "negative feedback color",  // required; lunr syntax supported
  "limit": 5                            // optional; 1–20, default 5
}
```

**Lunr quick reference:** boosts (`title:chip^2`), fuzzy (`chp~1`),
prefix (`chev*`), exclusion (`-icon`).

**Output:**
- Markdown list of hits, each with kind (component/token/icon/changelog)
  and a `next-tool-to-call` hint.
- `structuredContent.results: Array<{ title, kind, next, score }>`.

**Example prompts:**
- *"Search Aurum for anything about negative feedback colours."*
- *"What does Aurum have for radio buttons?"*

**Common follow-ups:** `aurum_get_component`, `aurum_get_icon`,
`aurum_get_token_value`, `aurum_get_changelog` — each hit's `next`
field tells the model which one.

**Don't use this for** icon-shaped queries — `aurum_search_icons` has
stronger name-token matching and returns Figma metadata.

---

### `aurum_list_components`

Return the full Aurum component catalog: composable name, family,
one-line summary, and platforms.

**Input:**
```jsonc
{ "platform": "all" }   // "android" | "ios" | "all"; default "all"
```

(`platform` is reserved for the future iOS rollout. Today it always
resolves to `android`.)

**Output:**
- Markdown grouped by family (button, chip, navigation, …).
- `structuredContent.components: Array<{ name, family, summary, platforms }>`.

**Example prompts:**
- *"Show me every Aurum component grouped by family."*
- *"Give me the full Aurum component catalog."*

**Common follow-up:** `aurum_get_component` for a specific composable.

---

### `aurum_list_tokens`

List Aurum design tokens by category. Categories: `color` (semantic +
visual palette), `spacing`, `radius`, `borderWidth`, `iconSize`,
`elevation`, `typography`. Omit `category` for a counts-only summary.

**Input:**
```jsonc
{ "category": "color" }   // optional; one of the 7 categories
```

**Output:**
- Markdown tables. For `color`: semantic groups (surface, interactive,
  feedback, …) followed by the visual palette (purple, blue, …).
- `structuredContent.tokens: <category-shape>`.

**Example prompts:**
- *"List every Aurum spacing token."*
- *"Show me the Aurum colour tokens — semantic groups and the raw palette."*
- *"What typography roles does Aurum have?"*

**Don't use this for** a single token point-lookup — use
`aurum_get_token_value`. It returns ~30 tokens of context, not 100+.

---

## Component depth

### `aurum_get_component`

Fetch full details of a single Aurum component by name: KDoc, Compose
signature, every parameter (types/defaults/per-param docs), preview
function names, Figma deeplink, Code Connect path, gallery URL.

**Input:**
```jsonc
{
  "name": "AurumChip",          // required; CASE-SENSITIVE; exact composable name
  "platform": "all"
}
```

**Output:**
- Markdown: heading, summary, metadata block (family/platforms/Figma/gallery/source),
  `## Description` (KDoc), `## Signature` (Kotlin code fence), `## Parameters`
  (typed list with defaults + docs), `## Previews` (preview function names).
- `structuredContent.component: Component` — the full component projection
  from the manifest schema.

**Example prompts:**
- *"How do I use `AurumChip`? Give me the full API."*
- *"Show me the parameters for `AurumTopAppBar`."*

**Common follow-ups:** `aurum_get_code_connect_snippet` for just the
canonical usage block; `aurum_find_components_by_token` to see what
tokens the component consumes.

**Don't use this when** the user only wants the canonical-usage Kotlin
snippet — `aurum_get_code_connect_snippet` is leaner.

---

### `aurum_get_code_connect_snippet`

Return ONLY the canonical Code Connect `Example()` body for a component
as a Kotlin code fence — no preamble, no parameter table, no version
footer. Same string Figma's plugin pastes into a designer's clipboard.

**Input:**
```jsonc
{ "component": "AurumChip" }   // required; CASE-SENSITIVE
```

**Output:** a single Kotlin code fence. No structured payload.

> **Note:** snippet bodies are populated by the upstream gallery
> generator. Components without a captured snippet return a clear
> error pointing at the `.figma.kt` file path.

**Example prompts:**
- *"Just paste the canonical AurumChip usage code."*
- *"Show me how `AurumRadioButton` is called in code, no fluff."*

**Common follow-up:** none — this is a leaf tool.

---

## Tokens

### `aurum_get_token_value`

Point-lookup a single token by qualified name (`surface.bgPageBase`,
`spacing.s12`, `typography.bodyMRegular`, `elevation.level1`).
Returns the value (hex/dp/sp/etc.), Compose accessor, and Figma path.

**Input:**
```jsonc
{ "name": "surface.bgPageBase" }   // required; qualifier prefix is required
```

**Qualifier prefixes:** `<group>.<leaf>` for semantic colours (e.g.
`surface.bgPageBase`); `palette.<leaf>` for visual palette swatches;
`spacing.<leaf>`, `radius.<leaf>`, `borderWidth.<leaf>`,
`iconSize.<leaf>`, `elevation.<leaf>`, `typography.<leaf>` for the
rest. Bare leaf names trigger a fuzzy-candidate hint, not a value.

**Output:**
- Markdown: kind, Compose accessor, value table.
- `structuredContent.token: { name, kind, composeAccessor, value }`.

**Example prompts:**
- *"What's the hex of `surface.bgPageBase`?"*
- *"What does `spacing.s12` resolve to in dp?"*
- *"Show me the typography role `bodyMRegular`."*

**Common follow-up:** `aurum_find_components_by_token` to see who uses it.

---

### `aurum_find_components_by_token`

Reverse index: given a token name (qualified or bare leaf), return
components whose source / KDoc / param defaults reference it.

**Input:**
```jsonc
{ "token": "interactive.bgPrimary" }   // required; qualified or bare
```

**Output:**
- Markdown list of matched components with `matchedIn:
  signature|kdoc|param-default` per match.
- `structuredContent.matches: Array<{ name, family, summary, matchedIn[],
  galleryUrl, sourcePath }>`.

> **v1 manifest caveat:** this is a best-effort regex over the
> manifest's component metadata (no precise reverse index yet). Schema
> v2 will surface a `component.relatedTokens[]` field that this tool
> will switch to for exact matches.

**Example prompts:**
- *"Which components consume `surface.bgPageBase`?"*
- *"Where is `spacing.s12` used in Aurum?"*

**Common follow-up:** `aurum_get_component` for any match's full API.

---

## Icons

### `aurum_search_icons`

Substring search across the Aurum icon catalog by name fragment and/or
category. Returns each match with line and fill drawables, Figma node
IDs, and Compose accessor.

**Input:**
```jsonc
{
  "query": "arrow",          // required; substring, case-insensitive
  "category": "Navigation"   // optional; case-insensitive category filter
}
```

Pass an empty `query` with a `category` filter to enumerate every icon
in that category.

**Output:**
- Markdown list of matches.
- `structuredContent.icons: Array<{ name, category, lineDrawable,
  fillDrawable, lineFigmaNodeId, fillFigmaNodeId, lineFigmaUrl,
  fillFigmaUrl, composeAccessor }>`.

**Example prompts:**
- *"Find the Aurum back-arrow icon."*
- *"List every icon in the `Navigation` category."*
- *"Is there an icon for delete or trash?"*

**Common follow-up:** `aurum_get_icon` for the full canonical snippet.

**Don't use** `aurum_search` for icon queries — this one has stronger
name-token matching and per-variant Figma metadata.

---

### `aurum_get_icon`

Fetch full details for a single Aurum icon by name. Returns drawable
paths, Compose accessor, paired Figma deeplinks, and a ready-to-paste
`AurumIcon(...)` Compose snippet.

**Input:**
```jsonc
{
  "name": "ChevronRight",     // required; case-insensitive
  "weight": "both"            // "line" | "fill" | "both"; default "both"
}
```

**Output:**
- Markdown: name, category, per-variant block, Compose usage code fence.
- `structuredContent.icon: Icon`.

**Example prompts:**
- *"How do I render the Aurum `ChevronRight` icon? Give me the snippet."*
- *"Show me the filled variant of `Heart`."*

**Common follow-up:** `aurum_lookup_figma_node` if you have the Figma
node ID instead of the name.

---

## Designer flow

### `aurum_lookup_figma_node`

Reverse-lookup from a Figma node ID (`5126:2507` or `5126-2507`) or any
Figma URL containing one to the matching Aurum content: components,
Code Connect mappings, and/or icons.

**Input:**
```jsonc
{ "nodeIdOrUrl": "5126:2507" }
// also accepts "5126-2507" or any URL like
// https://www.figma.com/design/<file>/...?node-id=5126-2507
```

**Output:**
- Markdown sections: `## Aurum components`, `## Icons`, `## Code Connect mappings`.
- `structuredContent.{ nodeId, components, icons, codeConnect }`.

**Example prompts:**
- *"I'm looking at Figma node `5126:2507`, what code is it?"*
- *"Map this Figma URL to an Aurum component: <URL>"*

**Common follow-ups:** `aurum_get_component` or
`aurum_get_code_connect_snippet` for the matched composable.

---

## Provenance

### `aurum_get_changelog`

Return one or more Aurum changelog entries as markdown. Default returns
the `[Unreleased]` section.

**Input:**
```jsonc
{ "version": "0.1.5" }   // optional; "Unreleased" | semver | "all"
```

Version strings are case-insensitive.

**Output:** markdown for the requested version, with all
`Added` / `Changed` / `Fixed` / etc. bullets preserved. No structured
payload — narrative content only.

**Example prompts:**
- *"What changed in Aurum recently? Show me the Unreleased section."*
- *"What landed in `aurum@0.1.5`?"*
- *"Give me the full Aurum changelog."*

**Don't use this** to browse the implementation — use
`aurum_get_component` for the current API surface of a composable.

---

### `aurum_get_aurum_version`

Return the Aurum library version, source SHA, manifest SHA, generation
timestamp, platforms, Figma file key, and gallery URL of the snapshot
this MCP currently serves.

**Input:** none.

**Output:**
- Markdown bullet list.
- `structuredContent: { aurum, meta }` — the canonical version block.

**Example prompts:**
- *"What version of Aurum am I on?"*
- *"What's the manifest SHA and generation timestamp?"*

**Common follow-up:** none — this is a meta-tool, typically called
once at the top of a long conversation to pin provenance.

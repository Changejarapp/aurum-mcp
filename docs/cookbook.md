# Prompt cookbook

Ready-to-paste prompts grouped by use case. Drop them straight into
your LLM client (Claude Code, Cursor, Copilot CLI, Gemini, Claude
Desktop) — the `aurum-mcp` tool descriptions guide the model to the
right tool path.

Tip: paste your real situation/snippet alongside the prompt for richer
answers ("…here's the Compose I have so far: `<snippet>`").

---

## Discovery

### "What's even in Aurum?"

> Show me every Aurum component grouped by family, with one-line
> summaries. Then list the design-token categories with counts.

Tools used: `aurum_list_components`, `aurum_list_tokens` (no category).

### "Find me something for X"

> I need an Aurum component for showing transient negative feedback to
> the user. Search and recommend the best match.

Tools used: `aurum_search` → `aurum_get_component`.

---

## Component lookup

### "How do I use AurumX?"

> Show me how to use `AurumChip`. I want the full API: parameters,
> defaults, KDoc, the canonical usage snippet, and a link to the
> Figma source.

Tools used: `aurum_get_component` → `aurum_get_code_connect_snippet`.

### "Just paste the code"

> I just need the canonical `AurumRadioGroup` usage snippet. No prose.

Tools used: `aurum_get_code_connect_snippet`.

### "Compose code I can drop in"

> I'm building a settings screen and need a `AurumTopAppBar` with a
> back action and a title. Use Aurum's canonical usage and inline the
> right tokens.

Tools used: `aurum_get_component` (for params) →
`aurum_get_code_connect_snippet` (for canonical body) →
`aurum_get_token_value` if specific tokens are referenced.

---

## Tokens

### "What's the value of X?"

> What's the hex value of `surface.bgPageBase`? Also show me the Compose
> accessor I'd use.

Tools used: `aurum_get_token_value`.

### "What spacing should I use here?"

> List every Aurum spacing token with its dp value. I'm picking the
> right one for a 12-dp gap.

Tools used: `aurum_list_tokens` (`category: "spacing"`).

### "Where is X used?"

> Which Aurum components consume `interactive.bgPrimary`? I want to
> understand the blast radius before changing it.

Tools used: `aurum_find_components_by_token` →
`aurum_get_component` for each match.

---

## Icons

### "Find me an icon"

> Find the Aurum icon for delete or trash. Give me both line and fill
> variants with their Figma node IDs and the Compose accessor.

Tools used: `aurum_search_icons` → `aurum_get_icon`.

### "Use this icon"

> Render the `ChevronRight` icon in Compose. Use the line variant.

Tools used: `aurum_get_icon` (`weight: "line"`).

---

## Designer flow

### "I'm looking at this Figma node"

> I'm looking at Figma node `5126:2507`. What Aurum component is this,
> and how is it called in code?

Tools used: `aurum_lookup_figma_node` → `aurum_get_component` →
`aurum_get_code_connect_snippet`.

### "From a Figma URL"

> https://www.figma.com/design/abc123/Aurum?node-id=5126-2507 — what
> is this?

Tools used: `aurum_lookup_figma_node` (URL parsed automatically).

---

## Releases & provenance

### "What's new?"

> What changed in the most recent Aurum release? Then show me the
> Unreleased section so I know what's pending.

Tools used: `aurum_get_changelog` (specific version) →
`aurum_get_changelog` (`Unreleased`).

### "What version am I on?"

> What version of Aurum is this MCP serving? Print the manifest SHA
> and generation timestamp so I can pin this conversation to a snapshot.

Tools used: `aurum_get_aurum_version`.

---

## Combining tools

### "Audit my screen against Aurum"

> Here's a Compose screen I wrote: `<snippet>`. Audit every component
> reference against Aurum: confirm each composable exists, flag any
> hard-coded colours/spacings that have a token equivalent, and
> suggest the canonical `Example()` snippet for any non-canonical
> usage.

Tools used: `aurum_search` (per unfamiliar name) →
`aurum_get_component` (per confirmed match) →
`aurum_get_token_value` (per hard-coded value) →
`aurum_get_code_connect_snippet` (per non-canonical usage).

### "Build me a card"

> Build me an Aurum-compliant Compose card with a title, body text,
> and a primary button. Use Aurum components only; no hand-rolled
> backgrounds, no hard-coded colours/spacings — only token references.

Tools used: `aurum_search` ("card") → `aurum_get_component` (for each
matched component) → `aurum_list_tokens` (`category: "spacing"`) →
`aurum_get_token_value` (per token reference).

---

## When the model picks the wrong tool

If you find the model reaching for `aurum_search` when it should use
`aurum_search_icons`, name the tool explicitly:

> Use `aurum_search_icons` to find the back-arrow icon.

Or invert: if you want broad search, say "search across components
*and* tokens *and* icons" — that signals `aurum_search` is right.

---

## Where do these prompts live in the manifest?

Every tool-call answer is grounded in `data/manifest.json`, which is
auto-synced from the live Aurum gallery
([`changejarapp.github.io/aurum-android/data/manifest.json`](https://changejarapp.github.io/aurum-android/data/manifest.json)).
The version footer on every response makes it easy to spot when an
answer is grounded in a stale snapshot — restart your client to pick up
the latest if so.

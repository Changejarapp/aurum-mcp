/**
 * Server-level instructions surfaced once on `initialize`. Lands in the
 * model's system context for the whole connection — guides cross-tool
 * routing so the per-tool descriptions don't have to repeat it.
 *
 * Keep under ~500 chars: it's loaded on every connection.
 */

export const AURUM_PLAYBOOK = `aurum-mcp surfaces the Aurum Design System (Compose, Android today; iOS later) as a closed corpus of components, tokens, icons, Figma node mappings, and changelog entries.

Routing:
- Vague natural-language query → \`aurum_search\` (free-text across components/tokens/icons/changelog), then drill in with \`aurum_get_component\` / \`aurum_get_icon\` / \`aurum_get_token_value\`.
- Known component name → \`aurum_get_component\` directly. For canonical usage code, follow with \`aurum_get_code_connect_snippet\`.
- Token by name → \`aurum_get_token_value\`. Token by what-uses-it → \`aurum_find_components_by_token\`. Full table → \`aurum_list_tokens\`.
- Icon search → \`aurum_search_icons\` (NOT \`aurum_search\` — that one excludes icon-name tokenization heuristics).
- Designer pasting a Figma node ID or URL → \`aurum_lookup_figma_node\`.
- Version / "what am I reasoning about?" → \`aurum_get_aurum_version\`.

Every content tool returns the version footer + manifest SHA so any answer is traceable.`;

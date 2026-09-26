/**
 * answer-length — pick an answer length cap right after pressing Enter.
 *
 * Location: ~/.pi/agent/extensions/answer-length.ts (auto-discovered, global)
 *
 * Flow:
 *   1. You type a prompt and press Enter.
 *   2. If no cap is active, a modal offers 50/100/200/300/500 words, a custom
 *      number, or Unlimited. Digit keys 1-7 jump straight to an option.
 *   3. Your prompt text is forwarded UNCHANGED (no `input` transform). The cap is
 *      injected in `before_agent_start` as a system prompt directive, which pi
 *      keeps for every turn of the run and clears when the run settles.
 *   4. The choice is sticky: later prompts reuse it silently until `/len off`.
 *
 * This is a soft limit: the model is asked, not forced.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder, getAgentDir } from "@earendil-works/pi-coding-agent";
import { Container, type KeyId, matchesKey, SelectList, type SelectItem, Text } from "@earendil-works/pi-tui";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Numeric options shown in the modal, in order. */
const LIMITS = [50, 100, 200, 300, 500];

/** One-line hints rendered under each numeric option. */
const HINTS: Record<number, string> = {
  50: "2-3 sentences",
  100: "one short paragraph",
  200: "a few tight paragraphs",
  300: "about one screen",
  500: "long but bounded",
};

/** Bounds for the "type a number" option. */
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 100000;

/**
 * true  → picking "Unlimited" (or Esc) leaves the cap unset and the modal asks
 *         again on the next prompt.
 * false → picking "Unlimited" is remembered as a decision, so the modal stops
 *         asking until `/len` is used.
 */
const ASK_AGAIN_WHEN_UNLIMITED = true;

/** true → also mirror the choice to ~/.pi/agent/answer-length.json and reuse it in new sessions. */
const PERSIST_ACROSS_SESSIONS = false;

const ENTRY_TYPE = "answer-length";
const STATUS_KEY = "answer-length";
const CUSTOM_VALUE = "custom";
const UNLIMITED_VALUE = "unlimited";
const DIGITS: KeyId[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

type Pick =
	| { kind: "limit"; words: number }
	| { kind: "unlimited" }
	| { kind: "cancel" };

interface StateData {
	active: number | null;
	armed: boolean;
}

/** Shape stored in the `answer-length` custom session entry. */
type EntryTypeData = StateData;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Active word cap for the final answer. null = no cap. */
let active: number | null = null;
/** Whether the modal is allowed to appear on the next qualifying prompt. */
let armed = true;
/** Re-entrancy guard for the picker. */
let picking = false;

function settingsPath(): string {
	return join(getAgentDir(), "answer-length.json");
}

function loadSettingsFile(): StateData | undefined {
	try {
		const path = settingsPath();
		if (!existsSync(path)) return undefined;
		const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<StateData>;
		if (typeof raw?.active === "number" || raw?.active === null) {
			return { active: raw.active ?? null, armed: typeof raw.armed === "boolean" ? raw.armed : true };
		}
	} catch {
		// corrupt or unreadable settings file → fall back to defaults
	}
	return undefined;
}

function saveSettingsFile(): void {
	if (!PERSIST_ACROSS_SESSIONS) return;
	try {
		writeFileSync(settingsPath(), `${JSON.stringify({ active, armed } satisfies StateData, null, 2)}\n`, "utf8");
	} catch {
		// never fail a prompt because of a settings write
	}
}

/** The exact sentence the model receives. */
function directive(words: number): string {
	return `Reply using less than ${words} words in your final answer (tool calls exempt).`;
}

function statusText(): string | undefined {
	return active === null ? undefined : `⚖ <${active} words`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function syncFooter(ctx: ExtensionContext): void {
	try {
		ctx.ui.setStatus(STATUS_KEY, statusText());
	} catch {
		// UI may be tearing down; the status is cosmetic
	}
}

/** Apply a choice: update state, persist a session entry, refresh the footer. */
function commitLimit(words: number | null, ctx: ExtensionContext, opts: { forceArmed?: boolean } = {}): void {
	active = words;
	if (opts.forceArmed !== undefined) {
		armed = opts.forceArmed;
	} else if (words === null) {
		armed = ASK_AGAIN_WHEN_UNLIMITED;
	} else {
		armed = false;
	}
	piAppend();
	saveSettingsFile();
	syncFooter(ctx);
	ctx.ui.notify(
		words === null ? "Answer length: unlimited" : `Answer length: less than ${words} words`,
		"info",
	);
}

/**
 * Deferred in the factory below so state writes and entry writes stay in one place.
 * Reassigned to pi.appendEntry once the extension is loaded.
 */
let piAppend: () => void = () => {};

/** Show the modal and return the user's decision. */
async function pickLength(ctx: ExtensionContext): Promise<Pick> {
	const items: SelectItem[] = [
		...LIMITS.map((n) => ({ value: String(n), label: `~${n} words`, description: HINTS[n] })),
		{ value: CUSTOM_VALUE, label: "Type a number…", description: `any cap (${CUSTOM_MIN}-${CUSTOM_MAX})` },
		{ value: UNLIMITED_VALUE, label: "Unlimited", description: "no length constraint" },
	];

	const target = active !== null ? String(active) : UNLIMITED_VALUE;
	const initialIndex = Math.max(0, items.findIndex((it) => it.value === target));

	const picked = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
		const container = new Container();
		let settled = false;
		const finish = (value: string | null) => {
			if (settled) return;
			settled = true;
			done(value);
		};

		container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
		container.addChild(
			new Text(
				theme.fg("accent", theme.bold("Answer length limit")) +
					(active === null ? "" : theme.fg("muted", `   current: <${active} words`)),
				1,
				0,
			),
		);

		const list = new SelectList(items, Math.min(items.length, 8), {
			selectedPrefix: (t) => theme.fg("accent", t),
			selectedText: (t) => theme.fg("accent", t),
			description: (t) => theme.fg("muted", t),
			scrollInfo: (t) => theme.fg("dim", t),
			noMatch: (t) => theme.fg("warning", t),
		});
		list.onSelect = (item) => finish(item.value);
		list.onCancel = () => finish(null);
		list.setSelectedIndex(initialIndex);
		container.addChild(list);

		container.addChild(
			new Text(theme.fg("dim", "1-7 select • ↑↓ navigate • enter confirm • esc keep unlimited"), 1, 0),
		);
		container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

		return {
			render: (width: number) => container.render(width),
			invalidate: () => container.invalidate(),
			handleInput: (data: string) => {
				if (settled) return;
				for (let i = 0; i < items.length && i < DIGITS.length; i++) {
					if (matchesKey(data, DIGITS[i])) {
						finish(items[i].value);
						return;
					}
				}
				list.handleInput(data);
				tui.requestRender();
			},
		};
	});

	if (picked === null || picked === undefined) return { kind: "cancel" };
	if (picked === UNLIMITED_VALUE) return { kind: "unlimited" };

	if (picked === CUSTOM_VALUE) {
		for (;;) {
			const raw = await ctx.ui.input("Custom word cap:", "e.g. 750");
			if (raw === undefined) return { kind: "cancel" };
			const n = Number(raw.trim());
			if (Number.isInteger(n) && n >= CUSTOM_MIN && n <= CUSTOM_MAX) return { kind: "limit", words: n };
			ctx.ui.notify(`Enter a whole number between ${CUSTOM_MIN} and ${CUSTOM_MAX}`, "warning");
		}
	}

	const n = Number(picked);
	return Number.isInteger(n) ? { kind: "limit", words: n } : { kind: "cancel" };
}

/** Whether a submitted input should be considered for the modal. */
function qualifies(text: string, source: string, streaming: string | undefined, ctx: ExtensionContext): boolean {
	if (ctx.mode !== "tui" || !ctx.hasUI) return false;
	if (source !== "interactive") return false; // never re-fire on extension/rpc input
	if (streaming) return false; // steer / followUp must not block the run
	if (picking) return false;
	const trimmed = text.trim();
	if (!trimmed) return false;
	if (trimmed.startsWith("/") || trimmed.startsWith("!")) return false; // commands, skills, bash
	if (active !== null || !armed) return false; // ask once, then reuse
	return true;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function answerLength(pi: ExtensionAPI): void {
	piAppend = () => pi.appendEntry<EntryTypeData>(ENTRY_TYPE, { active, armed });

	// Restore the sticky choice when a session starts or is resumed. Reset first so a
	// new session never inherits the previous session's cap.
	pi.on("session_start", async (_event, ctx) => {
		active = null;
		armed = true;
		let restored: StateData | undefined;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
				restored = entry.data as StateData | undefined;
			}
		}
		if (restored) {
			active = typeof restored.active === "number" ? restored.active : null;
			armed = restored.armed !== false;
		} else if (PERSIST_ACROSS_SESSIONS) {
			const file = loadSettingsFile();
			if (file) {
				active = file.active;
				armed = file.armed;
			}
		}
		syncFooter(ctx);
	});

	// After Enter: ask (once) whether to cap the answer. Never rewrites the prompt.
	pi.on("input", async (event, ctx) => {
		if (!qualifies(event.text, event.source, event.streamingBehavior, ctx)) {
			return { action: "continue" };
		}
		picking = true;
		try {
			const pick = await pickLength(ctx);
			if (pick.kind === "limit") commitLimit(pick.words, ctx);
			else if (pick.kind === "unlimited") commitLimit(null, ctx);
		} finally {
			picking = false;
		}
		return { action: "continue" };
	});

	// Inject the cap into the system prompt for this run. Append, never replace:
	// pi chains `before_agent_start` systemPrompt results across extensions.
	pi.on("before_agent_start", async (event, ctx) => {
		syncFooter(ctx);
		if (active === null) return undefined;
		return { systemPrompt: `${event.systemPrompt}\n\n${directive(active)}` };
	});

	// /len            open the modal
	// /len 200        set a cap (sticky)
	// /len off        clear the cap and ask again on the next prompt
	// /len status     show the current cap
	pi.registerCommand("len", {
		description: "Set or clear the answer length cap: /len [50|100|200|300|500|<n>|off|status]",
		getArgumentCompletions: (argumentPrefix) => {
			const values = [...LIMITS.map(String), "off", "status", "ask"];
			const prefix = argumentPrefix ?? "";
			return values
				.filter((v) => v.startsWith(prefix))
				.map((v) => ({ value: v, label: v, description: v === "off" ? "clear cap + ask again" : undefined }));
		},
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim().toLowerCase();

			if (!arg || arg === "ask") {
				if (ctx.mode !== "tui") {
					ctx.ui.notify("Answer length picker needs the interactive TUI", "warning");
					return;
				}
				picking = true;
				try {
					const pick = await pickLength(ctx);
					if (pick.kind === "limit") commitLimit(pick.words, ctx);
					else if (pick.kind === "unlimited") commitLimit(null, ctx, { forceArmed: true });
				} finally {
					picking = false;
				}
				return;
			}

			if (arg === "off" || arg === "clear" || arg === "none") {
				commitLimit(null, ctx, { forceArmed: true });
				return;
			}

			if (arg === "status" || arg === "show") {
				ctx.ui.notify(
					active === null
						? `Answer length: unlimited (modal ${armed ? "will" : "won't"} ask again)`
						: `Answer length: less than ${active} words (sticky)`,
					"info",
				);
				return;
			}

			const n = Number(arg);
			if (Number.isInteger(n) && n >= CUSTOM_MIN && n <= CUSTOM_MAX) {
				commitLimit(n, ctx);
				return;
			}

			ctx.ui.notify(`Usage: /len [${LIMITS.join("|")}|<n>|off|status]`, "warning");
		},
	});

	// Change the cap without submitting a prompt.
	pi.registerShortcut("ctrl+alt+l", {
		description: "Set the answer length cap",
		handler: async (ctx) => {
			if (ctx.mode !== "tui") return;
			picking = true;
			try {
				const pick = await pickLength(ctx);
				if (pick.kind === "limit") commitLimit(pick.words, ctx);
				else if (pick.kind === "unlimited") commitLimit(null, ctx, { forceArmed: true });
			} finally {
				picking = false;
			}
		},
	});

	// Audit trail: render the sticky choice inline so the transcript shows why
	// answers were short (the directive itself lives only in the system prompt).
	pi.registerEntryRenderer<EntryTypeData>(ENTRY_TYPE, (entry, _options, theme) => {
		const words = entry.data?.active;
		const label = typeof words === "number" ? `answer length: < ${words} words` : "answer length: unlimited";
		return new Text(theme.fg("dim", `  ${label}`), 0, 0);
	});
}

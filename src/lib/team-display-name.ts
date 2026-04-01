/** Prefixes `Team ` when the sheet name does not already include the word `team`. */
export function teamDisplayNameWithTeam(name: string): string {
	const t = name.trim();
	if (!t) return t;
	if (/\bteam\b/i.test(t)) return t;
	return `Team ${t}`;
}

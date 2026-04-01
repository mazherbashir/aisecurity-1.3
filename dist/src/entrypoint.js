#!/usr/bin/env node
import { fileURLToPath } from "node:url";
//#region src/entrypoint.ts
/**
* Entry point for the promptfoo CLI.
*
* This file intentionally has NO dependencies to ensure the Node.js version
* check runs before any module loading that might fail on older versions.
*
* Some dependencies (like string-width via ora) use ES2024 features (e.g., RegExp /v flag)
* that cause cryptic syntax errors on Node.js < 20. By checking the version first,
* we can provide a helpful error message instead.
*/
const nodeEngineRange = "^20.20.0 || >=22.22.0";
const nodeEngineComparatorSets = [[{
	"operator": ">=",
	"version": "20.20.0"
}, {
	"operator": "<",
	"version": "21.0.0-0"
}], [{
	"operator": ">=",
	"version": "22.22.0"
}]];
function parseNodeEngineVersion(version, options = {}) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(version);
	if (!match) return null;
	if (!options.allowPrerelease && match[4]) return null;
	return [
		Number.parseInt(match[1], 10),
		Number.parseInt(match[2], 10),
		Number.parseInt(match[3], 10)
	];
}
function compareNodeEngineVersion(left, right) {
	for (let index = 0; index < left.length; index++) {
		if (left[index] > right[index]) return 1;
		if (left[index] < right[index]) return -1;
	}
	return 0;
}
function satisfiesNodeEngineComparator(currentVersion, comparator) {
	const comparatorVersion = parseNodeEngineVersion(comparator.version, { allowPrerelease: true });
	if (!comparatorVersion) return false;
	const comparison = compareNodeEngineVersion(currentVersion, comparatorVersion);
	switch (comparator.operator || "=") {
		case "=": return comparison === 0;
		case ">": return comparison > 0;
		case ">=": return comparison >= 0;
		case "<": return comparison < 0;
		case "<=": return comparison <= 0;
		default: return false;
	}
}
function isSupportedNodeEngineVersion(currentVersion) {
	const parsedCurrentVersion = parseNodeEngineVersion(currentVersion);
	if (!parsedCurrentVersion) return null;
	return nodeEngineComparatorSets.some((comparatorSet) => comparatorSet.length === 0 || comparatorSet.every((comparator) => satisfiesNodeEngineComparator(parsedCurrentVersion, comparator)));
}
function formatUnsupportedNodeVersionMessage(currentVersion) {
	return [
		"\x1B[33mpromptfoo requires a supported Node.js runtime.",
		"",
		`Detected: ${currentVersion}`,
		`Required: ${nodeEngineRange}`,
		"",
		"Install a supported Node.js version and try again.\x1B[0m"
	].join("\n");
}
function formatMalformedNodeVersionMessage(currentVersion) {
	return [
		`\x1b[33mUnable to parse the current Node.js version: ${currentVersion}`,
		`Required: ${nodeEngineRange}`,
		"",
		"Install a supported Node.js version and try again.\x1B[0m"
	].join("\n");
}
const isBun = typeof globalThis.Bun !== "undefined";
const isDeno = typeof globalThis.Deno !== "undefined";
if (!isBun && !isDeno) {
	const isSupportedVersion = isSupportedNodeEngineVersion(process.version);
	if (isSupportedVersion === null) {
		console.error(formatMalformedNodeVersionMessage(process.version));
		process.exit(1);
	}
	if (!isSupportedVersion) {
		console.error(formatUnsupportedNodeVersionMessage(process.version));
		process.exit(1);
	}
}
process.argv[1] = fileURLToPath(new URL("./main.js", import.meta.url));
await import("./main.js");
//#endregion
export {};

//# sourceMappingURL=entrypoint.js.map
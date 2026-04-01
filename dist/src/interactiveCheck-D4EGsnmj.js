#!/usr/bin/env node
import { C as getEnvBool, s as logger } from "./logger-D6YuF-jw.js";
//#region src/ui/interactiveCheck.ts
/**
* Lightweight module for checking if interactive UI should be used.
*
* This module intentionally has NO dependencies on ink or React to avoid
* loading those modules when promptfoo is used as a library.
*
* NOTE: Interactive UI is OPT-IN by default. Users must explicitly enable it
* via PROMPTFOO_ENABLE_INTERACTIVE_UI=true environment variable.
*/
/**
* Check if the current environment supports interactive UI.
*
* Returns false if stdout is not a TTY (Ink requires TTY to render).
*
* This only checks if the environment CAN support interactive UI,
* not whether it SHOULD be used. Use shouldUseInkUI() for that.
*/
function canUseInteractiveUI() {
	if (!process.stdout.isTTY) {
		logger.debug("Interactive UI not available: stdout is not a TTY");
		return false;
	}
	return true;
}
/**
* Check if interactive UI has been explicitly enabled by the user.
*
* Interactive UI is OPT-IN. Returns true only if:
* - PROMPTFOO_ENABLE_INTERACTIVE_UI=true
*/
function isInteractiveUIEnabled() {
	return getEnvBool("PROMPTFOO_ENABLE_INTERACTIVE_UI");
}
/**
* Check if the Ink UI should be used.
*
* Interactive UI is OPT-IN by default. The UI will only be used if:
* 1. User explicitly enabled it (PROMPTFOO_ENABLE_INTERACTIVE_UI=true)
* 2. AND stdout is a TTY (required for Ink to render)
*/
function shouldUseInkUI() {
	if (!isInteractiveUIEnabled()) {
		logger.debug("Ink UI disabled: not explicitly enabled (set PROMPTFOO_ENABLE_INTERACTIVE_UI=true)");
		return false;
	}
	if (!canUseInteractiveUI()) {
		logger.debug("Ink UI disabled: TTY required but not available");
		return false;
	}
	logger.debug("Ink UI enabled via PROMPTFOO_ENABLE_INTERACTIVE_UI");
	return true;
}
//#endregion
export { shouldUseInkUI as n, canUseInteractiveUI as t };

//# sourceMappingURL=interactiveCheck-D4EGsnmj.js.map
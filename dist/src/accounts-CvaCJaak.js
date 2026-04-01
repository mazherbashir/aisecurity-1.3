#!/usr/bin/env node
import { E as getEnvString, k as isCI, s as logger } from "./logger-D6YuF-jw.js";
import { i as fetchWithTimeout, k as TERMINAL_MAX_WIDTH } from "./fetch-BYaLM5gl.js";
import { c as writeGlobalConfigPartial, o as readGlobalConfig, r as CloudConfig, s as writeGlobalConfig } from "./cloud-cmGsW3KT.js";
import { z } from "zod";
import input from "@inquirer/input";
import chalk from "chalk";
const BAD_EMAIL_RESULT = "bad_email";
const EmailValidationStatus = {
	OK: "ok",
	EXCEEDED_LIMIT: "exceeded_limit",
	SHOW_USAGE_WARNING: "show_usage_warning",
	EMAIL_VERIFICATION_REQUIRED: "email_verification_required",
	RISKY_EMAIL: "risky_email",
	DISPOSABLE_EMAIL: "disposable_email"
};
const NO_EMAIL_STATUS = "no_email";
//#endregion
//#region src/globalConfig/accounts.ts
const CI_PLACEHOLDER_EMAIL = "ci-placeholder@promptfoo.dev";
function getUserId() {
	let globalConfig = readGlobalConfig();
	if (!globalConfig?.id) {
		const newId = crypto.randomUUID();
		globalConfig = {
			...globalConfig,
			id: newId
		};
		writeGlobalConfig(globalConfig);
		return newId;
	}
	return globalConfig.id;
}
function getUserEmail() {
	return readGlobalConfig()?.account?.email || null;
}
function setUserEmail(email) {
	const account = readGlobalConfig()?.account ?? {};
	account.email = email;
	writeGlobalConfigPartial({ account });
}
function clearUserEmail() {
	const account = readGlobalConfig()?.account ?? {};
	delete account.email;
	writeGlobalConfigPartial({ account });
}
function getUserEmailNeedsValidation() {
	return readGlobalConfig()?.account?.emailNeedsValidation || false;
}
function setUserEmailNeedsValidation(needsValidation) {
	const account = readGlobalConfig()?.account ?? {};
	account.emailNeedsValidation = needsValidation;
	writeGlobalConfigPartial({ account });
}
function getUserEmailValidated() {
	return readGlobalConfig()?.account?.emailValidated || false;
}
function setUserEmailValidated(validated) {
	const account = readGlobalConfig()?.account ?? {};
	account.emailValidated = validated;
	writeGlobalConfigPartial({ account });
}
function getAuthor() {
	return getEnvString("PROMPTFOO_AUTHOR") || getUserEmail() || null;
}
function isLoggedIntoCloud() {
	return new CloudConfig().isEnabled();
}
/**
* Get the authentication method used for cloud access
* @returns 'api-key' | 'email' | 'none'
*/
function getAuthMethod() {
	const hasApiKey = new CloudConfig().isEnabled();
	const hasEmail = !!getUserEmail();
	if (hasApiKey && hasEmail) return "api-key";
	if (hasApiKey) return "api-key";
	if (hasEmail) return "email";
	return "none";
}
/**
* Shared function to check email status with the promptfoo API
* Used by both CLI and server routes
*/
async function checkEmailStatus(options) {
	const { default: telemetry } = await import("./telemetry-CUnO9jTF.js");
	const ciMode = isCI();
	const userEmail = ciMode ? CI_PLACEHOLDER_EMAIL : getUserEmail();
	if (!userEmail) return {
		status: NO_EMAIL_STATUS,
		hasEmail: false,
		message: "Redteam evals require email verification. Please enter your work email:"
	};
	if (ciMode) return {
		status: EmailValidationStatus.OK,
		hasEmail: true,
		email: userEmail
	};
	try {
		const validateParam = options?.validate ? "&validate=true" : "";
		const timeout = options?.validate ? 3e3 : 500;
		if (options?.validate) logger.info(`Checking email...`);
		const data = await (await fetchWithTimeout(`${getEnvString("PROMPTFOO_CLOUD_API_URL", "https://api.promptfoo.app")}/api/users/status?email=${encodeURIComponent(userEmail)}${validateParam}`, void 0, timeout)).json();
		if (options?.validate) if (new Set([
			EmailValidationStatus.RISKY_EMAIL,
			EmailValidationStatus.DISPOSABLE_EMAIL,
			EmailValidationStatus.EMAIL_VERIFICATION_REQUIRED
		]).has(data.status)) {
			if (data.status === EmailValidationStatus.EMAIL_VERIFICATION_REQUIRED) {
				setUserEmailValidated(false);
				setUserEmailNeedsValidation(true);
			}
			if (data.status === EmailValidationStatus.RISKY_EMAIL || data.status === EmailValidationStatus.DISPOSABLE_EMAIL) await telemetry.saveConsent(userEmail, { source: "filteredInvalidEmail" });
		} else {
			setUserEmailValidated(true);
			await telemetry.saveConsent(userEmail, { source: "promptForEmailValidated" });
		}
		return {
			status: data.status,
			message: data.message ?? data.error,
			email: userEmail,
			hasEmail: true
		};
	} catch (e) {
		logger.debug(`Failed to check user status: ${e}`);
		return {
			status: EmailValidationStatus.OK,
			message: "Unable to verify email status, but proceeding",
			email: userEmail,
			hasEmail: true
		};
	}
}
async function promptForEmailUnverified() {
	const { default: telemetry } = await import("./telemetry-CUnO9jTF.js");
	const ciMode = isCI();
	const existingEmail = getUserEmail();
	let email = ciMode ? CI_PLACEHOLDER_EMAIL : existingEmail;
	const existingEmailNeedsValidation = !ciMode && getUserEmailNeedsValidation();
	const existingEmailValidated = ciMode || getUserEmailValidated();
	let emailNeedsValidation = existingEmailNeedsValidation && !existingEmailValidated;
	if (!email) {
		await telemetry.record("feature_used", { feature: "promptForEmailUnverified" });
		const border = "─".repeat(TERMINAL_MAX_WIDTH);
		logger.info("");
		logger.info(chalk.cyan(border));
		logger.info(chalk.cyan.bold("  Email Verification Required"));
		logger.info(chalk.cyan(border));
		logger.info("");
		logger.info("  Red team scans require email verification to continue.");
		logger.info("");
		const emailSchema = z.email();
		try {
			email = await input({
				message: chalk.bold("Work email:"),
				validate: (input) => {
					const result = emailSchema.safeParse(input);
					return result.success || result.error.issues[0].message;
				}
			});
		} catch (error) {
			const err = error;
			if (err?.name === "AbortPromptError" || err?.name === "ExitPromptError") process.exit(1);
			logger.error(`failed to prompt for email: ${err}`);
			throw err;
		}
		setUserEmail(email);
		setUserEmailNeedsValidation(true);
		setUserEmailValidated(false);
		emailNeedsValidation = true;
		await telemetry.record("feature_used", { feature: "userCompletedPromptForEmailUnverified" });
	}
	return { emailNeedsValidation };
}
async function checkEmailStatusAndMaybeExit(options) {
	const result = await checkEmailStatus(options);
	if (isCI()) return "ok";
	if (result.status === EmailValidationStatus.RISKY_EMAIL || result.status === EmailValidationStatus.DISPOSABLE_EMAIL) {
		logger.error("Please use a valid work email.");
		setUserEmail("");
		return BAD_EMAIL_RESULT;
	}
	if (result.status === EmailValidationStatus.EXCEEDED_LIMIT) {
		logger.error("You have exceeded the maximum cloud inference limit. Please contact inquiries@promptfoo.dev to upgrade your account.");
		process.exit(1);
	}
	if (result.status === EmailValidationStatus.EMAIL_VERIFICATION_REQUIRED) {
		setUserEmailNeedsValidation(true);
		setUserEmailValidated(false);
		const message = result.message || "Your email address is not verified. Check your inbox for a verification link, then rerun the command.";
		logger.error(message, {
			status: result.status,
			hasEmail: result.hasEmail
		});
		process.exit(1);
	}
	if (result.status === EmailValidationStatus.SHOW_USAGE_WARNING && result.message) {
		const border = "=".repeat(TERMINAL_MAX_WIDTH);
		logger.info(chalk.yellow(border));
		logger.warn(chalk.yellow(result.message));
		logger.info(chalk.yellow(border));
	}
	return "ok";
}
//#endregion
export { getAuthor as a, isLoggedIntoCloud as c, getAuthMethod as i, promptForEmailUnverified as l, checkEmailStatusAndMaybeExit as n, getUserEmail as o, clearUserEmail as r, getUserId as s, checkEmailStatus as t, setUserEmail as u };

//# sourceMappingURL=accounts-CvaCJaak.js.map
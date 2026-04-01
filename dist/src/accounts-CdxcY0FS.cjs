const require_logger = require("./logger-wcsrvnoS.cjs");
const require_fetch = require("./fetch-Gr9TColK.cjs");
let chalk = require("chalk");
chalk = require_logger.__toESM(chalk);
let zod = require("zod");
let _inquirer_input = require("@inquirer/input");
_inquirer_input = require_logger.__toESM(_inquirer_input);
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
	let globalConfig = require_fetch.readGlobalConfig();
	if (!globalConfig?.id) {
		const newId = crypto.randomUUID();
		globalConfig = {
			...globalConfig,
			id: newId
		};
		require_fetch.writeGlobalConfig(globalConfig);
		return newId;
	}
	return globalConfig.id;
}
function getUserEmail() {
	return require_fetch.readGlobalConfig()?.account?.email || null;
}
function setUserEmail(email) {
	const account = require_fetch.readGlobalConfig()?.account ?? {};
	account.email = email;
	require_fetch.writeGlobalConfigPartial({ account });
}
function getUserEmailNeedsValidation() {
	return require_fetch.readGlobalConfig()?.account?.emailNeedsValidation || false;
}
function setUserEmailNeedsValidation(needsValidation) {
	const account = require_fetch.readGlobalConfig()?.account ?? {};
	account.emailNeedsValidation = needsValidation;
	require_fetch.writeGlobalConfigPartial({ account });
}
function getUserEmailValidated() {
	return require_fetch.readGlobalConfig()?.account?.emailValidated || false;
}
function setUserEmailValidated(validated) {
	const account = require_fetch.readGlobalConfig()?.account ?? {};
	account.emailValidated = validated;
	require_fetch.writeGlobalConfigPartial({ account });
}
function getAuthor() {
	return require_logger.getEnvString("PROMPTFOO_AUTHOR") || getUserEmail() || null;
}
function isLoggedIntoCloud() {
	return new require_fetch.CloudConfig().isEnabled();
}
/**
* Get the authentication method used for cloud access
* @returns 'api-key' | 'email' | 'none'
*/
function getAuthMethod() {
	const hasApiKey = new require_fetch.CloudConfig().isEnabled();
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
	const { default: telemetry } = await Promise.resolve().then(() => require("./telemetry-C_khTEbV.cjs"));
	const ciMode = require_logger.isCI();
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
		if (options?.validate) require_logger.logger.info(`Checking email...`);
		const data = await (await require_fetch.fetchWithTimeout(`${require_logger.getEnvString("PROMPTFOO_CLOUD_API_URL", "https://api.promptfoo.app")}/api/users/status?email=${encodeURIComponent(userEmail)}${validateParam}`, void 0, timeout)).json();
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
		require_logger.logger.debug(`Failed to check user status: ${e}`);
		return {
			status: EmailValidationStatus.OK,
			message: "Unable to verify email status, but proceeding",
			email: userEmail,
			hasEmail: true
		};
	}
}
async function promptForEmailUnverified() {
	const { default: telemetry } = await Promise.resolve().then(() => require("./telemetry-C_khTEbV.cjs"));
	const ciMode = require_logger.isCI();
	const existingEmail = getUserEmail();
	let email = ciMode ? CI_PLACEHOLDER_EMAIL : existingEmail;
	const existingEmailNeedsValidation = !ciMode && getUserEmailNeedsValidation();
	const existingEmailValidated = ciMode || getUserEmailValidated();
	let emailNeedsValidation = existingEmailNeedsValidation && !existingEmailValidated;
	if (!email) {
		await telemetry.record("feature_used", { feature: "promptForEmailUnverified" });
		const border = "─".repeat(require_fetch.TERMINAL_MAX_WIDTH);
		require_logger.logger.info("");
		require_logger.logger.info(chalk.default.cyan(border));
		require_logger.logger.info(chalk.default.cyan.bold("  Email Verification Required"));
		require_logger.logger.info(chalk.default.cyan(border));
		require_logger.logger.info("");
		require_logger.logger.info("  Red team scans require email verification to continue.");
		require_logger.logger.info("");
		const emailSchema = zod.z.email();
		try {
			email = await (0, _inquirer_input.default)({
				message: chalk.default.bold("Work email:"),
				validate: (input) => {
					const result = emailSchema.safeParse(input);
					return result.success || result.error.issues[0].message;
				}
			});
		} catch (error) {
			const err = error;
			if (err?.name === "AbortPromptError" || err?.name === "ExitPromptError") process.exit(1);
			require_logger.logger.error(`failed to prompt for email: ${err}`);
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
	if (require_logger.isCI()) return "ok";
	if (result.status === EmailValidationStatus.RISKY_EMAIL || result.status === EmailValidationStatus.DISPOSABLE_EMAIL) {
		require_logger.logger.error("Please use a valid work email.");
		setUserEmail("");
		return BAD_EMAIL_RESULT;
	}
	if (result.status === EmailValidationStatus.EXCEEDED_LIMIT) {
		require_logger.logger.error("You have exceeded the maximum cloud inference limit. Please contact inquiries@promptfoo.dev to upgrade your account.");
		process.exit(1);
	}
	if (result.status === EmailValidationStatus.EMAIL_VERIFICATION_REQUIRED) {
		setUserEmailNeedsValidation(true);
		setUserEmailValidated(false);
		const message = result.message || "Your email address is not verified. Check your inbox for a verification link, then rerun the command.";
		require_logger.logger.error(message, {
			status: result.status,
			hasEmail: result.hasEmail
		});
		process.exit(1);
	}
	if (result.status === EmailValidationStatus.SHOW_USAGE_WARNING && result.message) {
		const border = "=".repeat(require_fetch.TERMINAL_MAX_WIDTH);
		require_logger.logger.info(chalk.default.yellow(border));
		require_logger.logger.warn(chalk.default.yellow(result.message));
		require_logger.logger.info(chalk.default.yellow(border));
	}
	return "ok";
}
//#endregion
Object.defineProperty(exports, "checkEmailStatusAndMaybeExit", {
	enumerable: true,
	get: function() {
		return checkEmailStatusAndMaybeExit;
	}
});
Object.defineProperty(exports, "getAuthMethod", {
	enumerable: true,
	get: function() {
		return getAuthMethod;
	}
});
Object.defineProperty(exports, "getAuthor", {
	enumerable: true,
	get: function() {
		return getAuthor;
	}
});
Object.defineProperty(exports, "getUserEmail", {
	enumerable: true,
	get: function() {
		return getUserEmail;
	}
});
Object.defineProperty(exports, "getUserId", {
	enumerable: true,
	get: function() {
		return getUserId;
	}
});
Object.defineProperty(exports, "isLoggedIntoCloud", {
	enumerable: true,
	get: function() {
		return isLoggedIntoCloud;
	}
});
Object.defineProperty(exports, "promptForEmailUnverified", {
	enumerable: true,
	get: function() {
		return promptForEmailUnverified;
	}
});
Object.defineProperty(exports, "setUserEmail", {
	enumerable: true,
	get: function() {
		return setUserEmail;
	}
});

//# sourceMappingURL=accounts-CdxcY0FS.cjs.map
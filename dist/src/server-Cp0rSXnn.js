#!/usr/bin/env node
import { C as getEnvBool, E as getEnvString, j as state, s as logger } from "./logger-D6YuF-jw.js";
import { A as getDefaultPort, n as fetchWithProxy } from "./fetch-BYaLM5gl.js";
import { c as isLoggedIntoCloud } from "./accounts-CvaCJaak.js";
import { r as CloudConfig } from "./cloud-cmGsW3KT.js";
import chalk from "chalk";
import opener from "opener";
import readline from "readline";
//#region src/redteam/remoteGeneration.ts
/**
* Gets the remote generation API endpoint URL.
* Prioritizes: env var > cloud config > default endpoint.
* @returns The remote generation URL
*/
function getRemoteGenerationUrl() {
	const envUrl = getEnvString("PROMPTFOO_REMOTE_GENERATION_URL");
	if (envUrl) return envUrl;
	const cloudConfig = new CloudConfig();
	if (cloudConfig.isEnabled()) return cloudConfig.getApiHost() + "/api/v1/task";
	return "https://api.promptfoo.app/api/v1/task";
}
/**
* Check if remote generation should never be used.
* Respects both the general and redteam-specific disable flags.
* @returns true if remote generation is disabled
*/
function neverGenerateRemote() {
	if (getEnvBool("PROMPTFOO_DISABLE_REMOTE_GENERATION")) return true;
	return getEnvBool("PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION");
}
/**
* Check if remote generation should never be used for non-redteam features.
* This allows granular control: disable redteam remote generation while allowing
* regular SimulatedUser to use remote generation.
* @returns true if ALL remote generation is disabled
*/
function neverGenerateRemoteForRegularEvals() {
	return getEnvBool("PROMPTFOO_DISABLE_REMOTE_GENERATION");
}
/**
* Builds a remote URL with a substituted pathname, honoring env vars / cloud config.
*/
function buildRemoteUrl(pathname, fallback) {
	if (neverGenerateRemote()) return null;
	const envUrl = getEnvString("PROMPTFOO_REMOTE_GENERATION_URL");
	if (envUrl) try {
		const url = new URL(envUrl);
		url.pathname = pathname;
		return url.toString();
	} catch {
		return fallback;
	}
	const cloudConfig = new CloudConfig();
	if (cloudConfig.isEnabled()) return `${cloudConfig.getApiHost()}${pathname}`;
	return fallback;
}
/**
* Gets the URL for checking remote API health based on configuration.
* @returns The health check URL, or null if remote generation is disabled.
*/
function getRemoteHealthUrl() {
	return buildRemoteUrl("/health", "https://api.promptfoo.app/health");
}
/**
* Gets the URL for checking remote API version based on configuration.
* @returns The version check URL, or null if remote generation is disabled.
*/
function getRemoteVersionUrl() {
	return buildRemoteUrl("/version", "https://api.promptfoo.app/version");
}
/**
* Determines if remote generation should be used based on configuration.
* @returns true if remote generation should be used
*/
function shouldGenerateRemote() {
	if (neverGenerateRemote()) return false;
	if (isLoggedIntoCloud()) return true;
	return !getEnvString("OPENAI_API_KEY") || (state.remote ?? false);
}
/**
* Gets the URL for unaligned model inference (harmful content generation).
* Prioritizes: env var > cloud config > default endpoint.
* @returns The unaligned inference URL
*/
function getRemoteGenerationUrlForUnaligned() {
	const envUrl = getEnvString("PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT");
	if (envUrl) return envUrl;
	const cloudConfig = new CloudConfig();
	if (cloudConfig.isEnabled()) return cloudConfig.getApiHost() + "/api/v1/task/harmful";
	return "https://api.promptfoo.app/api/v1/task/harmful";
}
//#endregion
//#region src/util/readline.ts
/**
* Factory function for creating readline interface.
* This abstraction makes it easier to mock in tests and prevents open handles.
*/
function createReadlineInterface() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
}
/**
* Prompts the user with a question and returns their answer.
* Automatically handles cleanup of the readline interface.
*/
async function promptUser(question) {
	return new Promise((resolve, reject) => {
		let rl = null;
		try {
			rl = createReadlineInterface();
			rl.on("error", (err) => {
				if (rl) rl.close();
				reject(err);
			});
			rl.question(question, (answer) => {
				if (rl) rl.close();
				resolve(answer);
			});
		} catch (err) {
			if (rl) rl.close();
			reject(err);
		}
	});
}
/**
* Prompts the user with a yes/no question and returns a boolean.
* @param question The question to ask
* @param defaultYes If true, empty response defaults to yes. If false, defaults to no.
*/
async function promptYesNo(question, defaultYes = false) {
	const answer = await promptUser(`${question} ${defaultYes ? "(Y/n): " : "(y/N): "}`);
	if (defaultYes) return !answer.trim().toLowerCase().startsWith("n");
	return answer.trim().toLowerCase().startsWith("y");
}
//#endregion
//#region src/util/server.ts
const BrowserBehavior = {
	ASK: 0,
	OPEN: 1,
	SKIP: 2,
	OPEN_TO_REPORT: 3,
	OPEN_TO_REDTEAM_CREATE: 4,
	OPEN_TO_EVAL_SETUP: 5
};
const BrowserBehaviorNames = {
	[BrowserBehavior.ASK]: "ASK",
	[BrowserBehavior.OPEN]: "OPEN",
	[BrowserBehavior.SKIP]: "SKIP",
	[BrowserBehavior.OPEN_TO_REPORT]: "OPEN_TO_REPORT",
	[BrowserBehavior.OPEN_TO_REDTEAM_CREATE]: "OPEN_TO_REDTEAM_CREATE",
	[BrowserBehavior.OPEN_TO_EVAL_SETUP]: "OPEN_TO_EVAL_SETUP"
};
const featureCache = /* @__PURE__ */ new Map();
/**
* Checks if a server supports a specific feature based on build date
* @param featureName - Name of the feature (for caching and logging)
* @param requiredBuildDate - Minimum build date when feature was added (ISO string)
* @returns Promise<boolean> - true if server supports the feature
*/
async function checkServerFeatureSupport(featureName, requiredBuildDate) {
	const cacheKey = `${featureName}`;
	if (featureCache.has(cacheKey)) return featureCache.get(cacheKey);
	let supported = false;
	try {
		logger.debug(`[Feature Detection] Checking server support for feature: ${featureName}`);
		const versionUrl = getRemoteVersionUrl();
		if (versionUrl) {
			const data = await (await fetchWithProxy(versionUrl, {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			})).json();
			if (data.buildDate) {
				supported = new Date(data.buildDate) >= new Date(requiredBuildDate);
				logger.debug(`[Feature Detection] ${featureName}: buildDate=${data.buildDate}, required=${requiredBuildDate}, supported=${supported}`);
			} else {
				logger.debug(`[Feature Detection] ${featureName}: no version info, assuming not supported`);
				supported = false;
			}
		} else {
			logger.debug(`[Feature Detection] No remote URL available for ${featureName}, assuming local server supports it`);
			supported = true;
		}
	} catch (error) {
		logger.debug(`[Feature Detection] Version check failed for ${featureName}, assuming not supported: ${error}`);
		supported = false;
	}
	featureCache.set(cacheKey, supported);
	return supported;
}
async function checkServerRunning(port = getDefaultPort()) {
	logger.debug(`Checking for existing server on port ${port}...`);
	try {
		const data = await (await fetchWithProxy(`http://localhost:${port}/health`, { headers: { "x-promptfoo-silent": "true" } })).json();
		return data.status === "OK" && data.version === "0.121.3";
	} catch (err) {
		logger.debug(`No existing server found - this is expected on first startup. ${String(err)}`);
		return false;
	}
}
async function openBrowser(browserBehavior, port = getDefaultPort()) {
	const baseUrl = `http://localhost:${port}`;
	let url = baseUrl;
	if (browserBehavior === BrowserBehavior.OPEN_TO_REPORT) url = `${baseUrl}/report`;
	else if (browserBehavior === BrowserBehavior.OPEN_TO_REDTEAM_CREATE) url = `${baseUrl}/redteam/setup`;
	else if (browserBehavior === BrowserBehavior.OPEN_TO_EVAL_SETUP) url = `${baseUrl}/setup`;
	const doOpen = async () => {
		try {
			logger.info("Press Ctrl+C to stop the server");
			await opener(url);
		} catch (err) {
			logger.error(`Failed to open browser: ${String(err)}`);
		}
	};
	if (browserBehavior === BrowserBehavior.ASK) {
		if (await promptYesNo("Open URL in browser?", false)) await doOpen();
	} else if (browserBehavior !== BrowserBehavior.SKIP) await doOpen();
}
/**
* Opens authentication URLs in the browser with environment-aware behavior.
*
* @param authUrl - The login/signup URL to open in the browser
* @param welcomeUrl - The URL where users can get their API token after login
* @param browserBehavior - Controls how the browser opening is handled:
*   - BrowserBehavior.ASK: Prompts user before opening (defaults to yes)
*   - BrowserBehavior.OPEN: Opens browser automatically without prompting
*   - BrowserBehavior.SKIP: Shows manual URLs without opening browser
* @returns Promise that resolves when the operation completes
*
* @example
* ```typescript
* // Prompt user to open login page
* await openAuthBrowser(
*   'https://promptfoo.app',
*   'https://promptfoo.app/welcome',
*   BrowserBehavior.ASK
* );
* ```
*/
async function openAuthBrowser(authUrl, welcomeUrl, browserBehavior) {
	const doOpen = async () => {
		try {
			logger.info(`Opening ${authUrl} in your browser...`);
			await opener(authUrl);
			logger.info(`After logging in, get your API token at ${chalk.green(welcomeUrl)}`);
		} catch (err) {
			logger.error(`Failed to open browser: ${String(err)}`);
			logger.info(`Please visit: ${chalk.green(authUrl)}`);
			logger.info(`After logging in, get your API token at ${chalk.green(welcomeUrl)}`);
		}
	};
	if (browserBehavior === BrowserBehavior.ASK) if (await promptYesNo("Open login page in browser?", true)) await doOpen();
	else {
		logger.info(`Please visit: ${chalk.green(authUrl)}`);
		logger.info(`After logging in, get your API token at ${chalk.green(welcomeUrl)}`);
	}
	else if (browserBehavior === BrowserBehavior.SKIP) {
		logger.info(`Please visit: ${chalk.green(authUrl)}`);
		logger.info(`After logging in, get your API token at ${chalk.green(welcomeUrl)}`);
	} else await doOpen();
}
//#endregion
export { openAuthBrowser as a, promptYesNo as c, getRemoteHealthUrl as d, neverGenerateRemote as f, checkServerRunning as i, getRemoteGenerationUrl as l, shouldGenerateRemote as m, BrowserBehaviorNames as n, openBrowser as o, neverGenerateRemoteForRegularEvals as p, checkServerFeatureSupport as r, promptUser as s, BrowserBehavior as t, getRemoteGenerationUrlForUnaligned as u };

//# sourceMappingURL=server-Cp0rSXnn.js.map
const require_logger = require("./logger-wcsrvnoS.cjs");
const require_invariant = require("./invariant-kfQ8Bu82.cjs");
let fs = require("fs");
fs = require_logger.__toESM(fs);
let path = require("path");
path = require_logger.__toESM(path);
let js_yaml = require("js-yaml");
js_yaml = require_logger.__toESM(js_yaml);
let util = require("util");
let fs_promises = require("fs/promises");
fs_promises = require_logger.__toESM(fs_promises);
let proxy_from_env = require("proxy-from-env");
let undici = require("undici");
let zlib = require("zlib");
//#region src/providers/constants.ts
const FILE_METADATA_KEY = "_promptfooFileMetadata";
/**
* Identifier for manual user ratings in componentResults.
* Used to distinguish human ratings from automated assertions.
*/
const HUMAN_ASSERTION_TYPE = "human";
//#endregion
//#region src/version.ts
/**
* Application version from package.json.
* Injected at build time, or read from npm environment in development.
*/
const VERSION = "0.121.3";
function getShareApiBaseUrl() {
	return require_logger.getEnvString("PROMPTFOO_REMOTE_API_BASE_URL") || "https://api.promptfoo.app";
}
function getDefaultShareViewBaseUrl() {
	return require_logger.getEnvString("PROMPTFOO_SHARING_APP_BASE_URL", `https://promptfoo.app`);
}
function getShareViewBaseUrl() {
	return require_logger.getEnvString("PROMPTFOO_REMOTE_APP_BASE_URL") || getDefaultShareViewBaseUrl();
}
const TERMINAL_MAX_WIDTH = process?.stdout?.isTTY && process?.stdout?.columns && process?.stdout?.columns > 10 ? process?.stdout?.columns - 10 : 120;
const CLOUD_PROVIDER_PREFIX = "promptfoo://provider/";
const CONSENT_ENDPOINT = "https://api.promptfoo.dev/consent";
const EVENTS_ENDPOINT = "https://a.promptfoo.app";
const R_ENDPOINT = "https://r.promptfoo.app/";
//#endregion
//#region src/providers/shared.ts
/**
* The default timeout for API requests in milliseconds.
*/
const REQUEST_TIMEOUT_MS = require_logger.getEnvInt("REQUEST_TIMEOUT_MS", 3e5);
/**
* Extended timeout for long-running models (deep research, gpt-5-pro, etc.) in milliseconds.
* These models can take significantly longer to respond due to their complex reasoning.
*/
const LONG_RUNNING_MODEL_TIMEOUT_MS = 6e5;
/**
* Calculates the cost of an API call based on the model and token usage.
*
* @param {string} modelName The name of the model used.
* @param {ProviderConfig} config The provider configuration.
* @param {number | undefined} promptTokens The number of tokens in the prompt.
* @param {number | undefined} completionTokens The number of tokens in the completion.
* @param {ProviderModel[]} models An array of available models with their costs.
* @returns {number | undefined} The calculated cost, or undefined if it can't be calculated.
*/
function calculateCost(modelName, config, promptTokens, completionTokens, models) {
	if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens) || typeof promptTokens === "undefined" || typeof completionTokens === "undefined") return;
	const model = models.find((m) => m.id === modelName);
	if (!model || !model.cost) return;
	const inputCost = config.cost ?? model.cost.input;
	const outputCost = config.cost ?? model.cost.output;
	return inputCost * promptTokens + outputCost * completionTokens;
}
/**
* Checks if a string looks like it's attempting to be JSON.
* This helps distinguish between actual JSON attempts and plain text that happens to start/end with brackets.
*/
function looksLikeJson(prompt) {
	const trimmed = prompt.trim();
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) return true;
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		const afterBracket = trimmed.slice(1).trimStart();
		if (afterBracket.startsWith("\"") || afterBracket.startsWith("{") || afterBracket.startsWith("[") || /^[\d-]/.test(afterBracket) || /^(true|false|null)/.test(afterBracket)) return true;
		if (afterBracket.length === 0 || /^\s+$/.test(afterBracket)) return true;
		return false;
	}
	return false;
}
/**
* Parses a chat prompt string into a structured format.
*
* @template T The expected return type of the parsed prompt.
* @param {string} prompt The input prompt string to parse.
* @param {T} defaultValue The default value to return if parsing fails.
* @returns {T} The parsed prompt or the default value.
* @throws {Error} If the prompt is invalid YAML or JSON (when required).
*/
function parseChatPrompt(prompt, defaultValue) {
	const trimmedPrompt = prompt.trim();
	if (trimmedPrompt.startsWith("- role:")) try {
		return js_yaml.default.load(prompt);
	} catch (err) {
		throw new Error(`Chat Completion prompt is not a valid YAML string: ${err}\n\n${prompt}`);
	}
	else try {
		return JSON.parse(prompt);
	} catch (err) {
		if (require_logger.getEnvBool("PROMPTFOO_REQUIRE_JSON_PROMPTS") || looksLikeJson(trimmedPrompt)) throw new Error(`Chat Completion prompt is not a valid JSON string: ${err}\n\n${prompt}`);
		return defaultValue;
	}
}
/**
* Converts a string to title case.
*
* @param {string} str The input string to convert.
* @returns {string} The input string converted to title case.
*/
function toTitleCase(str) {
	return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
function isPromptfooSampleTarget(provider) {
	const url = provider.config?.url;
	return url?.includes("promptfoo.app") || url?.includes("promptfoo.dev");
}
/**
* Checks if the given value is an OpenAI tool choice format.
* Detects string values ('auto', 'none', 'required') and
* the object form ({ type: 'function', function: { name } }).
*/
function isOpenAIToolChoice(obj) {
	if (typeof obj === "string") return [
		"auto",
		"none",
		"required"
	].includes(obj);
	if (typeof obj === "object" && obj !== null) {
		const candidate = obj;
		if (candidate.type === "function" && typeof candidate.function === "object" && candidate.function !== null) return typeof candidate.function.name === "string";
	}
	return false;
}
/**
* Transforms an OpenAI tool choice to Anthropic format.
*/
function openaiToolChoiceToAnthropic(choice) {
	if (typeof choice === "string") switch (choice) {
		case "auto": return { type: "auto" };
		case "none": return { type: "auto" };
		case "required": return { type: "any" };
	}
	return {
		type: "tool",
		name: choice.function.name
	};
}
/**
* Transforms an OpenAI tool choice to Bedrock Converse format.
*/
function openaiToolChoiceToBedrock(choice) {
	if (typeof choice === "string") switch (choice) {
		case "auto": return { auto: {} };
		case "none": return;
		case "required": return { any: {} };
	}
	return { tool: { name: choice.function.name } };
}
/**
* Transforms an OpenAI tool choice to Google (Gemini) format.
*/
function openaiToolChoiceToGoogle(choice) {
	if (typeof choice === "string") switch (choice) {
		case "auto": return { functionCallingConfig: { mode: "AUTO" } };
		case "none": return { functionCallingConfig: { mode: "NONE" } };
		case "required": return { functionCallingConfig: { mode: "ANY" } };
	}
	return { functionCallingConfig: {
		mode: "ANY",
		allowedFunctionNames: [choice.function.name]
	} };
}
/**
* Transforms an OpenAI tool choice to the specified provider format.
* If the input is not in OpenAI format, it's returned as-is (native passthrough).
*/
function transformToolChoice(toolChoice, format) {
	if (!isOpenAIToolChoice(toolChoice)) return toolChoice;
	switch (format) {
		case "openai": return toolChoice;
		case "anthropic": return openaiToolChoiceToAnthropic(toolChoice);
		case "bedrock": return openaiToolChoiceToBedrock(toolChoice);
		case "google": return openaiToolChoiceToGoogle(toolChoice);
		default: return toolChoice;
	}
}
/**
* Checks if an array contains OpenAI-format tools.
* Returns true if the first tool has `type: 'function'` and `function.name`.
*/
function isOpenAIToolArray(tools) {
	if (!Array.isArray(tools) || tools.length === 0) return false;
	const first = tools[0];
	if (typeof first !== "object" || first === null) return false;
	const candidate = first;
	return candidate.type === "function" && typeof candidate.function === "object" && candidate.function !== null && typeof candidate.function.name === "string";
}
/**
* Transforms OpenAI-format tools to Anthropic format.
*/
function openaiToolsToAnthropic(tools) {
	return tools.map((tool) => ({
		name: tool.function.name,
		...tool.function.description ? { description: tool.function.description } : {},
		input_schema: tool.function.parameters || {
			type: "object",
			properties: {}
		}
	}));
}
/**
* Transforms OpenAI-format tools to Bedrock Converse format.
*/
function openaiToolsToBedrock(tools) {
	return tools.map((tool) => ({ toolSpec: {
		name: tool.function.name,
		...tool.function.description ? { description: tool.function.description } : {},
		inputSchema: { json: tool.function.parameters || {
			type: "object",
			properties: {}
		} }
	} }));
}
/**
* Sanitizes a schema for Google/Gemini compatibility.
* - Converts type strings to uppercase (string → STRING)
* - Removes unsupported properties (additionalProperties, $schema, default)
* - Recursively processes nested schemas
*/
function sanitizeSchemaForGoogle(schema) {
	const result = {};
	for (const [key, value] of Object.entries(schema)) {
		if ([
			"additionalProperties",
			"$schema",
			"default",
			"$id",
			"$ref"
		].includes(key)) continue;
		if (key === "type" && typeof value === "string") result[key] = value.toUpperCase();
		else if (key === "properties" && typeof value === "object" && value !== null) {
			const sanitizedProps = {};
			for (const [propKey, propValue] of Object.entries(value)) if (typeof propValue === "object" && propValue !== null) sanitizedProps[propKey] = sanitizeSchemaForGoogle(propValue);
			else sanitizedProps[propKey] = propValue;
			result[key] = sanitizedProps;
		} else if (key === "items" && typeof value === "object" && value !== null) result[key] = sanitizeSchemaForGoogle(value);
		else result[key] = value;
	}
	return result;
}
/**
* Transforms OpenAI-format tools to Google/Gemini format.
*/
function openaiToolsToGoogle(tools) {
	return [{ functionDeclarations: tools.map((tool) => ({
		name: tool.function.name,
		...tool.function.description ? { description: tool.function.description } : {},
		...tool.function.parameters ? { parameters: sanitizeSchemaForGoogle(tool.function.parameters) } : {}
	})) }];
}
/**
* Transforms tools from OpenAI format to the specified provider format.
* If the input is not in OpenAI format, it's returned as-is.
*/
function transformTools(tools, format) {
	if (!isOpenAIToolArray(tools)) return tools;
	switch (format) {
		case "openai": return tools;
		case "anthropic": return openaiToolsToAnthropic(tools);
		case "bedrock": return openaiToolsToBedrock(tools);
		case "google": return openaiToolsToGoogle(tools);
		default: return tools;
	}
}
//#endregion
//#region src/scheduler/headerParser.ts
const OPENAI_HEADERS = {
	remainingRequests: "x-ratelimit-remaining-requests",
	remainingTokens: "x-ratelimit-remaining-tokens",
	limitRequests: "x-ratelimit-limit-requests",
	limitTokens: "x-ratelimit-limit-tokens",
	resetRequests: "x-ratelimit-reset-requests",
	resetTokens: "x-ratelimit-reset-tokens"
};
const ANTHROPIC_HEADERS = {
	remainingRequests: "anthropic-ratelimit-requests-remaining",
	remainingTokens: "anthropic-ratelimit-tokens-remaining",
	limitRequests: "anthropic-ratelimit-requests-limit",
	limitTokens: "anthropic-ratelimit-tokens-limit",
	reset: "anthropic-ratelimit-requests-reset"
};
const STANDARD_HEADERS = {
	remaining: "ratelimit-remaining",
	limit: "ratelimit-limit",
	reset: "ratelimit-reset",
	remainingAlt: "x-ratelimit-remaining",
	limitAlt: "x-ratelimit-limit",
	resetAlt: "x-ratelimit-reset"
};
/**
* Parse rate limit headers from response.
*/
function parseRateLimitHeaders(headers) {
	const result = {};
	const h = lowercaseKeys(headers);
	result.remainingRequests = parseFirstMatch(h, [
		OPENAI_HEADERS.remainingRequests,
		ANTHROPIC_HEADERS.remainingRequests,
		STANDARD_HEADERS.remainingAlt,
		STANDARD_HEADERS.remaining
	]);
	result.remainingTokens = parseFirstMatch(h, [OPENAI_HEADERS.remainingTokens, ANTHROPIC_HEADERS.remainingTokens]);
	result.limitRequests = parseFirstMatch(h, [
		OPENAI_HEADERS.limitRequests,
		ANTHROPIC_HEADERS.limitRequests,
		STANDARD_HEADERS.limitAlt,
		STANDARD_HEADERS.limit
	]);
	result.limitTokens = parseFirstMatch(h, [OPENAI_HEADERS.limitTokens, ANTHROPIC_HEADERS.limitTokens]);
	for (const name of [
		OPENAI_HEADERS.resetRequests,
		OPENAI_HEADERS.resetTokens,
		ANTHROPIC_HEADERS.reset,
		STANDARD_HEADERS.resetAlt,
		STANDARD_HEADERS.reset
	]) if (h[name] !== void 0) {
		const parsed = parseResetTime(h[name]);
		if (parsed !== null) {
			result.resetAt = parsed;
			break;
		}
	}
	if (h["retry-after-ms"] !== void 0) {
		const ms = parseInt(h["retry-after-ms"], 10);
		if (!isNaN(ms) && ms >= 0) {
			result.retryAfterMs = ms;
			if (result.resetAt === void 0) result.resetAt = Date.now() + ms;
		}
	} else if (h["retry-after"] !== void 0) {
		const parsed = parseRetryAfter(h["retry-after"]);
		if (parsed !== null) {
			result.retryAfterMs = parsed;
			if (result.resetAt === void 0) result.resetAt = Date.now() + parsed;
		}
	}
	return result;
}
/**
* Parse Retry-After header value.
* Returns duration in milliseconds.
* Exported for integration use.
*/
function parseRetryAfter(value) {
	const seconds = parseInt(value, 10);
	if (!isNaN(seconds) && seconds >= 0 && String(seconds) === value.trim()) return seconds * 1e3;
	const httpDate = parseHttpDate(value);
	if (httpDate !== null) return Math.max(0, httpDate - Date.now());
	return null;
}
function parseFirstMatch(headers, names) {
	for (const name of names) {
		const value = headers[name];
		if (value !== void 0) {
			const num = parseInt(value, 10);
			if (!isNaN(num) && num >= 0) return num;
		}
	}
}
/**
* Parse reset time from various formats.
* Returns absolute Unix timestamp in milliseconds.
*/
function parseResetTime(value) {
	const durationMs = parseDuration(value);
	if (durationMs !== null) return Date.now() + durationMs;
	const num = parseFloat(value);
	if (!isNaN(num)) if (num < 1e9) return Date.now() + num * 1e3;
	else if (num < 1e10) return num * 1e3;
	else return num;
	const httpDate = parseHttpDate(value);
	if (httpDate !== null) return httpDate;
	return null;
}
/**
* Parse HTTP-date format (RFC 7231).
*/
function parseHttpDate(value) {
	const timestamp = Date.parse(value);
	if (!isNaN(timestamp)) {
		const now = Date.now();
		const oneYearMs = 365 * 24 * 60 * 60 * 1e3;
		if (timestamp > now - oneYearMs && timestamp < now + oneYearMs) return timestamp;
	}
	return null;
}
/**
* Parse duration strings like "1s", "100ms", "1m30s", "1h30s", "2h15m30s".
*
* Supported formats:
* - Xms (milliseconds)
* - Xs or X.Xs (seconds)
* - Xm or XmYs (minutes with optional seconds)
* - Xh or XhYm or XhYs or XhYmZs (hours with optional minutes/seconds)
*/
function parseDuration(value) {
	const match = value.match(/^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:(\d+(?:\.\d+)?)(ms|s))?$/);
	if (!match) return null;
	const [, hours, minutes, secondsValue, secondsUnit] = match;
	if (!hours && !minutes && !secondsValue) return null;
	let ms = 0;
	if (hours) ms += parseInt(hours, 10) * 36e5;
	if (minutes) ms += parseInt(minutes, 10) * 6e4;
	if (secondsValue) {
		const num = parseFloat(secondsValue);
		ms += secondsUnit === "ms" ? num : num * 1e3;
	}
	return ms;
}
function lowercaseKeys(obj) {
	const result = {};
	for (const [key, value] of Object.entries(obj)) result[key.toLowerCase()] = value;
	return result;
}
//#endregion
//#region src/util/time.ts
function getCurrentTimestamp() {
	return Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//#endregion
//#region src/globalConfig/globalConfig.ts
/**
* Functions for manipulating the global configuration file, which lives at
* ~/.promptfoo/promptfoo.yaml by default.
*/
function writeGlobalConfig(config) {
	fs.writeFileSync(path.join(require_logger.getConfigDirectoryPath(true), "promptfoo.yaml"), js_yaml.default.dump(config));
}
function readGlobalConfig() {
	const configDir = require_logger.getConfigDirectoryPath();
	const configFilePath = path.join(configDir, "promptfoo.yaml");
	let globalConfig = { id: crypto.randomUUID() };
	if (fs.existsSync(configFilePath)) {
		globalConfig = js_yaml.default.load(fs.readFileSync(configFilePath, "utf-8")) || {};
		if (!globalConfig?.id) {
			globalConfig = {
				...globalConfig,
				id: crypto.randomUUID()
			};
			writeGlobalConfig(globalConfig);
		}
	} else {
		if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(configFilePath, js_yaml.default.dump(globalConfig));
	}
	return globalConfig;
}
/**
* Merges the top-level keys into existing config.
* @param partialConfig New keys to merge into the existing config.
*/
function writeGlobalConfigPartial(partialConfig) {
	const updatedConfig = { ...readGlobalConfig() };
	Object.entries(partialConfig).forEach(([key, value]) => {
		if (value !== void 0 && value !== null) updatedConfig[key] = value;
		else delete updatedConfig[key];
	});
	writeGlobalConfig(updatedConfig);
}
const API_HOST = require_logger.getEnvString("API_HOST", "https://api.promptfoo.app");
const SHARING_CUTOFF_DATE = /* @__PURE__ */ new Date("2026-03-09T00:00:00Z");
var CloudConfig = class {
	config;
	constructor() {
		const savedConfig = readGlobalConfig()?.cloud || {};
		this.config = {
			appUrl: savedConfig.appUrl || "https://www.promptfoo.app",
			apiHost: savedConfig.apiHost,
			apiKey: savedConfig.apiKey,
			sharing: savedConfig.sharing,
			currentOrganizationId: savedConfig.currentOrganizationId,
			currentTeamId: savedConfig.currentTeamId,
			teams: savedConfig.teams
		};
	}
	/**
	* Returns the API key from config file or PROMPTFOO_API_KEY environment variable.
	* Config file takes precedence over environment variable.
	*/
	resolveApiKey() {
		return this.config.apiKey || process.env.PROMPTFOO_API_KEY;
	}
	/**
	* Returns the API host from config file, PROMPTFOO_CLOUD_API_URL environment variable,
	* or defaults to the standard cloud API host.
	* Config file takes precedence over environment variable.
	*/
	resolveApiHost() {
		return this.config.apiHost || process.env.PROMPTFOO_CLOUD_API_URL || API_HOST;
	}
	isEnabled() {
		return !!this.resolveApiKey();
	}
	setApiHost(apiHost) {
		this.config.apiHost = apiHost;
		this.saveConfig();
	}
	setApiKey(apiKey) {
		this.config.apiKey = apiKey;
		this.saveConfig();
	}
	getApiKey() {
		return this.resolveApiKey();
	}
	getApiHost() {
		return this.resolveApiHost();
	}
	setAppUrl(appUrl) {
		this.config.appUrl = appUrl;
		this.saveConfig();
	}
	getAppUrl() {
		return this.config.appUrl;
	}
	getSharing() {
		return this.config.sharing;
	}
	/**
	* Sets the sharing preference. Note: this value is only updated at authentication time
	* (via `validateAndSetApiToken`) and may become stale if the user's license status
	* changes between re-authentications.
	*/
	setSharing(sharing) {
		this.config.sharing = sharing;
		this.saveConfig();
	}
	delete() {
		writeGlobalConfigPartial({ cloud: {} });
		this.reload();
	}
	saveConfig() {
		writeGlobalConfigPartial({ cloud: this.config });
		this.reload();
	}
	reload() {
		const savedConfig = readGlobalConfig()?.cloud || {};
		this.config = {
			appUrl: savedConfig.appUrl || "https://www.promptfoo.app",
			apiHost: savedConfig.apiHost,
			apiKey: savedConfig.apiKey,
			sharing: savedConfig.sharing,
			currentOrganizationId: savedConfig.currentOrganizationId,
			currentTeamId: savedConfig.currentTeamId,
			teams: savedConfig.teams
		};
	}
	async validateAndSetApiToken(token, apiHost) {
		try {
			const { fetchWithProxy } = await Promise.resolve().then(() => fetch_exports);
			const response = await fetchWithProxy(`${apiHost}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } });
			if (!response.ok) {
				const errorMessage = await response.text();
				require_logger.logger.error(`[Cloud] Failed to validate API token: ${errorMessage}. HTTP Status: ${response.status} - ${response.statusText}.`);
				throw new Error("Failed to validate API token: " + response.statusText);
			}
			const { user, organization, app, hasActiveLicense } = await response.json();
			this.setApiKey(token);
			this.setApiHost(apiHost);
			this.setAppUrl(app.url);
			if (typeof hasActiveLicense === "boolean") {
				const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
				const isGrandfathered = createdAt != null && createdAt < SHARING_CUTOFF_DATE;
				this.setSharing(hasActiveLicense || isGrandfathered);
			}
			return {
				user,
				organization,
				app,
				hasActiveLicense: typeof hasActiveLicense === "boolean" ? hasActiveLicense : false
			};
		} catch (err) {
			const error = err;
			const errorMessage = error instanceof Error ? error.message : String(error);
			require_logger.logger.error(`[Cloud] Failed to validate API token with host ${apiHost}: ${errorMessage}`);
			if (error.cause) require_logger.logger.error(`Cause: ${error.cause}`);
			throw error;
		}
	}
	getCurrentOrganizationId() {
		return this.config.currentOrganizationId;
	}
	setCurrentOrganization(organizationId) {
		this.config.currentOrganizationId = organizationId;
		this.saveConfig();
	}
	getCurrentTeamId(organizationId) {
		if (organizationId) return this.config.teams?.[organizationId]?.currentTeamId;
		return this.config.currentTeamId;
	}
	setCurrentTeamId(teamId, organizationId) {
		if (organizationId) {
			if (!this.config.teams) this.config.teams = {};
			if (!this.config.teams[organizationId]) this.config.teams[organizationId] = {};
			this.config.teams[organizationId].currentTeamId = teamId;
		} else this.config.currentTeamId = teamId;
		this.saveConfig();
	}
	clearCurrentTeamId(organizationId) {
		if (organizationId) {
			if (this.config.teams?.[organizationId]) delete this.config.teams[organizationId].currentTeamId;
		} else delete this.config.currentTeamId;
		this.saveConfig();
	}
	cacheTeams(teams, organizationId) {
		if (organizationId) {
			if (!this.config.teams) this.config.teams = {};
			if (!this.config.teams[organizationId]) this.config.teams[organizationId] = {};
			this.config.teams[organizationId].cache = teams.map((t) => ({
				id: t.id,
				name: t.name,
				slug: t.slug,
				lastFetched: (/* @__PURE__ */ new Date()).toISOString()
			}));
		}
		this.saveConfig();
	}
	getCachedTeams(organizationId) {
		if (organizationId) return this.config.teams?.[organizationId]?.cache;
	}
};
const cloudConfig = new CloudConfig();
//#endregion
//#region src/util/fetch/monkeyPatchFetch.ts
const gzipAsync = (0, util.promisify)(zlib.gzip);
function isConnectionError(error) {
	return error instanceof TypeError && error.message === "fetch failed" && error.cause?.stack?.includes("internalConnectMultiple");
}
/**
* Enhanced fetch wrapper that adds logging, authentication, error handling, and optional compression
*/
async function monkeyPatchFetch(url, options) {
	const NO_LOG_URLS = [
		R_ENDPOINT,
		CONSENT_ENDPOINT,
		EVENTS_ENDPOINT
	];
	const isSilent = (options?.headers || {})["x-promptfoo-silent"] === "true";
	const logEnabled = !NO_LOG_URLS.some((logUrl) => url.toString().startsWith(logUrl)) && !isSilent;
	const opts = { ...options };
	const originalBody = opts.body;
	if (options?.compress && opts.body && typeof opts.body === "string") try {
		opts.body = await gzipAsync(opts.body);
		opts.headers = {
			...opts.headers || {},
			"Content-Encoding": "gzip"
		};
	} catch (e) {
		require_logger.logger.warn(`Failed to compress request body: ${e}`);
	}
	if (typeof url === "string" && url.startsWith("https://api.promptfoo.app") || url instanceof URL && url.host === "https://api.promptfoo.app".replace(/^https?:\/\//, "")) {
		const token = cloudConfig.getApiKey();
		opts.headers = {
			...opts.headers || {},
			...token ? { Authorization: `Bearer ${token}` } : {}
		};
	}
	try {
		const response = await fetch(url, opts);
		if (logEnabled) require_logger.logRequestResponse({
			url: url.toString(),
			requestBody: originalBody,
			requestMethod: opts.method || "GET",
			response
		});
		return response;
	} catch (e) {
		if (logEnabled) {
			require_logger.logRequestResponse({
				url: url.toString(),
				requestBody: opts.body,
				requestMethod: opts.method || "GET",
				response: null
			});
			if (isConnectionError(e)) {
				require_logger.logger.debug(`Connection error, please check your network connectivity to the host: ${url} ${process.env.HTTP_PROXY || process.env.HTTPS_PROXY ? `or Proxy: ${process.env.HTTP_PROXY || process.env.HTTPS_PROXY}` : ""}`);
				throw e;
			}
			require_logger.logger.debug(`Error in fetch: ${JSON.stringify(e, Object.getOwnPropertyNames(e), 2)} ${e instanceof Error ? e.stack : ""}`);
		}
		throw e;
	}
}
//#endregion
//#region src/util/fetch/index.ts
var fetch_exports = /* @__PURE__ */ require_logger.__exportAll({
	fetchWithProxy: () => fetchWithProxy,
	fetchWithRetries: () => fetchWithRetries,
	fetchWithTimeout: () => fetchWithTimeout,
	handleRateLimit: () => handleRateLimit,
	isRateLimited: () => isRateLimited,
	isTransientError: () => isTransientError
});
let cachedAgent = null;
let cachedAgentConcurrency;
let cachedProxyAgents = /* @__PURE__ */ new Map();
/**
* Get the connection pool size for HTTP agents.
* Priority: PROMPTFOO_FETCH_CONNECTIONS env var > CLI -j flag > DEFAULT_MAX_CONCURRENCY (4).
* Set PROMPTFOO_FETCH_CONNECTIONS to override independently of eval concurrency
* (e.g., server deployments that need more connections than the default 4).
*/
function getConnectionPoolSize() {
	const envConnections = require_logger.getEnvString("PROMPTFOO_FETCH_CONNECTIONS");
	if (envConnections != null) {
		const parsed = parseInt(envConnections, 10);
		if (!isNaN(parsed)) return parsed;
	}
	return require_logger.state.maxConcurrency || 4;
}
function getOrCreateAgent(tlsOptions) {
	const concurrency = getConnectionPoolSize();
	if (cachedAgent && cachedAgentConcurrency !== concurrency) {
		if (typeof cachedAgent.close === "function") cachedAgent.close();
		cachedAgent = null;
	}
	if (!cachedAgent) {
		cachedAgent = new undici.Agent({
			headersTimeout: REQUEST_TIMEOUT_MS,
			keepAliveTimeout: 3e4,
			keepAliveMaxTimeout: 6e4,
			connections: concurrency,
			connect: tlsOptions
		});
		cachedAgentConcurrency = concurrency;
	}
	return cachedAgent;
}
function getOrCreateProxyAgent(proxyUrl, tlsOptions) {
	if (!cachedProxyAgents.has(proxyUrl)) {
		const agent = new undici.ProxyAgent({
			uri: proxyUrl,
			proxyTls: tlsOptions,
			requestTls: tlsOptions,
			headersTimeout: REQUEST_TIMEOUT_MS,
			keepAliveTimeout: 3e4,
			keepAliveMaxTimeout: 6e4,
			connections: getConnectionPoolSize()
		});
		cachedProxyAgents.set(proxyUrl, agent);
	}
	return cachedProxyAgents.get(proxyUrl);
}
async function fetchWithProxy(url, options = {}, abortSignal) {
	let finalUrl = url;
	let finalUrlString;
	if (typeof url === "string") finalUrlString = url;
	else if (url instanceof URL) finalUrlString = url.toString();
	else if (url instanceof Request) finalUrlString = url.url;
	if (!finalUrlString) throw new Error("Invalid URL");
	const combinedSignal = abortSignal ? options.signal ? AbortSignal.any([options.signal, abortSignal]) : abortSignal : options.signal;
	const finalOptions = {
		...options,
		headers: {
			...options.headers,
			"x-promptfoo-version": VERSION
		},
		signal: combinedSignal
	};
	if (typeof url === "string") try {
		const parsedUrl = new URL(url);
		if (parsedUrl.username || parsedUrl.password) {
			if (finalOptions.headers && "Authorization" in finalOptions.headers) require_logger.logger.warn("Both URL credentials and Authorization header present - URL credentials will be ignored");
			else {
				const username = parsedUrl.username || "";
				const password = parsedUrl.password || "";
				const credentials = Buffer.from(`${username}:${password}`).toString("base64");
				finalOptions.headers = {
					...finalOptions.headers,
					Authorization: `Basic ${credentials}`
				};
			}
			parsedUrl.username = "";
			parsedUrl.password = "";
			finalUrl = parsedUrl.toString();
			finalUrlString = finalUrl.toString();
		}
	} catch (e) {
		require_logger.logger.debug(`URL parsing failed in fetchWithProxy: ${e}`);
	}
	const tlsOptions = { rejectUnauthorized: !require_logger.getEnvBool("PROMPTFOO_INSECURE_SSL", true) };
	const caCertPath = require_logger.getEnvString("PROMPTFOO_CA_CERT_PATH");
	if (caCertPath) try {
		const resolvedPath = path.default.resolve(require_logger.state.basePath || "", caCertPath);
		tlsOptions.ca = await fs_promises.readFile(resolvedPath, "utf8");
		require_logger.logger.debug(`Using custom CA certificate from ${resolvedPath}`);
	} catch (e) {
		require_logger.logger.warn(`Failed to read CA certificate from ${caCertPath}: ${e}`);
	}
	const proxyUrl = finalUrlString ? (0, proxy_from_env.getProxyForUrl)(finalUrlString) : "";
	if (!finalOptions.dispatcher) if (proxyUrl) {
		require_logger.logger.debug(`Using proxy: ${require_logger.sanitizeUrl(proxyUrl)}`);
		finalOptions.dispatcher = getOrCreateProxyAgent(proxyUrl, tlsOptions);
	} else finalOptions.dispatcher = getOrCreateAgent(tlsOptions);
	const maxTransientRetries = options.disableTransientRetries ? 0 : 3;
	for (let attempt = 0; attempt <= maxTransientRetries; attempt++) {
		const response = await monkeyPatchFetch(finalUrl, finalOptions);
		if (!options.disableTransientRetries && isTransientError(response) && attempt < maxTransientRetries) {
			const backoffMs = Math.pow(2, attempt) * 1e3;
			require_logger.logger.debug(`Transient error (${response.status} ${response.statusText}), retry ${attempt + 1}/${maxTransientRetries} after ${backoffMs}ms`);
			await sleep(backoffMs);
			continue;
		}
		return response;
	}
	throw new Error("Unexpected end of transient retry loop");
}
function fetchWithTimeout(url, options = {}, timeout) {
	return new Promise((resolve, reject) => {
		const timeoutController = new AbortController();
		const signal = options.signal ? AbortSignal.any([options.signal, timeoutController.signal]) : timeoutController.signal;
		const timeoutId = setTimeout(() => {
			timeoutController.abort();
			reject(/* @__PURE__ */ new Error(`Request timed out after ${timeout} ms`));
		}, timeout);
		fetchWithProxy(url, {
			...options,
			signal
		}).then((response) => {
			clearTimeout(timeoutId);
			resolve(response);
		}).catch((error) => {
			clearTimeout(timeoutId);
			reject(error);
		});
	});
}
/**
* Check if a response indicates rate limiting
*/
function isRateLimited(response) {
	require_invariant.invariant(response.headers, "Response headers are missing");
	require_invariant.invariant(response.status, "Response status is missing");
	return response.headers.get("X-RateLimit-Remaining") === "0" || response.status === 429 || response.headers.get("x-ratelimit-remaining-requests") === "0" || response.headers.get("x-ratelimit-remaining-tokens") === "0";
}
/**
* Handle rate limiting by waiting the appropriate amount of time
*/
async function handleRateLimit(response) {
	const rateLimitReset = response.headers.get("X-RateLimit-Reset");
	const retryAfter = response.headers.get("Retry-After");
	const openaiReset = response.headers.get("x-ratelimit-reset-requests") || response.headers.get("x-ratelimit-reset-tokens");
	let waitTime = 6e4;
	if (openaiReset) {
		const parsedHeaders = parseRateLimitHeaders(Object.fromEntries(response.headers.entries()));
		if (parsedHeaders.resetAt !== void 0) waitTime = Math.max(parsedHeaders.resetAt - Date.now(), 0);
	} else if (rateLimitReset) {
		const resetTime = /* @__PURE__ */ new Date(Number.parseInt(rateLimitReset) * 1e3);
		const now = /* @__PURE__ */ new Date();
		waitTime = Math.max(resetTime.getTime() - now.getTime() + 1e3, 0);
	} else if (retryAfter) waitTime = parseRetryAfter(retryAfter) ?? waitTime;
	require_logger.logger.debug(`Rate limited, waiting ${waitTime}ms before retry`);
	await sleep(waitTime);
}
/**
* Check if a response indicates a transient server error that should be retried.
* Matches specific status codes with their expected status text to avoid
* retrying permanent failures (e.g., some APIs return 502 for auth errors).
*/
function isTransientError(response) {
	if (!response?.statusText) return false;
	const statusText = response.statusText.toLowerCase();
	switch (response.status) {
		case 502: return statusText.includes("bad gateway");
		case 503: return statusText.includes("service unavailable");
		case 504: return statusText.includes("gateway timeout");
		case 524: return statusText.includes("timeout");
		default: return false;
	}
}
async function fetchWithRetries(url, options = {}, timeout, maxRetries) {
	maxRetries = Math.max(0, maxRetries ?? 4);
	let lastErrorMessage;
	const backoff = require_logger.getEnvInt("PROMPTFOO_REQUEST_BACKOFF_MS", 5e3);
	for (let i = 0; i <= maxRetries; i++) {
		let response;
		try {
			response = await fetchWithTimeout(url, {
				...options,
				disableTransientRetries: true
			}, timeout);
			if (require_logger.getEnvBool("PROMPTFOO_RETRY_5XX") && response.status >= 500 && response.status < 600) throw new Error(`Internal Server Error: ${response.status} ${response.statusText}`);
			if (response && isRateLimited(response)) {
				require_logger.logger.debug(`Rate limited on URL ${url}: ${response.status} ${response.statusText}, attempt ${i + 1}/${maxRetries + 1}, waiting before retry...`);
				lastErrorMessage = `Rate limited: ${response.status} ${response.statusText}`;
				await handleRateLimit(response);
				continue;
			}
			return response;
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") throw error;
			let errorMessage;
			if (error instanceof Error) {
				const typedError = error;
				errorMessage = `${typedError.name}: ${typedError.message}`;
				if (typedError.cause) errorMessage += ` (Cause: ${typedError.cause})`;
				if (typedError.code) errorMessage += ` (Code: ${typedError.code})`;
			} else errorMessage = String(error);
			require_logger.logger.debug(`Request to ${url} failed (attempt #${i + 1}), retrying: ${errorMessage}`);
			if (i < maxRetries) await sleep(Math.pow(2, i) * (backoff + 1e3 * Math.random()));
			lastErrorMessage = errorMessage;
		}
	}
	throw new Error(`Request failed after ${maxRetries} retries: ${lastErrorMessage}`);
}
//#endregion
Object.defineProperty(exports, "CLOUD_PROVIDER_PREFIX", {
	enumerable: true,
	get: function() {
		return CLOUD_PROVIDER_PREFIX;
	}
});
Object.defineProperty(exports, "CONSENT_ENDPOINT", {
	enumerable: true,
	get: function() {
		return CONSENT_ENDPOINT;
	}
});
Object.defineProperty(exports, "CloudConfig", {
	enumerable: true,
	get: function() {
		return CloudConfig;
	}
});
Object.defineProperty(exports, "EVENTS_ENDPOINT", {
	enumerable: true,
	get: function() {
		return EVENTS_ENDPOINT;
	}
});
Object.defineProperty(exports, "FILE_METADATA_KEY", {
	enumerable: true,
	get: function() {
		return FILE_METADATA_KEY;
	}
});
Object.defineProperty(exports, "HUMAN_ASSERTION_TYPE", {
	enumerable: true,
	get: function() {
		return HUMAN_ASSERTION_TYPE;
	}
});
Object.defineProperty(exports, "LONG_RUNNING_MODEL_TIMEOUT_MS", {
	enumerable: true,
	get: function() {
		return LONG_RUNNING_MODEL_TIMEOUT_MS;
	}
});
Object.defineProperty(exports, "REQUEST_TIMEOUT_MS", {
	enumerable: true,
	get: function() {
		return REQUEST_TIMEOUT_MS;
	}
});
Object.defineProperty(exports, "R_ENDPOINT", {
	enumerable: true,
	get: function() {
		return R_ENDPOINT;
	}
});
Object.defineProperty(exports, "TERMINAL_MAX_WIDTH", {
	enumerable: true,
	get: function() {
		return TERMINAL_MAX_WIDTH;
	}
});
Object.defineProperty(exports, "VERSION", {
	enumerable: true,
	get: function() {
		return VERSION;
	}
});
Object.defineProperty(exports, "calculateCost", {
	enumerable: true,
	get: function() {
		return calculateCost;
	}
});
Object.defineProperty(exports, "cloudConfig", {
	enumerable: true,
	get: function() {
		return cloudConfig;
	}
});
Object.defineProperty(exports, "fetchWithProxy", {
	enumerable: true,
	get: function() {
		return fetchWithProxy;
	}
});
Object.defineProperty(exports, "fetchWithRetries", {
	enumerable: true,
	get: function() {
		return fetchWithRetries;
	}
});
Object.defineProperty(exports, "fetchWithTimeout", {
	enumerable: true,
	get: function() {
		return fetchWithTimeout;
	}
});
Object.defineProperty(exports, "fetch_exports", {
	enumerable: true,
	get: function() {
		return fetch_exports;
	}
});
Object.defineProperty(exports, "getCurrentTimestamp", {
	enumerable: true,
	get: function() {
		return getCurrentTimestamp;
	}
});
Object.defineProperty(exports, "getDefaultShareViewBaseUrl", {
	enumerable: true,
	get: function() {
		return getDefaultShareViewBaseUrl;
	}
});
Object.defineProperty(exports, "getShareApiBaseUrl", {
	enumerable: true,
	get: function() {
		return getShareApiBaseUrl;
	}
});
Object.defineProperty(exports, "getShareViewBaseUrl", {
	enumerable: true,
	get: function() {
		return getShareViewBaseUrl;
	}
});
Object.defineProperty(exports, "isOpenAIToolArray", {
	enumerable: true,
	get: function() {
		return isOpenAIToolArray;
	}
});
Object.defineProperty(exports, "isOpenAIToolChoice", {
	enumerable: true,
	get: function() {
		return isOpenAIToolChoice;
	}
});
Object.defineProperty(exports, "isPromptfooSampleTarget", {
	enumerable: true,
	get: function() {
		return isPromptfooSampleTarget;
	}
});
Object.defineProperty(exports, "openaiToolChoiceToBedrock", {
	enumerable: true,
	get: function() {
		return openaiToolChoiceToBedrock;
	}
});
Object.defineProperty(exports, "openaiToolsToBedrock", {
	enumerable: true,
	get: function() {
		return openaiToolsToBedrock;
	}
});
Object.defineProperty(exports, "parseChatPrompt", {
	enumerable: true,
	get: function() {
		return parseChatPrompt;
	}
});
Object.defineProperty(exports, "parseRateLimitHeaders", {
	enumerable: true,
	get: function() {
		return parseRateLimitHeaders;
	}
});
Object.defineProperty(exports, "parseRetryAfter", {
	enumerable: true,
	get: function() {
		return parseRetryAfter;
	}
});
Object.defineProperty(exports, "readGlobalConfig", {
	enumerable: true,
	get: function() {
		return readGlobalConfig;
	}
});
Object.defineProperty(exports, "sleep", {
	enumerable: true,
	get: function() {
		return sleep;
	}
});
Object.defineProperty(exports, "toTitleCase", {
	enumerable: true,
	get: function() {
		return toTitleCase;
	}
});
Object.defineProperty(exports, "transformToolChoice", {
	enumerable: true,
	get: function() {
		return transformToolChoice;
	}
});
Object.defineProperty(exports, "transformTools", {
	enumerable: true,
	get: function() {
		return transformTools;
	}
});
Object.defineProperty(exports, "writeGlobalConfig", {
	enumerable: true,
	get: function() {
		return writeGlobalConfig;
	}
});
Object.defineProperty(exports, "writeGlobalConfigPartial", {
	enumerable: true,
	get: function() {
		return writeGlobalConfigPartial;
	}
});

//# sourceMappingURL=fetch-Gr9TColK.cjs.map
#!/usr/bin/env node
import { E as getEnvString, j as state, n as getLogLevel, s as logger } from "./logger-D6YuF-jw.js";
import { r as importModule } from "./esm-q8gZbIbM.js";
import { i as initializeAgenticCache, n as generateCacheKey, r as getCachedResponse, t as cacheResponse } from "./agentic-utils-CKMTZqR_.js";
import { createRequire } from "node:module";
import fs from "fs";
import path from "path";
import os from "os";
import dedent from "dedent";
//#region src/providers/opencode-sdk.ts
/**
* Check if promptfoo is in debug mode
*/
function isDebugMode() {
	return getLogLevel() === "debug";
}
/**
* Maximum number of sessions to keep in memory to prevent unbounded growth
*/
const MAX_SESSIONS = 100;
/**
* Resolve ESM-only package entry point by reading package.json exports
* Handles packages that only have "import" condition (no "require" condition)
*
* @param packageName - The package name (e.g., '@opencode-ai/sdk')
* @param basePath - Base path for resolution
* @returns Absolute path to the ESM entry point
*/
function resolveEsmPackage(packageName, exportPath, basePath) {
	const require = createRequire(path.join(basePath, "package.json"));
	let packageJsonPath;
	try {
		packageJsonPath = require.resolve(`${packageName}/package.json`);
	} catch {
		packageJsonPath = path.join(basePath, "node_modules", ...packageName.split("/"), "package.json");
		if (!fs.existsSync(packageJsonPath)) throw new Error(`Cannot find ${packageName}/package.json`);
	}
	const packageDir = path.dirname(packageJsonPath);
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
	let esmEntry;
	if (packageJson.exports) {
		const mainExport = packageJson.exports[exportPath] || (exportPath === "." ? packageJson.exports["."] || packageJson.exports : void 0);
		if (typeof mainExport === "string") esmEntry = mainExport;
		else if (typeof mainExport === "object") esmEntry = mainExport.import || mainExport.default;
	}
	if (!esmEntry) esmEntry = packageJson.module || packageJson.main;
	if (!esmEntry) throw new Error(`Cannot find ESM entry point in ${packageName}/package.json`);
	return path.join(packageDir, esmEntry);
}
function unwrapOpenCodeResult(result) {
	if (!result) return;
	if (typeof result === "object" && result !== null && "data" in result) return result.data;
	return result;
}
function getSessionPath(sessionId) {
	return {
		id: sessionId,
		sessionID: sessionId
	};
}
function tryParseJson(value) {
	try {
		return JSON.stringify(JSON.parse(value));
	} catch {
		return;
	}
}
function normalizeStructuredText(value) {
	const trimmedValue = value.trim();
	const directJson = tryParseJson(trimmedValue);
	if (directJson) return directJson;
	const fencedJsonMatch = trimmedValue.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (!fencedJsonMatch?.[1]) return;
	return tryParseJson(fencedJsonMatch[1]);
}
/**
* Helper to load the OpenCode SDK ESM module
*
* Uses a two-phase approach:
* 1. Try simple dynamic import - works when SDK is in same node_modules tree
* 2. Fall back to smart ESM resolution for edge cases (pnpm, global installs, monorepos)
*/
async function loadOpenCodeSDK() {
	const directImports = [{
		specifier: "@opencode-ai/sdk/v2",
		exportPath: "./v2",
		apiVersion: "v2"
	}, {
		specifier: "@opencode-ai/sdk",
		exportPath: ".",
		apiVersion: "v1"
	}];
	for (const candidate of directImports) try {
		logger.debug(`Attempting dynamic import of ${candidate.specifier}`);
		return {
			...await import(candidate.specifier),
			apiVersion: candidate.apiVersion
		};
	} catch (error) {
		logger.debug(`Dynamic import failed for ${candidate.specifier}`, { error });
	}
	const basePath = state.basePath && path.isAbsolute(state.basePath) ? state.basePath : process.cwd();
	for (const candidate of directImports) try {
		const modulePath = resolveEsmPackage("@opencode-ai/sdk", candidate.exportPath, basePath);
		logger.debug(`Resolved OpenCode SDK path (${candidate.apiVersion}): ${modulePath}`);
		return {
			...await importModule(modulePath),
			apiVersion: candidate.apiVersion
		};
	} catch (error) {
		logger.debug(`Smart resolution failed for ${candidate.specifier}`, { error });
	}
	const err = /* @__PURE__ */ new Error("Failed to resolve @opencode-ai/sdk");
	logger.error(`Failed to load OpenCode SDK: ${err}`);
	throw new Error(dedent`The @opencode-ai/sdk package is required but not installed.

    To use the OpenCode SDK provider, install it with:
      npm install @opencode-ai/sdk

    For more information, see: https://www.promptfoo.dev/docs/providers/opencode-sdk/`);
}
var OpenCodeSDKProvider = class {
	config;
	env;
	providerId = "opencode:sdk";
	opencodeModule;
	client;
	server;
	sessions = /* @__PURE__ */ new Map();
	sessionOrder = [];
	constructor(options = {}) {
		const { config, env, id } = options;
		this.config = config ?? {};
		this.env = env;
		this.providerId = id ?? this.providerId;
	}
	id() {
		return this.providerId;
	}
	/**
	* Get API key based on provider_id or common environment variables
	*/
	getApiKey(config = this.config) {
		if (config?.apiKey) return config.apiKey;
		const providerId = config?.provider_id?.toLowerCase();
		if (providerId === "anthropic") return this.env?.ANTHROPIC_API_KEY || getEnvString("ANTHROPIC_API_KEY");
		if (providerId === "openai") return this.env?.OPENAI_API_KEY || getEnvString("OPENAI_API_KEY");
		if (providerId === "google") return this.env?.GOOGLE_API_KEY || getEnvString("GOOGLE_API_KEY");
		return this.env?.ANTHROPIC_API_KEY || getEnvString("ANTHROPIC_API_KEY") || this.env?.OPENAI_API_KEY || getEnvString("OPENAI_API_KEY");
	}
	toString() {
		return "[OpenCode SDK Provider]";
	}
	async cleanup() {
		for (const session of this.sessions.values()) try {
			await this.deleteSession(session);
		} catch (err) {
			logger.debug(`Failed to delete persistent session ${session.id}: ${err}`);
		}
		this.sessions.clear();
		this.sessionOrder = [];
		if (this.server) {
			try {
				this.server.close();
			} catch (err) {
				logger.debug(`Failed to close OpenCode server: ${err}`);
			}
			this.server = void 0;
		}
	}
	/**
	* Build the tools configuration based on config and defaults
	*/
	buildToolsConfig(config) {
		if (config.tools) return config.tools;
		if (!config.working_dir) return {
			bash: false,
			edit: false,
			write: false,
			read: false,
			grep: false,
			glob: false,
			list: false,
			patch: false,
			todowrite: false,
			todoread: false,
			webfetch: false,
			question: false,
			skill: false,
			lsp: false
		};
		return {
			bash: false,
			edit: false,
			write: false,
			read: true,
			grep: true,
			glob: true,
			list: true,
			patch: false,
			todowrite: false,
			todoread: false,
			webfetch: false,
			question: false,
			skill: false,
			lsp: false
		};
	}
	buildQuery(config, workingDir) {
		const query = {};
		if (config.working_dir && workingDir) query.directory = workingDir;
		if (config.workspace) query.workspace = config.workspace;
		return Object.keys(query).length > 0 ? query : void 0;
	}
	buildSessionKey(config, workingDir) {
		return generateCacheKey("opencode:sdk:session", {
			baseUrl: config.baseUrl,
			workingDir: config.working_dir ? workingDir : void 0,
			workspace: config.workspace,
			provider_id: config.provider_id,
			model: config.model,
			tools: this.buildToolsConfig(config),
			permission: config.permission,
			agent: config.agent,
			custom_agent: config.custom_agent,
			format: config.format,
			variant: config.variant,
			mcp: config.mcp
		});
	}
	buildServerEnv(config) {
		const serverEnv = {};
		for (const [key, value] of Object.entries(process.env)) if (value !== void 0) serverEnv[key] = value;
		if (this.env) for (const key of Object.keys(this.env).sort()) {
			const value = this.env[key];
			if (value !== void 0) serverEnv[key] = value;
		}
		if (config.log_level === "debug" || isDebugMode()) {
			serverEnv.DEBUG = serverEnv.DEBUG || "opencode:*";
			logger.debug("[OpenCode SDK] Debug mode enabled, synced from promptfoo log level");
		}
		const homeDir = os.homedir();
		const opencodeBinPath = path.join(homeDir, ".opencode", "bin");
		if (!serverEnv.PATH?.includes(opencodeBinPath)) {
			serverEnv.PATH = `${opencodeBinPath}:${serverEnv.PATH ?? ""}`;
			logger.debug(`Added ${opencodeBinPath} to PATH for OpenCode CLI`);
		}
		return serverEnv;
	}
	buildServerConfig(config) {
		const serverConfig = {};
		if (config.log_level) serverConfig.logLevel = config.log_level;
		if (config.mcp && Object.keys(config.mcp).length > 0) {
			serverConfig.mcp = config.mcp;
			logger.debug(`[OpenCode SDK] Configuring MCP servers: ${Object.keys(config.mcp).join(", ")}`);
		}
		if (config.custom_agent) {
			serverConfig.agent = { custom: {
				description: config.custom_agent.description,
				model: config.custom_agent.model,
				temperature: config.custom_agent.temperature,
				top_p: config.custom_agent.top_p,
				tools: config.custom_agent.tools,
				permission: config.custom_agent.permission,
				prompt: config.custom_agent.prompt,
				mode: config.custom_agent.mode ?? "primary",
				maxSteps: config.custom_agent.steps ?? config.custom_agent.maxSteps,
				color: config.custom_agent.color,
				disable: config.custom_agent.disable,
				hidden: config.custom_agent.hidden
			} };
			logger.debug(`[OpenCode SDK] Configuring custom agent: ${config.custom_agent.description}`);
		}
		if (config.permission) {
			serverConfig.permission = config.permission;
			logger.debug("[OpenCode SDK] Configuring global permissions");
		}
		const toolsConfig = this.buildToolsConfig(config);
		if (toolsConfig) serverConfig.tools = toolsConfig;
		if (config.provider_id && config.apiKey) {
			serverConfig.provider = { [config.provider_id]: { options: { apiKey: config.apiKey } } };
			logger.debug(`[OpenCode SDK] Injecting provider apiKey for ${config.provider_id}`);
		}
		return serverConfig;
	}
	warnOnIgnoredBaseUrlConfig(config) {
		if (!config.baseUrl) return;
		const ignoredSettings = [
			config.hostname === void 0 ? void 0 : "hostname",
			config.port === void 0 ? void 0 : "port",
			config.timeout === void 0 ? void 0 : "timeout",
			config.log_level === void 0 ? void 0 : "log_level",
			config.mcp ? "mcp" : void 0,
			config.custom_agent ? "custom_agent" : void 0,
			config.apiKey ? "apiKey" : void 0
		].filter(Boolean);
		if (ignoredSettings.length > 0) logger.warn(`[OpenCode SDK] baseUrl uses an existing OpenCode server. These config keys are ignored unless that server is preconfigured: ${ignoredSettings.join(", ")}`);
	}
	buildDeleteSessionParameters(session) {
		if (!this.opencodeModule) throw new Error("OpenCode SDK module is not loaded");
		if (this.opencodeModule.apiVersion === "v2") return {
			sessionID: session.id,
			...session.query
		};
		return {
			path: getSessionPath(session.id),
			query: session.query
		};
	}
	async deleteSession(session) {
		if (!session || !this.client?.session?.delete) return;
		await this.client.session.delete(this.buildDeleteSessionParameters(session));
	}
	/**
	* Add a session to the cache with LRU eviction
	*/
	addSession(cacheKey, session) {
		while (this.sessions.size >= MAX_SESSIONS && this.sessionOrder.length > 0) {
			const oldestKey = this.sessionOrder.shift();
			if (oldestKey) {
				const oldSession = this.sessions.get(oldestKey);
				this.sessions.delete(oldestKey);
				if (oldSession) this.deleteSession(oldSession).catch((err) => {
					logger.debug(`Failed to delete evicted session ${oldSession.id}: ${err}`);
				});
			}
		}
		this.sessions.set(cacheKey, session);
		this.sessionOrder.push(cacheKey);
	}
	prepareCall(context) {
		const config = {
			...this.config,
			...context?.prompt?.config
		};
		if (config.workspace && !config.baseUrl && !config.working_dir) throw new Error("OpenCode SDK workspace support requires either baseUrl or working_dir");
		if (config.apiKey && !config.provider_id && !config.baseUrl) logger.warn("[OpenCode SDK] apiKey is set without provider_id. Prefer setting provider_id so promptfoo can wire the credential into the spawned OpenCode server.");
		this.warnOnIgnoredBaseUrlConfig(config);
		if (config.working_dir) {
			const workingDir = path.isAbsolute(config.working_dir) ? config.working_dir : path.resolve(process.cwd(), config.working_dir);
			let stats;
			try {
				stats = fs.statSync(workingDir);
			} catch (err) {
				throw new Error(`Working directory ${config.working_dir} (resolved to ${workingDir}) does not exist or isn't accessible: ${err.message}`);
			}
			if (!stats.isDirectory()) throw new Error(`Working directory ${config.working_dir} (resolved to ${workingDir}) is not a directory`);
			return {
				config,
				isTempDir: false,
				workingDir
			};
		}
		return {
			config,
			isTempDir: true,
			workingDir: fs.mkdtempSync(path.join(os.tmpdir(), "promptfoo-opencode-sdk-"))
		};
	}
	async ensureClient(config) {
		if (!this.opencodeModule) this.opencodeModule = await loadOpenCodeSDK();
		if (this.client) return;
		const { createOpencode, createOpencodeClient } = this.opencodeModule;
		if (config.baseUrl) {
			this.client = createOpencodeClient({ baseUrl: config.baseUrl });
			return;
		}
		const serverOptions = {
			hostname: config.hostname ?? "127.0.0.1",
			port: config.port ?? 0,
			timeout: config.timeout ?? 3e4,
			env: this.buildServerEnv(config)
		};
		const serverConfig = this.buildServerConfig(config);
		if (Object.keys(serverConfig).length > 0) serverOptions.config = serverConfig;
		const opencode = await createOpencode(serverOptions);
		this.client = opencode.client;
		this.server = opencode.server;
		logger.debug(`OpenCode server started at ${opencode.server.url}`);
	}
	async getOrCreateSession(config, workingDir) {
		if (!this.client || !this.opencodeModule) throw new Error("OpenCode SDK client is not initialized");
		const sessionQuery = this.buildQuery(config, workingDir);
		if (config.session_id) return {
			sessionId: config.session_id,
			sessionQuery
		};
		const sessionCacheKey = this.buildSessionKey(config, workingDir);
		if (config.persist_sessions && this.sessions.has(sessionCacheKey)) return {
			sessionId: this.sessions.get(sessionCacheKey).id,
			sessionQuery
		};
		const createResult = await this.client.session.create(this.buildCreateSessionParameters(config, sessionQuery));
		const sessionId = unwrapOpenCodeResult(createResult)?.id ?? createResult?.id;
		if (!sessionId) throw new Error("Failed to get session ID from OpenCode SDK response");
		const session = {
			id: sessionId,
			query: sessionQuery
		};
		if (config.persist_sessions) {
			this.addSession(sessionCacheKey, session);
			return {
				sessionId,
				sessionQuery
			};
		}
		return {
			sessionId,
			sessionQuery,
			ephemeralSession: session
		};
	}
	buildPromptBody(config, prompt) {
		if (!this.opencodeModule) throw new Error("OpenCode SDK module is not loaded");
		const promptBody = { parts: [{
			type: "text",
			text: prompt
		}] };
		if (config.provider_id || config.model) promptBody.model = {
			providerID: config.provider_id ?? "",
			modelID: config.model ?? ""
		};
		const toolsConfig = this.buildToolsConfig(config);
		if (toolsConfig) promptBody.tools = toolsConfig;
		if (config.agent) promptBody.agent = config.agent;
		else if (config.custom_agent) promptBody.agent = "custom";
		if (config.custom_agent?.prompt) promptBody.system = config.custom_agent.prompt;
		if (config.format) promptBody.format = config.format;
		if (config.variant) promptBody.variant = config.variant;
		if (config.permission && this.opencodeModule.apiVersion === "v1") promptBody.permission = config.permission;
		return promptBody;
	}
	buildCreateSessionParameters(config, sessionQuery) {
		if (!this.opencodeModule) throw new Error("OpenCode SDK module is not loaded");
		const createBody = { title: `promptfoo-${Date.now()}` };
		if (config.permission && this.opencodeModule.apiVersion === "v2") createBody.permission = config.permission;
		if (this.opencodeModule.apiVersion === "v2") return {
			...sessionQuery,
			...createBody
		};
		return {
			body: createBody,
			query: sessionQuery
		};
	}
	buildPromptParameters(config, prompt, sessionId, sessionQuery) {
		if (!this.opencodeModule) throw new Error("OpenCode SDK module is not loaded");
		const promptBody = this.buildPromptBody(config, prompt);
		if (this.opencodeModule.apiVersion === "v2") return {
			sessionID: sessionId,
			...sessionQuery,
			...promptBody
		};
		return {
			path: getSessionPath(sessionId),
			body: promptBody,
			query: sessionQuery
		};
	}
	buildProviderResponse(config, response, sessionId) {
		const responseData = unwrapOpenCodeResult(response);
		const assistantMessage = responseData?.info;
		const parts = responseData?.parts ?? [];
		let output = "";
		for (const part of parts) if (part.type === "text" && part.text) output += (output ? "\n" : "") + part.text;
		if (config.format?.type === "json_schema") if (assistantMessage?.structured === void 0) output = normalizeStructuredText(output) ?? output;
		else output = JSON.stringify(assistantMessage.structured);
		const tokens = assistantMessage?.tokens;
		return {
			output,
			tokenUsage: tokens ? {
				prompt: tokens.input ?? 0,
				completion: tokens.output ?? 0,
				total: (tokens.input ?? 0) + (tokens.output ?? 0)
			} : void 0,
			cost: assistantMessage?.cost ?? 0,
			raw: JSON.stringify(response),
			sessionId
		};
	}
	handleCallError(error, callOptions) {
		if (error instanceof Error && error.name === "AbortError" || callOptions?.abortSignal?.aborted) {
			logger.warn("OpenCode SDK call aborted");
			return { error: "OpenCode SDK call aborted" };
		}
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT" && "message" in error && typeof error.message === "string" && error.message.includes("opencode")) {
			const cliError = dedent`The OpenCode CLI is required but not installed.

        The OpenCode SDK requires the 'opencode' CLI to be installed and available in your PATH.

        Install it with:
          curl -fsSL https://opencode.ai/install | bash

        Or see: https://opencode.ai for other installation methods.`;
			logger.error(cliError);
			return { error: cliError };
		}
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("Error calling OpenCode SDK", { error });
		return { error: `Error calling OpenCode SDK: ${errorMessage}` };
	}
	async callApi(prompt, context, callOptions) {
		const { config, isTempDir, workingDir } = this.prepareCall(context);
		const mcpConfig = config.mcp && Object.keys(config.mcp).length > 0 ? config.mcp : void 0;
		const cacheResult = await initializeAgenticCache({
			cacheKeyPrefix: "opencode:sdk",
			workingDir: config.working_dir ? workingDir : void 0,
			bustCache: context?.bustCache,
			mcp: mcpConfig,
			cacheMcp: config.cache_mcp
		}, {
			prompt,
			provider_id: config.provider_id,
			model: config.model,
			tools: this.buildToolsConfig(config),
			permission: config.permission,
			agent: config.agent,
			custom_agent: config.custom_agent,
			workspace: config.workspace,
			format: config.format,
			variant: config.variant
		});
		const cachedResponse = await getCachedResponse(cacheResult, "OpenCode SDK");
		if (cachedResponse) return cachedResponse;
		if (callOptions?.abortSignal?.aborted) return { error: "OpenCode SDK call aborted before it started" };
		let ephemeralSession;
		try {
			await this.ensureClient(config);
			const session = await this.getOrCreateSession(config, workingDir);
			ephemeralSession = session.ephemeralSession;
			const promptOptions = this.buildPromptParameters(config, prompt, session.sessionId, session.sessionQuery);
			logger.debug(`OpenCode SDK prompt options:`, promptOptions);
			const client = this.client;
			if (!client) throw new Error("OpenCode SDK client is not initialized");
			const response = await client.session.prompt(promptOptions);
			logger.debug(`OpenCode SDK response received`);
			const providerResponse = this.buildProviderResponse(config, response, session.sessionId);
			await cacheResponse(cacheResult, providerResponse, "OpenCode SDK");
			logger.debug(`OpenCode SDK response: ${providerResponse.output.slice(0, 100)}...`);
			return providerResponse;
		} catch (error) {
			return this.handleCallError(error, callOptions);
		} finally {
			if (ephemeralSession) try {
				await this.deleteSession(ephemeralSession);
			} catch (err) {
				logger.debug(`Failed to delete non-persistent session ${ephemeralSession.id}: ${err}`);
			}
			if (isTempDir && workingDir) fs.rmSync(workingDir, {
				recursive: true,
				force: true
			});
		}
	}
};
//#endregion
export { OpenCodeSDKProvider };

//# sourceMappingURL=opencode-sdk-DCAQTXdT.js.map
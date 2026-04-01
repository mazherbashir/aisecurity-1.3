const require_logger = require("./logger-wcsrvnoS.cjs");
const require_fetch = require("./fetch-Gr9TColK.cjs");
const require_chat = require("./chat-Cux1uti4.cjs");
const require_responses = require("./responses-BfwTwTHc.cjs");
let fs = require("fs");
fs = require_logger.__toESM(fs);
let path = require("path");
path = require_logger.__toESM(path);
let os = require("os");
os = require_logger.__toESM(os);
let crypto = require("crypto");
crypto = require_logger.__toESM(crypto);
let ws = require("ws");
ws = require_logger.__toESM(ws);
let json5 = require("json5");
json5 = require_logger.__toESM(json5);
//#region src/providers/openclaw/shared.ts
const DEFAULT_GATEWAY_PORT = 18789;
const DEFAULT_GATEWAY_HOST = "127.0.0.1";
/**
* Cached config to avoid re-reading the file multiple times during provider init.
*/
let cachedConfig;
let cachedConfigPath;
function resolveConfigPath(env) {
	return env?.OPENCLAW_CONFIG_PATH || require_logger.getEnvString("OPENCLAW_CONFIG_PATH") || path.default.join(os.default.homedir(), ".openclaw", "openclaw.json");
}
function normalizeGatewayUrl(url, transport) {
	const trimmed = url.trim();
	if (!trimmed) return;
	if (transport === "http") {
		if (trimmed.startsWith("wss://")) return `https://${trimmed.slice(6)}`;
		if (trimmed.startsWith("ws://")) return `http://${trimmed.slice(5)}`;
		return trimmed;
	}
	if (trimmed.startsWith("https://")) return `wss://${trimmed.slice(8)}`;
	if (trimmed.startsWith("http://")) return `ws://${trimmed.slice(7)}`;
	return trimmed;
}
function resolveGatewayHost(gatewayConfig) {
	const bind = gatewayConfig?.bind?.trim();
	const customBindHost = gatewayConfig?.customBindHost?.trim();
	if (!bind || bind === "auto" || bind === "loopback" || bind === "lan" || bind === "tailnet" || bind === "0.0.0.0" || bind === "::" || bind === "127.0.0.1" || bind === "localhost" || bind === "::1") return DEFAULT_GATEWAY_HOST;
	if (bind === "custom") {
		if (!customBindHost || customBindHost === "0.0.0.0" || customBindHost === "::" || customBindHost === "127.0.0.1" || customBindHost === "localhost" || customBindHost === "::1") return DEFAULT_GATEWAY_HOST;
		return customBindHost;
	}
	return bind;
}
function buildLocalGatewayUrl(gatewayConfig, transport) {
	const scheme = transport === "ws" ? gatewayConfig?.tls?.enabled ? "wss" : "ws" : gatewayConfig?.tls?.enabled ? "https" : "http";
	const port = gatewayConfig?.port ?? 18789;
	return `${scheme}://${resolveGatewayHost(gatewayConfig)}:${port}`;
}
function resolveGatewayUrlFromConfig(openclawConfig, transport) {
	const gatewayConfig = openclawConfig?.gateway;
	if (!gatewayConfig) return;
	if (gatewayConfig.mode === "remote") {
		const remoteUrl = normalizeGatewayUrl(gatewayConfig.remote?.url ?? "", transport);
		if (remoteUrl) return remoteUrl;
	}
	return buildLocalGatewayUrl(gatewayConfig, transport);
}
function toAuthSecret(kind, value) {
	const trimmed = value?.trim();
	return trimmed ? {
		kind,
		value: trimmed
	} : void 0;
}
function resolveAuthSecretFromConfig(openclawConfig) {
	const gatewayConfig = openclawConfig?.gateway;
	const authMode = gatewayConfig?.auth?.mode?.trim();
	const preferRemoteCredentials = gatewayConfig?.mode === "remote";
	const localToken = toAuthSecret("token", gatewayConfig?.auth?.token);
	const localPassword = toAuthSecret("password", gatewayConfig?.auth?.password);
	const remoteToken = toAuthSecret("token", gatewayConfig?.remote?.token);
	const remotePassword = toAuthSecret("password", gatewayConfig?.remote?.password);
	if (preferRemoteCredentials) {
		if (authMode === "password") return remotePassword || localPassword || remoteToken || localToken;
		if (authMode === "token") return remoteToken || localToken || remotePassword || localPassword;
		return remoteToken || remotePassword || localToken || localPassword;
	}
	if (authMode === "password") return localPassword || remotePassword || localToken || remoteToken;
	if (authMode === "token") return localToken || remoteToken || localPassword || remotePassword;
	return localToken || localPassword || remoteToken || remotePassword;
}
/**
* Read and parse the active OpenClaw configuration file.
* Results are cached based on file modification time.
* Returns undefined if the file doesn't exist or can't be parsed.
*/
function readOpenClawConfig(env) {
	const configPath = resolveConfigPath(env);
	try {
		if (!fs.default.existsSync(configPath)) return;
		const mtime = fs.default.statSync(configPath).mtimeMs;
		if (cachedConfig && cachedConfigPath === configPath && cachedConfig.mtime === mtime) return cachedConfig.config;
		const raw = fs.default.readFileSync(configPath, "utf-8");
		const config = json5.default.parse(raw);
		cachedConfig = {
			config,
			mtime
		};
		cachedConfigPath = configPath;
		return config;
	} catch (err) {
		require_logger.logger.debug(`Failed to read OpenClaw config at ${configPath}: ${err}`);
		return;
	}
}
/**
* Auto-detect the OpenClaw gateway URL from config, env overrides, or the active config file.
*/
function resolveGatewayUrl(config, env) {
	return resolveGatewayTransportUrl(config, env, "http");
}
function resolveGatewayWsUrl(config, env) {
	return resolveGatewayTransportUrl(config, env, "ws");
}
function resolveGatewayTransportUrl(config, env, transport) {
	const configUrl = config?.gateway_url?.trim();
	if (configUrl) return normalizeGatewayUrl(configUrl, transport) || configUrl;
	const trimmedEnvUrl = (env?.OPENCLAW_GATEWAY_URL || require_logger.getEnvString("OPENCLAW_GATEWAY_URL") || env?.CLAWDBOT_GATEWAY_URL || require_logger.getEnvString("CLAWDBOT_GATEWAY_URL"))?.trim();
	if (trimmedEnvUrl) return normalizeGatewayUrl(trimmedEnvUrl, transport) || trimmedEnvUrl;
	const resolvedUrl = resolveGatewayUrlFromConfig(readOpenClawConfig(env), transport);
	if (resolvedUrl) return resolvedUrl;
	return `${transport === "ws" ? "ws" : "http"}://${DEFAULT_GATEWAY_HOST}:${DEFAULT_GATEWAY_PORT}`;
}
function resolveAuthSecret(config, env) {
	if (config?.auth_token) return {
		kind: "token",
		value: config.auth_token
	};
	if (config?.auth_password) return {
		kind: "password",
		value: config.auth_password
	};
	const envToken = env?.OPENCLAW_GATEWAY_TOKEN || require_logger.getEnvString("OPENCLAW_GATEWAY_TOKEN") || env?.CLAWDBOT_GATEWAY_TOKEN || require_logger.getEnvString("CLAWDBOT_GATEWAY_TOKEN");
	if (envToken) return {
		kind: "token",
		value: envToken
	};
	const envPassword = env?.OPENCLAW_GATEWAY_PASSWORD || require_logger.getEnvString("OPENCLAW_GATEWAY_PASSWORD") || env?.CLAWDBOT_GATEWAY_PASSWORD || require_logger.getEnvString("CLAWDBOT_GATEWAY_PASSWORD");
	if (envPassword) return {
		kind: "password",
		value: envPassword
	};
	return resolveAuthSecretFromConfig(readOpenClawConfig(env));
}
/**
* Auto-detect the OpenClaw gateway bearer secret from config, env overrides, or the active
* config file. OpenClaw accepts either a token or password as the HTTP bearer secret.
*/
function resolveAuthToken(config, env) {
	return resolveAuthSecret(config, env)?.value;
}
/**
* Build common OpenClaw headers for agent-id and session-key.
* Note: thinking_level is only supported by the WS Agent provider and is
* passed as an RPC param there, not as an HTTP header.
*/
function buildOpenClawHeaders(agentId, config) {
	const headers = { "x-openclaw-agent-id": agentId };
	if (config?.session_key) headers["x-openclaw-session-key"] = config.session_key;
	return headers;
}
/**
* Build provider options for OpenAI-compatible OpenClaw providers (chat, responses).
* Resolves gateway URL, auth token, and merges OpenClaw-specific headers.
*/
function buildOpenClawProviderOptions(agentId, providerOptions) {
	const config = providerOptions.config || {};
	const env = providerOptions.env;
	const gatewayUrl = resolveGatewayUrl(config, env);
	const authToken = resolveAuthToken(config, env);
	return {
		...providerOptions,
		config: {
			...config,
			apiBaseUrl: `${gatewayUrl}/v1`,
			...authToken && { apiKey: authToken },
			apiKeyRequired: false,
			headers: {
				...config.headers,
				...buildOpenClawHeaders(agentId, config)
			}
		}
	};
}
//#endregion
//#region src/providers/openclaw/agent.ts
const OPENCLAW_PROTOCOL_VERSION = 3;
/**
* OpenClaw WebSocket Agent Provider
*
* Custom provider that uses the native OpenClaw WS RPC protocol to invoke agents.
* Supports full streaming with event accumulation.
*
* Protocol flow:
*   1. Open WS connection to gateway
*   2. Receive connect.challenge event → send connect request
*   3. Receive hello-ok response → send agent request
*   4. Receive agent accepted response → send agent.wait
*   5. Accumulate streaming "agent" events (stream: "assistant")
*   6. Resolve on agent.wait response
*
* Usage:
*   openclaw:agent           - default agent (main)
*   openclaw:agent:main      - explicit agent ID
*   openclaw:agent:my-agent  - custom agent ID
*/
var OpenClawAgentProvider = class {
	agentId;
	gatewayUrl;
	authKind;
	authSecret;
	openclawConfig;
	timeoutMs;
	activeConnections = /* @__PURE__ */ new Set();
	constructor(agentId, providerOptions = {}) {
		this.agentId = agentId;
		this.openclawConfig = providerOptions.config || {};
		const env = providerOptions.env;
		this.gatewayUrl = resolveGatewayWsUrl(this.openclawConfig, env);
		const authSecret = resolveAuthSecret(this.openclawConfig, env);
		this.authKind = authSecret?.kind;
		this.authSecret = authSecret?.value;
		this.timeoutMs = this.openclawConfig.timeoutMs ?? require_fetch.REQUEST_TIMEOUT_MS;
	}
	id() {
		return `openclaw:agent:${this.agentId}`;
	}
	toString() {
		return `[OpenClaw Agent Provider ${this.agentId}]`;
	}
	toJSON() {
		return { provider: this.id() };
	}
	async cleanup() {
		for (const ws$1 of this.activeConnections) ws$1.close();
		this.activeConnections.clear();
	}
	async callApi(prompt) {
		const sessionKey = this.openclawConfig.session_key || `promptfoo-${crypto.default.randomUUID()}`;
		return new Promise((resolve) => {
			const ws$2 = new ws.default(this.gatewayUrl);
			this.activeConnections.add(ws$2);
			const agentRequestId = crypto.default.randomUUID();
			const waitRequestId = crypto.default.randomUUID();
			const idempotencyKey = crypto.default.randomUUID();
			let lastText = "";
			let runId;
			let connected = false;
			let resolved = false;
			const finish = (result, closeSocket = true) => {
				if (resolved) return;
				resolved = true;
				clearTimeout(timeout);
				this.activeConnections.delete(ws$2);
				if (closeSocket) ws$2.close();
				resolve(result);
			};
			const timeout = setTimeout(() => {
				finish({ error: `OpenClaw agent request timed out after ${this.timeoutMs}ms` });
			}, this.timeoutMs);
			ws$2.on("error", (err) => {
				finish({ error: `OpenClaw WebSocket error: ${err.message}` });
			});
			ws$2.on("close", () => {
				this.activeConnections.delete(ws$2);
				if (!resolved) finish({ error: "OpenClaw WebSocket connection closed unexpectedly" }, false);
			});
			ws$2.on("message", (data) => {
				let frame;
				try {
					frame = JSON.parse(data.toString());
				} catch {
					require_logger.logger.debug("[OpenClaw Agent] Failed to parse WS frame");
					return;
				}
				require_logger.logger.debug("[OpenClaw Agent] Frame received", {
					type: frame.type,
					event: frame.event,
					id: frame.id
				});
				if (frame.type === "event" && frame.event === "connect.challenge") {
					ws$2.send(JSON.stringify({
						type: "req",
						id: crypto.default.randomUUID(),
						method: "connect",
						params: {
							minProtocol: OPENCLAW_PROTOCOL_VERSION,
							maxProtocol: OPENCLAW_PROTOCOL_VERSION,
							client: {
								id: "gateway-client",
								displayName: "promptfoo",
								version: require_fetch.VERSION,
								platform: process.platform,
								mode: "cli"
							},
							role: "operator",
							scopes: ["operator.read", "operator.write"],
							caps: [],
							commands: [],
							permissions: {},
							...this.authSecret && this.authKind && { auth: this.authKind === "password" ? { password: this.authSecret } : { token: this.authSecret } }
						}
					}));
					return;
				}
				if (frame.type === "res" && !connected) {
					if (!frame.ok) {
						finish({ error: `OpenClaw connect failed: ${frame.error?.message || "unknown error"}` });
						return;
					}
					connected = true;
					ws$2.send(JSON.stringify({
						type: "req",
						id: agentRequestId,
						method: "agent",
						params: {
							message: prompt,
							agentId: this.agentId,
							idempotencyKey,
							sessionKey,
							...this.openclawConfig.thinking_level && { thinking: this.openclawConfig.thinking_level },
							...this.openclawConfig.extra_system_prompt && { extraSystemPrompt: this.openclawConfig.extra_system_prompt }
						}
					}));
					return;
				}
				if (frame.type === "res" && frame.id === agentRequestId) {
					if (!frame.ok) {
						finish({ error: `OpenClaw agent error: ${frame.error?.message || "unknown error"}` });
						return;
					}
					const payload = frame.payload;
					runId = typeof payload?.runId === "string" && payload.runId.trim() ? payload.runId : void 0;
					if (!runId) {
						require_logger.logger.warn("[OpenClaw Agent] Missing runId in accepted response", {
							agentId: this.agentId,
							payload
						});
						finish({ error: "OpenClaw agent error: gateway accepted request without a runId" });
						return;
					}
					ws$2.send(JSON.stringify({
						type: "req",
						id: waitRequestId,
						method: "agent.wait",
						params: {
							runId,
							timeoutMs: this.timeoutMs
						}
					}));
					return;
				}
				if (frame.type === "event" && frame.event === "agent") {
					const payload = frame.payload;
					if (payload?.runId && runId && payload.runId !== runId) return;
					if (payload?.stream === "assistant" && payload?.data?.text) lastText = payload.data.text;
					return;
				}
				if (frame.type === "res" && frame.id === waitRequestId) {
					if (frame.ok) finish({ output: lastText || "No output from agent" });
					else finish({ error: `OpenClaw agent error: ${frame.error?.message || "unknown error"}` });
					return;
				}
			});
		});
	}
};
//#endregion
//#region src/providers/openclaw/chat.ts
/**
* OpenClaw chat provider extends OpenAI chat completion provider.
*
* OpenClaw exposes an OpenAI-compatible HTTP API at /v1/chat/completions.
* This provider auto-detects gateway URL and bearer auth from:
*   1. Explicit config (gateway_url, auth_token, auth_password)
*   2. Environment variables (OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN, OPENCLAW_GATEWAY_PASSWORD)
*   3. The active OpenClaw config file (OPENCLAW_CONFIG_PATH or ~/.openclaw/openclaw.json),
*      including gateway.remote.url and gateway.tls.enabled
*
* Usage:
*   openclaw              - default agent (main)
*   openclaw:main         - specific agent
*   openclaw:coding-agent - named agent
*/
var OpenClawChatProvider = class extends require_chat.OpenAiChatCompletionProvider {
	agentId;
	constructor(agentId, providerOptions = {}) {
		super(`openclaw:${agentId}`, buildOpenClawProviderOptions(agentId, providerOptions));
		this.agentId = agentId;
	}
	id() {
		return `openclaw:${this.agentId}`;
	}
	toString() {
		return `[OpenClaw Provider ${this.agentId}]`;
	}
	getApiUrlDefault() {
		return `http://${DEFAULT_GATEWAY_HOST}:${DEFAULT_GATEWAY_PORT}/v1`;
	}
	getApiKey() {
		return this.config.apiKey;
	}
	getApiUrl() {
		return this.config.apiBaseUrl || this.getApiUrlDefault();
	}
};
//#endregion
//#region src/providers/openclaw/responses.ts
/**
* OpenClaw Responses API Provider
*
* Extends OpenAI Responses API provider with OpenClaw-specific configuration.
* Routes through the OpenClaw gateway's /v1/responses endpoint.
*
* Requires `gateway.http.endpoints.responses.enabled=true` in OpenClaw config.
*
* Usage:
*   openclaw:responses       - default agent (main)
*   openclaw:responses:main  - explicit agent ID
*   openclaw:responses:X     - custom agent ID
*/
var OpenClawResponsesProvider = class extends require_responses.OpenAiResponsesProvider {
	agentId;
	constructor(agentId, providerOptions = {}) {
		super(`openclaw:${agentId}`, buildOpenClawProviderOptions(agentId, providerOptions));
		this.agentId = agentId;
	}
	id() {
		return `openclaw:responses:${this.agentId}`;
	}
	toString() {
		return `[OpenClaw Responses Provider ${this.agentId}]`;
	}
	getApiUrlDefault() {
		return `http://${DEFAULT_GATEWAY_HOST}:${DEFAULT_GATEWAY_PORT}/v1`;
	}
	getApiKey() {
		return this.config.apiKey;
	}
	getApiUrl() {
		return this.config.apiBaseUrl || this.getApiUrlDefault();
	}
	async getOpenAiBody(prompt, context, callApiOptions) {
		const result = await super.getOpenAiBody(prompt, context, callApiOptions);
		if ("text" in result.body) delete result.body.text;
		return result;
	}
};
//#endregion
//#region src/providers/openclaw/tools.ts
/**
* OpenClaw Tool Invoke Provider
*
* Simple HTTP provider for direct tool invocation via POST /tools/invoke.
* The tool name is extracted from the provider path:
* openclaw:tools:sessions_list → tool="sessions_list"
*
* The prompt is parsed as JSON for tool arguments. If it's not valid JSON,
* it's passed as a single `input` argument.
*
* Usage:
*   openclaw:tools:sessions_list - invoke the sessions_list tool
*   openclaw:tools:session_status - invoke the session_status tool
*
* Optional config:
*   action  - tool sub-action, forwarded as body.action
*   dry_run - dry-run hint, forwarded as body.dryRun
*/
var OpenClawToolInvokeProvider = class {
	toolName;
	gatewayUrl;
	authToken;
	openclawConfig;
	timeoutMs;
	constructor(toolName, providerOptions = {}) {
		this.toolName = toolName;
		this.openclawConfig = providerOptions.config || {};
		const env = providerOptions.env;
		this.gatewayUrl = resolveGatewayUrl(this.openclawConfig, env);
		this.authToken = resolveAuthToken(this.openclawConfig, env);
		this.timeoutMs = this.openclawConfig.timeoutMs ?? require_fetch.REQUEST_TIMEOUT_MS;
	}
	id() {
		return `openclaw:tools:${this.toolName}`;
	}
	toString() {
		return `[OpenClaw Tool Provider ${this.toolName}]`;
	}
	toJSON() {
		return { provider: this.id() };
	}
	async callApi(prompt) {
		let args;
		try {
			args = JSON.parse(prompt);
		} catch {
			args = { input: prompt };
		}
		const url = `${this.gatewayUrl}/tools/invoke`;
		const headers = {
			"Content-Type": "application/json",
			...this.openclawConfig.headers || {}
		};
		if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
		const body = {
			tool: this.toolName,
			...this.openclawConfig.action && { action: this.openclawConfig.action },
			args,
			...typeof this.openclawConfig.dry_run === "boolean" && { dryRun: this.openclawConfig.dry_run },
			...this.openclawConfig.session_key && { sessionKey: this.openclawConfig.session_key }
		};
		require_logger.logger.debug(`[OpenClaw Tool] POST ${url}`, {
			tool: this.toolName,
			args
		});
		try {
			const controller = new AbortController();
			const fetchTimeout = setTimeout(() => controller.abort(), this.timeoutMs);
			const response = await require_fetch.fetchWithProxy(url, {
				method: "POST",
				headers,
				body: JSON.stringify(body),
				signal: controller.signal
			}).finally(() => clearTimeout(fetchTimeout));
			if (!response.ok) {
				const text = await response.text();
				return { error: `OpenClaw tool invoke failed (${response.status}): ${text}` };
			}
			const data = await response.json();
			if (data.ok) return { output: typeof data.result === "string" ? data.result : JSON.stringify(data.result) };
			return { error: data.error || "Unknown tool error" };
		} catch (err) {
			return { error: `OpenClaw tool invoke error: ${err instanceof Error ? err.message : String(err)}` };
		}
	}
};
//#endregion
//#region src/providers/openclaw/index.ts
/**
* Create an OpenClaw provider from a provider path string.
*
* Routing:
*   openclaw                → OpenClawChatProvider('main')
*   openclaw:main           → OpenClawChatProvider('main')
*   openclaw:my-agent       → OpenClawChatProvider('my-agent')
*   openclaw:responses      → OpenClawResponsesProvider('main')
*   openclaw:responses:X    → OpenClawResponsesProvider('X')
*   openclaw:agent          → OpenClawAgentProvider('main')
*   openclaw:agent:X        → OpenClawAgentProvider('X')
*   openclaw:tools:sessions_list → OpenClawToolInvokeProvider('sessions_list')
*/
function createOpenClawProvider(providerPath, providerOptions = {}, env) {
	const splits = providerPath.split(":");
	const keyword = splits[1];
	const opts = {
		...providerOptions,
		env
	};
	if (keyword === "responses") return new OpenClawResponsesProvider(splits[2] || "main", opts);
	if (keyword === "agent") return new OpenClawAgentProvider(splits[2] || "main", opts);
	if (keyword === "tools") {
		const toolName = splits.slice(2).join(":");
		if (!toolName) throw new Error("OpenClaw tools provider requires a tool name: openclaw:tools:<tool-name>");
		return new OpenClawToolInvokeProvider(toolName, opts);
	}
	return new OpenClawChatProvider(splits.length > 1 ? splits.slice(1).join(":") : "main", opts);
}
//#endregion
exports.createOpenClawProvider = createOpenClawProvider;

//# sourceMappingURL=openclaw-BjypNwXB.cjs.map
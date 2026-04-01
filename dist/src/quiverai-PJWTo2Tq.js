import { C as getEnvString, a as logger } from "./logger-DWcVXa9k.js";
import { h as REQUEST_TIMEOUT_MS, t as fetchWithProxy } from "./fetch-JwctAM20.js";
import { r as fetchWithCache } from "./cache-CadYkugS.js";
//#region src/providers/quiverai.ts
const QUIVERAI_API_BASE_URL = "https://api.quiver.ai/v1";
const QUIVERAI_DEFAULT_MODEL = "arrow-preview";
/**
* QuiverAI provider for SVG vector graphics generation using the Arrow model.
* Uses QuiverAI's native SVG generation API (POST /v1/svgs/generations).
* Streams by default for faster time-to-first-token.
*/
var QuiverAiProvider = class {
	config;
	modelName;
	apiKey;
	apiBaseUrl;
	constructor(modelName, options = {}) {
		const { config, id, env } = options;
		this.modelName = modelName;
		this.apiKey = config?.apiKey || env?.QUIVERAI_API_KEY || getEnvString("QUIVERAI_API_KEY") || "";
		this.apiBaseUrl = config?.apiBaseUrl || QUIVERAI_API_BASE_URL;
		if (id) this.id = () => id;
		this.config = config || {};
	}
	id() {
		return `quiverai:${this.modelName}`;
	}
	toString() {
		return `[QuiverAI Provider ${this.modelName}]`;
	}
	getApiUrl() {
		return `${this.apiBaseUrl}/svgs/generations`;
	}
	getHeaders() {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`
		};
	}
	async callApi(prompt, context) {
		if (!this.apiKey) return { error: "QuiverAI API key is not set. Set the QUIVERAI_API_KEY environment variable or add apiKey to the provider config. Get a key at https://app.quiver.ai/settings/api-keys" };
		const config = {
			...this.config,
			...context?.prompt?.config
		};
		const useStream = config.stream !== false;
		const body = {
			model: this.modelName,
			prompt,
			stream: useStream,
			...pickDefined(config, [
				"instructions",
				"references",
				"n",
				"temperature",
				"top_p",
				"presence_penalty",
				"max_output_tokens"
			])
		};
		try {
			if (useStream) return await this.callApiStreaming(body);
			return await this.callApiNonStreaming(body, context);
		} catch (error) {
			logger.error(`QuiverAI API call error: ${error}`);
			return { error: `QuiverAI API call error: ${error}` };
		}
	}
	async callApiNonStreaming(body, context) {
		const { data, cached, status, statusText } = await fetchWithCache(this.getApiUrl(), {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(body)
		}, REQUEST_TIMEOUT_MS, "json", context?.bustCache ?? context?.debug);
		if (status < 200 || status >= 300) {
			if (data && typeof data === "object" && "code" in data && "message" in data) return { error: formatError(data) };
			return { error: `API error: ${status} ${statusText}\n${typeof data === "string" ? data : JSON.stringify(data)}` };
		}
		const response = data;
		return {
			cached,
			output: extractSvgOutput(response),
			tokenUsage: mapTokenUsage(response.usage, cached ? 0 : 1)
		};
	}
	async callApiStreaming(body) {
		const maxRetries = 3;
		let lastResp;
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
			let reader;
			try {
				lastResp = await fetchWithProxy(this.getApiUrl(), {
					method: "POST",
					headers: this.getHeaders(),
					body: JSON.stringify(body),
					signal: controller.signal
				});
				if (lastResp.status === 429 && attempt < maxRetries) {
					const waitMs = getRetryAfterMs(lastResp.headers, attempt);
					logger.debug(`QuiverAI: rate limited, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`);
					await lastResp.body?.cancel();
					await new Promise((resolve) => setTimeout(resolve, waitMs));
					continue;
				}
				if (!lastResp.ok) return await handleStreamingError(lastResp);
				if (!lastResp.body) return { error: "QuiverAI streaming response has no body" };
				reader = lastResp.body.getReader();
				return await readSSEStream(reader);
			} finally {
				reader?.cancel().catch(() => {});
				clearTimeout(timeout);
			}
		}
		return handleStreamingError(lastResp);
	}
};
async function handleStreamingError(resp) {
	try {
		return { error: formatError(await resp.json()) };
	} catch {
		return { error: `QuiverAI API error: HTTP ${resp.status}` };
	}
}
async function readSSEStream(reader) {
	const decoder = new TextDecoder();
	let buffer = "";
	let finalSvg = "";
	let usage;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";
		for (const line of lines) {
			const parsed = parseSSELine(line);
			if (parsed.svg) finalSvg = parsed.svg;
			if (parsed.usage) usage = parsed.usage;
		}
	}
	if (buffer.trim()) {
		const parsed = parseSSELine(buffer);
		if (parsed.svg) finalSvg = parsed.svg;
		if (parsed.usage) usage = parsed.usage;
	}
	if (!finalSvg) return { error: "QuiverAI streaming response contained no SVG content" };
	return {
		output: finalSvg,
		tokenUsage: mapTokenUsage(usage, 1)
	};
}
function pickDefined(obj, keys) {
	return Object.fromEntries(keys.filter((k) => obj[k] != null).map((k) => [k, obj[k]]));
}
function formatError(err) {
	const base = `${err.message} [${err.code}]`;
	return err.request_id ? `${base} (request_id: ${err.request_id})` : base;
}
function mapTokenUsage(usage, numRequests) {
	return {
		total: usage?.total_tokens || 0,
		prompt: usage?.input_tokens || 0,
		completion: usage?.output_tokens || 0,
		numRequests
	};
}
const MAX_RETRY_AFTER_MS = 6e4;
function getRetryAfterMs(headers, attempt) {
	const retryAfter = headers.get("retry-after");
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (!Number.isNaN(seconds)) return Math.min(seconds * 1e3, MAX_RETRY_AFTER_MS);
		const date = new Date(retryAfter);
		if (!Number.isNaN(date.getTime())) return Math.min(Math.max(0, date.getTime() - Date.now()), MAX_RETRY_AFTER_MS);
	}
	return Math.pow(2, attempt) * 1e3;
}
function parseSSELine(line) {
	if (!line.startsWith("data:")) return {};
	const payload = line.slice(line.startsWith("data: ") ? 6 : 5).trim();
	if (!payload || payload === "[DONE]") return {};
	try {
		const event = JSON.parse(payload);
		return {
			svg: event.type === "content" && event.svg ? event.svg : void 0,
			usage: event.usage
		};
	} catch {
		logger.debug(`QuiverAI: failed to parse SSE data: ${payload}`);
		return {};
	}
}
function extractSvgOutput(response) {
	if (Array.isArray(response.data)) {
		const svgs = response.data.map((item) => item.svg).filter(Boolean);
		return svgs.length === 1 ? svgs[0] : svgs.join("\n\n");
	}
	return JSON.stringify(response);
}
function createQuiverAiProvider(providerPath, providerOptions = {}, env) {
	const splits = providerPath.split(":");
	return new QuiverAiProvider((splits[1] === "chat" ? splits.slice(2) : splits.slice(1)).join(":") || QUIVERAI_DEFAULT_MODEL, {
		config: providerOptions.config,
		id: providerOptions.id,
		env: providerOptions.env ?? env
	});
}
//#endregion
export { createQuiverAiProvider };

//# sourceMappingURL=quiverai-PJWTo2Tq.js.map
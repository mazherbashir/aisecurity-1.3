import { C as getEnvString, S as getEnvInt, a as logger } from "./logger-DWcVXa9k.js";
import { n as telemetry } from "./telemetry-3vdJw-FZ.js";
//#region src/providers/bedrock/util.ts
const REQUEST_TIMEOUT_MS = 3e5;
function hasProxyEnv() {
	return Boolean(getEnvString("HTTP_PROXY") || getEnvString("HTTPS_PROXY"));
}
/**
* Creates a NodeHttpHandler (HTTP/1.1) for Bedrock SDK clients.
*
* The @aws-sdk/client-bedrock-runtime package defaults to HTTP/2, which causes
* "http2 request did not get a response" errors in many environments (see #7756).
* This function forces HTTP/1.1 via NodeHttpHandler.
*
* For @aws-sdk/client-bedrock-agent-runtime (which already defaults to HTTP/1.1),
* this is only needed when proxy or API key authentication is required.
*/
async function createBedrockRequestHandler(options) {
	const hasProxy = hasProxyEnv();
	try {
		const { NodeHttpHandler } = await import("@smithy/node-http-handler");
		let proxyAgent;
		if (hasProxy) {
			const { ProxyAgent } = await import("proxy-agent");
			proxyAgent = new ProxyAgent();
		}
		const handler = new NodeHttpHandler({
			...proxyAgent ? { httpsAgent: proxyAgent } : {},
			requestTimeout: REQUEST_TIMEOUT_MS
		});
		if (options?.apiKey) {
			const originalHandle = handler.handle.bind(handler);
			handler.handle = async (request, handlerOptions) => {
				request.headers = {
					...request.headers,
					Authorization: `Bearer ${options.apiKey}`
				};
				return originalHandle(request, handlerOptions);
			};
		}
		return handler;
	} catch {
		const reason = options?.apiKey ? "API key authentication requires the @smithy/node-http-handler package" : hasProxy ? "Proxy configuration requires the @smithy/node-http-handler package" : "Bedrock provider requires the @smithy/node-http-handler package";
		throw new Error(`${reason}. Please install it in your project or globally.`);
	}
}
function novaOutputFromMessage(response) {
	if (response.output?.message?.content.some((block) => block.toolUse?.toolUseId)) return response.output?.message?.content.map((block) => {
		if (block.text) return null;
		return JSON.stringify(block.toolUse);
	}).filter((block) => block).join("\n\n");
	return response.output?.message?.content.map((block) => {
		return block.text;
	}).join("\n\n");
}
function novaParseMessages(messages) {
	try {
		const parsed = JSON.parse(messages);
		if (Array.isArray(parsed)) {
			const systemMessage = parsed.find((msg) => msg.role === "system");
			return {
				extractedMessages: parsed.filter((msg) => msg.role !== "system").map((msg) => ({
					role: msg.role,
					content: Array.isArray(msg.content) ? msg.content : [{ text: msg.content }]
				})),
				system: systemMessage ? Array.isArray(systemMessage.content) ? systemMessage.content : [{ text: systemMessage.content }] : void 0
			};
		}
	} catch {}
	const lines = messages.split("\n").map((line) => line.trim()).filter((line) => line);
	let system;
	const extractedMessages = [];
	let currentRole = null;
	let currentContent = [];
	const pushMessage = () => {
		if (currentRole && currentContent.length > 0) {
			extractedMessages.push({
				role: currentRole,
				content: [{ text: currentContent.join("\n") }]
			});
			currentContent = [];
		}
	};
	for (const line of lines) if (line.startsWith("system:")) system = [{ text: line.slice(7).trim() }];
	else if (line.startsWith("user:") || line.startsWith("assistant:")) {
		pushMessage();
		currentRole = line.startsWith("user:") ? "user" : "assistant";
		currentContent.push(line.slice(line.indexOf(":") + 1).trim());
	} else if (currentRole) currentContent.push(line);
	else {
		currentRole = "user";
		currentContent.push(line);
	}
	pushMessage();
	if (extractedMessages.length === 0 && !system) extractedMessages.push({
		role: "user",
		content: [{ text: messages.trim() }]
	});
	return {
		system,
		extractedMessages
	};
}
//#endregion
//#region src/providers/bedrock/base.ts
/**
* AWS Bedrock Base Provider
*
* Contains the abstract base class for all Bedrock providers.
* This is extracted to avoid circular dependency issues.
*/
var AwsBedrockGenericProvider = class {
	modelName;
	env;
	bedrock;
	config;
	constructor(modelName, options = {}) {
		const { config, id, env } = options;
		this.env = env;
		this.modelName = modelName;
		this.config = config || {};
		this.id = id ? () => id : this.id;
		if (this.config.guardrailIdentifier) telemetry.record("feature_used", {
			feature: "guardrail",
			provider: "bedrock"
		});
	}
	id() {
		return `bedrock:${this.modelName}`;
	}
	toString() {
		return `[Amazon Bedrock Provider ${this.modelName}]`;
	}
	requiresApiKey() {
		return false;
	}
	getApiKey() {
		return this.config.apiKey || getEnvString("AWS_BEARER_TOKEN_BEDROCK");
	}
	async getCredentials() {
		if (this.config.accessKeyId && this.config.secretAccessKey) {
			logger.debug(`Using credentials from config file`);
			return {
				accessKeyId: this.config.accessKeyId,
				secretAccessKey: this.config.secretAccessKey,
				sessionToken: this.config.sessionToken
			};
		}
		if (this.getApiKey()) {
			logger.debug(`Using Bedrock API key authentication`);
			return;
		}
		if (this.config.profile) {
			logger.debug(`Using SSO profile: ${this.config.profile}`);
			try {
				const { fromSSO } = await import("@aws-sdk/credential-provider-sso");
				return fromSSO({ profile: this.config.profile });
			} catch (err) {
				logger.error(`Error loading @aws-sdk/credential-provider-sso: ${err}`);
				throw new Error("The @aws-sdk/credential-provider-sso package is required for SSO profiles. Please install it: npm install @aws-sdk/credential-provider-sso");
			}
		}
		logger.debug(`No explicit credentials in config, falling back to AWS default chain`);
	}
	async getBedrockInstance() {
		if (!this.bedrock) {
			const handler = await createBedrockRequestHandler({ apiKey: this.getApiKey() });
			try {
				const { BedrockRuntime } = await import("@aws-sdk/client-bedrock-runtime");
				const credentials = await this.getCredentials();
				this.bedrock = new BedrockRuntime({
					region: this.getRegion(),
					maxAttempts: getEnvInt("AWS_BEDROCK_MAX_RETRIES", 10),
					retryMode: "adaptive",
					requestHandler: handler,
					...credentials ? { credentials } : {},
					...this.config.endpoint ? { endpoint: this.config.endpoint } : {}
				});
			} catch (err) {
				logger.error(`Error creating BedrockRuntime: ${err}`);
				throw new Error("The @aws-sdk/client-bedrock-runtime package is required as a peer dependency. Please install it in your project or globally.");
			}
		}
		return this.bedrock;
	}
	getRegion() {
		return this.config?.region || this.env?.AWS_BEDROCK_REGION || getEnvString("AWS_BEDROCK_REGION") || "us-east-1";
	}
};
//#endregion
export { novaParseMessages as a, novaOutputFromMessage as i, createBedrockRequestHandler as n, hasProxyEnv as r, AwsBedrockGenericProvider as t };

//# sourceMappingURL=base-3-_StCco.js.map
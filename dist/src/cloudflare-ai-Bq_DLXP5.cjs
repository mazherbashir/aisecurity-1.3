const require_logger = require("./logger-wcsrvnoS.cjs");
const require_invariant = require("./invariant-kfQ8Bu82.cjs");
const require_chat = require("./chat-Cux1uti4.cjs");
const require_completion = require("./completion-B3XASdmm.cjs");
//#region src/providers/cloudflare-ai.ts
function getCloudflareApiConfig(config, env) {
	const apiTokenCandidate = config?.apiKey || (config?.apiKeyEnvar ? require_logger.getEnvString(config.apiKeyEnvar) || env?.[config.apiKeyEnvar] : void 0) || env?.CLOUDFLARE_API_KEY || require_logger.getEnvString("CLOUDFLARE_API_KEY");
	require_invariant.invariant(apiTokenCandidate, "Cloudflare API token required. Supply it via config apiKey or apiKeyEnvar, or the CLOUDFLARE_API_KEY environment variable");
	const accountIdCandidate = config?.accountId || (config?.accountIdEnvar ? require_logger.getEnvString(config.accountIdEnvar) || env?.[config.accountIdEnvar] : void 0) || env?.CLOUDFLARE_ACCOUNT_ID || require_logger.getEnvString("CLOUDFLARE_ACCOUNT_ID");
	require_invariant.invariant(accountIdCandidate, "Cloudflare account ID required. Supply it via config accountId or accountIdEnvar, or the CLOUDFLARE_ACCOUNT_ID environment variable");
	return {
		apiToken: apiTokenCandidate,
		accountId: accountIdCandidate
	};
}
function getApiBaseUrl(config, env) {
	if (config?.apiBaseUrl) return config.apiBaseUrl;
	const { accountId } = getCloudflareApiConfig(config, env);
	return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}
function getPassthroughConfig(config) {
	const { accountId: _accountId, accountIdEnvar: _accountIdEnvar, apiKey: _apiKey, apiKeyEnvar: _apiKeyEnvar, apiBaseUrl: _apiBaseUrl, ...passthrough } = config || {};
	return passthrough;
}
var CloudflareAiChatCompletionProvider = class extends require_chat.OpenAiChatCompletionProvider {
	cloudflareConfig;
	modelType = "chat";
	constructor(modelName, providerOptions) {
		const apiBaseUrl = getApiBaseUrl(providerOptions.config, providerOptions.env);
		const passthrough = getPassthroughConfig(providerOptions.config);
		const config = {
			...providerOptions.config,
			apiKeyEnvar: "CLOUDFLARE_API_KEY",
			apiBaseUrl,
			passthrough
		};
		super(modelName, {
			...providerOptions,
			config
		});
		this.cloudflareConfig = providerOptions.config || {};
	}
	id() {
		return `cloudflare-ai:${this.modelType}:${this.modelName}`;
	}
	toString() {
		return `[Cloudflare AI ${this.modelType} Provider ${this.modelName}]`;
	}
	getApiKey() {
		const { apiToken } = getCloudflareApiConfig(this.cloudflareConfig, this.env);
		return apiToken;
	}
	toJSON() {
		return {
			provider: "cloudflare-ai",
			model: this.modelName,
			modelType: this.modelType,
			config: {
				...this.config,
				...this.getApiKey() && { apiKey: void 0 }
			}
		};
	}
};
var CloudflareAiCompletionProvider = class extends require_completion.OpenAiCompletionProvider {
	cloudflareConfig;
	modelType = "completion";
	constructor(modelName, providerOptions) {
		const apiBaseUrl = getApiBaseUrl(providerOptions.config, providerOptions.env);
		const passthrough = getPassthroughConfig(providerOptions.config);
		const config = {
			...providerOptions.config,
			apiKeyEnvar: "CLOUDFLARE_API_KEY",
			apiBaseUrl,
			passthrough
		};
		super(modelName, {
			...providerOptions,
			config
		});
		this.cloudflareConfig = providerOptions.config || {};
	}
	id() {
		return `cloudflare-ai:${this.modelType}:${this.modelName}`;
	}
	toString() {
		return `[Cloudflare AI ${this.modelType} Provider ${this.modelName}]`;
	}
	getApiKey() {
		const { apiToken } = getCloudflareApiConfig(this.cloudflareConfig, this.env);
		return apiToken;
	}
	toJSON() {
		return {
			provider: "cloudflare-ai",
			model: this.modelName,
			modelType: this.modelType,
			config: {
				...this.config,
				...this.getApiKey() && { apiKey: void 0 }
			}
		};
	}
};
var CloudflareAiEmbeddingProvider = class extends require_completion.OpenAiEmbeddingProvider {
	cloudflareConfig;
	modelType = "embedding";
	constructor(modelName, providerOptions) {
		const apiBaseUrl = getApiBaseUrl(providerOptions.config, providerOptions.env);
		const passthrough = getPassthroughConfig(providerOptions.config);
		const config = {
			...providerOptions.config,
			apiKeyEnvar: "CLOUDFLARE_API_KEY",
			apiBaseUrl,
			passthrough
		};
		super(modelName, {
			...providerOptions,
			config
		});
		this.cloudflareConfig = providerOptions.config || {};
	}
	id() {
		return `cloudflare-ai:${this.modelType}:${this.modelName}`;
	}
	toString() {
		return `[Cloudflare AI ${this.modelType} Provider ${this.modelName}]`;
	}
	getApiKey() {
		const { apiToken } = getCloudflareApiConfig(this.cloudflareConfig, this.env);
		return apiToken;
	}
	toJSON() {
		return {
			provider: "cloudflare-ai",
			model: this.modelName,
			modelType: this.modelType,
			config: {
				...this.config,
				...this.getApiKey() && { apiKey: void 0 }
			}
		};
	}
};
function createCloudflareAiProvider(providerPath, options = {}) {
	const splits = providerPath.split(":");
	const modelType = splits[1];
	const modelName = splits.slice(2).join(":");
	require_invariant.invariant(modelName, "Model name is required");
	switch (modelType) {
		case "chat": return new CloudflareAiChatCompletionProvider(modelName, options);
		case "completion": return new CloudflareAiCompletionProvider(modelName, options);
		case "embedding":
		case "embeddings": return new CloudflareAiEmbeddingProvider(modelName, options);
		default: throw new Error(`Unknown Cloudflare AI model type: ${modelType}`);
	}
}
//#endregion
exports.createCloudflareAiProvider = createCloudflareAiProvider;

//# sourceMappingURL=cloudflare-ai-Bq_DLXP5.cjs.map
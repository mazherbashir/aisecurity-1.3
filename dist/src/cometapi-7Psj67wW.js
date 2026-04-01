#!/usr/bin/env node
import { E as getEnvString } from "./logger-D6YuF-jw.js";
import "./fetch-BYaLM5gl.js";
import "./cache-CFDO0XPw.js";
import { t as OpenAiChatCompletionProvider } from "./chat-BOOqS-9R.js";
import { n as OpenAiEmbeddingProvider, t as OpenAiCompletionProvider } from "./completion-DdnaeSJl.js";
import { t as OpenAiImageProvider } from "./image-CZzC8Ol9.js";
//#region src/providers/cometapi.ts
/**
* CometAPI Image Provider - extends OpenAI Image Provider for CometAPI's image generation models
*/
var CometApiImageProvider = class extends OpenAiImageProvider {
	constructor(modelName, options = {}) {
		super(modelName, {
			...options,
			config: {
				...options.config,
				apiKeyEnvar: "COMETAPI_KEY",
				apiBaseUrl: "https://api.cometapi.com/v1"
			}
		});
	}
	getApiKey() {
		if (this.config?.apiKey) return this.config.apiKey;
		return getEnvString("COMETAPI_KEY");
	}
	getApiUrlDefault() {
		return "https://api.cometapi.com/v1";
	}
};
/**
* Factory for creating CometAPI providers using OpenAI-compatible endpoints.
*/
function createCometApiProvider(providerPath, options = {}) {
	const splits = providerPath.split(":");
	const type = splits[1];
	const modelName = splits.slice(2).join(":");
	const openaiOptions = {
		...options,
		config: {
			...options.config || {},
			apiBaseUrl: "https://api.cometapi.com/v1",
			apiKeyEnvar: "COMETAPI_KEY"
		}
	};
	if (type === "chat") return new OpenAiChatCompletionProvider(modelName, openaiOptions);
	else if (type === "completion") return new OpenAiCompletionProvider(modelName, openaiOptions);
	else if (type === "embedding" || type === "embeddings") return new OpenAiEmbeddingProvider(modelName, openaiOptions);
	else if (type === "image") return new CometApiImageProvider(modelName, openaiOptions);
	return new OpenAiChatCompletionProvider(splits.slice(1).join(":"), openaiOptions);
}
//#endregion
export { createCometApiProvider };

//# sourceMappingURL=cometapi-7Psj67wW.js.map
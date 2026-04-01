import { C as getEnvString } from "./logger-DhVTSriR.js";
import "./fetch-B8RXKmmr.js";
import "./cache-CTFAMBrM.js";
import { t as OpenAiChatCompletionProvider } from "./chat-BL6Zb5Qq.js";
import { n as OpenAiEmbeddingProvider, t as OpenAiCompletionProvider } from "./completion-BcyIYyQJ.js";
import { t as OpenAiImageProvider } from "./image-BWlj4xC6.js";
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

//# sourceMappingURL=cometapi-CgTzkVMA.js.map
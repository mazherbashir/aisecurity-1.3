const require_logger = require("./logger-wcsrvnoS.cjs");
require("./fetch-Gr9TColK.cjs");
require("./cache-B0ZDftz7.cjs");
const require_chat = require("./chat-Cux1uti4.cjs");
const require_completion = require("./completion-B3XASdmm.cjs");
const require_image = require("./image-DD88dTFY.cjs");
//#region src/providers/cometapi.ts
/**
* CometAPI Image Provider - extends OpenAI Image Provider for CometAPI's image generation models
*/
var CometApiImageProvider = class extends require_image.OpenAiImageProvider {
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
		return require_logger.getEnvString("COMETAPI_KEY");
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
	if (type === "chat") return new require_chat.OpenAiChatCompletionProvider(modelName, openaiOptions);
	else if (type === "completion") return new require_completion.OpenAiCompletionProvider(modelName, openaiOptions);
	else if (type === "embedding" || type === "embeddings") return new require_completion.OpenAiEmbeddingProvider(modelName, openaiOptions);
	else if (type === "image") return new CometApiImageProvider(modelName, openaiOptions);
	return new require_chat.OpenAiChatCompletionProvider(splits.slice(1).join(":"), openaiOptions);
}
//#endregion
exports.createCometApiProvider = createCometApiProvider;

//# sourceMappingURL=cometapi-CXJNIqu4.cjs.map
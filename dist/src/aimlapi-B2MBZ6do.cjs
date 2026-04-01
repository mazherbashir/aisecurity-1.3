require("./logger-wcsrvnoS.cjs");
require("./fetch-Gr9TColK.cjs");
require("./cache-B0ZDftz7.cjs");
const require_chat = require("./chat-Cux1uti4.cjs");
const require_completion = require("./completion-B3XASdmm.cjs");
//#region src/providers/aimlapi.ts
/**
* Factory for creating AI/ML API providers using OpenAI-compatible endpoints.
*/
function createAimlApiProvider(providerPath, options = {}) {
	const splits = providerPath.split(":");
	const type = splits[1];
	const modelName = splits.slice(2).join(":");
	const openaiOptions = {
		...options,
		config: {
			...options.config || {},
			apiBaseUrl: "https://api.aimlapi.com/v1",
			apiKeyEnvar: "AIML_API_KEY"
		}
	};
	if (type === "chat") return new require_chat.OpenAiChatCompletionProvider(modelName, openaiOptions);
	else if (type === "completion") return new require_completion.OpenAiCompletionProvider(modelName, openaiOptions);
	else if (type === "embedding" || type === "embeddings") return new require_completion.OpenAiEmbeddingProvider(modelName, openaiOptions);
	return new require_chat.OpenAiChatCompletionProvider(splits.slice(1).join(":"), openaiOptions);
}
//#endregion
exports.createAimlApiProvider = createAimlApiProvider;

//# sourceMappingURL=aimlapi-B2MBZ6do.cjs.map
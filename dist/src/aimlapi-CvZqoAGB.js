import "./logger-DhVTSriR.js";
import "./fetch-B8RXKmmr.js";
import "./cache-CTFAMBrM.js";
import { t as OpenAiChatCompletionProvider } from "./chat-BL6Zb5Qq.js";
import { n as OpenAiEmbeddingProvider, t as OpenAiCompletionProvider } from "./completion-BcyIYyQJ.js";
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
	if (type === "chat") return new OpenAiChatCompletionProvider(modelName, openaiOptions);
	else if (type === "completion") return new OpenAiCompletionProvider(modelName, openaiOptions);
	else if (type === "embedding" || type === "embeddings") return new OpenAiEmbeddingProvider(modelName, openaiOptions);
	return new OpenAiChatCompletionProvider(splits.slice(1).join(":"), openaiOptions);
}
//#endregion
export { createAimlApiProvider };

//# sourceMappingURL=aimlapi-CvZqoAGB.js.map
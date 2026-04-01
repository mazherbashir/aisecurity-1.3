import "./logger-DWcVXa9k.js";
import "./fetch-JwctAM20.js";
import "./cache-CadYkugS.js";
import { t as OpenAiChatCompletionProvider } from "./chat-De3aQW9v.js";
import { n as OpenAiEmbeddingProvider, t as OpenAiCompletionProvider } from "./completion-pqkGGQzR.js";
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

//# sourceMappingURL=aimlapi-BJHZVw4W.js.map
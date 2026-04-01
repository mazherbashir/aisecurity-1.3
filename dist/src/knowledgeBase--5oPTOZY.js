#!/usr/bin/env node
import { T as getEnvInt, s as logger } from "./logger-D6YuF-jw.js";
import { r as telemetry } from "./telemetry-BM-n0cIV.js";
import { o as getCache, s as isCacheEnabled } from "./cache-CFDO0XPw.js";
import { a as createEmptyTokenUsage } from "./tokenUsageUtils-DflFMjS0.js";
import { n as createBedrockRequestHandler, r as hasProxyEnv, t as AwsBedrockGenericProvider } from "./base-DHfT_1y3.js";
//#region src/providers/bedrock/knowledgeBase.ts
/**
* AWS Bedrock Knowledge Base provider for RAG (Retrieval Augmented Generation).
* Allows querying an existing AWS Bedrock Knowledge Base with text queries.
*/
var AwsBedrockKnowledgeBaseProvider = class extends AwsBedrockGenericProvider {
	knowledgeBaseClient;
	kbConfig;
	constructor(modelName, options = {}) {
		super(modelName, options);
		if (!options.config?.knowledgeBaseId) throw new Error("Knowledge Base ID is required. Please provide a knowledgeBaseId in the provider config.");
		this.kbConfig = options.config || { knowledgeBaseId: "" };
		telemetry.record("feature_used", {
			feature: "knowledge_base",
			provider: "bedrock"
		});
	}
	id() {
		return `bedrock:kb:${this.kbConfig.knowledgeBaseId}`;
	}
	toString() {
		return `[Amazon Bedrock Knowledge Base Provider ${this.kbConfig.knowledgeBaseId}]`;
	}
	async getKnowledgeBaseClient() {
		if (!this.knowledgeBaseClient) {
			const apiKey = this.getApiKey();
			const handler = hasProxyEnv() || apiKey ? await createBedrockRequestHandler({ apiKey }) : void 0;
			try {
				const { BedrockAgentRuntimeClient } = await import("@aws-sdk/client-bedrock-agent-runtime");
				const credentials = await this.getCredentials();
				this.knowledgeBaseClient = new BedrockAgentRuntimeClient({
					region: this.getRegion(),
					maxAttempts: getEnvInt("AWS_BEDROCK_MAX_RETRIES", 10),
					retryMode: "adaptive",
					...handler ? { requestHandler: handler } : {},
					...credentials ? { credentials } : {}
				});
			} catch (err) {
				throw new Error(`The @aws-sdk/client-bedrock-agent-runtime package is required as a peer dependency. Please install it in your project or globally. Error: ${err}`);
			}
		}
		return this.knowledgeBaseClient;
	}
	async callApi(prompt) {
		const client = await this.getKnowledgeBaseClient();
		let modelArn = this.kbConfig.modelArn;
		if (!modelArn) if (this.modelName.includes("arn:aws:bedrock")) modelArn = this.modelName;
		else if (this.modelName.startsWith("us.") || this.modelName.startsWith("eu.") || this.modelName.startsWith("apac.")) modelArn = this.modelName;
		else modelArn = `arn:aws:bedrock:${this.getRegion()}::foundation-model/${this.modelName}`;
		const knowledgeBaseConfiguration = { knowledgeBaseId: this.kbConfig.knowledgeBaseId };
		if (this.kbConfig.modelArn || this.modelName !== "default") knowledgeBaseConfiguration.modelArn = modelArn;
		if (this.kbConfig.numberOfResults !== void 0) knowledgeBaseConfiguration.retrievalConfiguration = { vectorSearchConfiguration: { numberOfResults: this.kbConfig.numberOfResults } };
		const params = {
			input: { text: prompt },
			retrieveAndGenerateConfiguration: {
				type: "KNOWLEDGE_BASE",
				knowledgeBaseConfiguration
			}
		};
		logger.debug("Calling Amazon Bedrock Knowledge Base API", { params });
		const cache = await getCache();
		const sensitiveKeys = [
			"accessKeyId",
			"secretAccessKey",
			"sessionToken"
		];
		const cacheConfig = {
			region: this.getRegion(),
			modelName: this.modelName,
			...Object.fromEntries(Object.entries(this.kbConfig).filter(([key]) => !sensitiveKeys.includes(key)))
		};
		const configStr = JSON.stringify(cacheConfig, Object.keys(cacheConfig).sort());
		const cacheKey = `bedrock-kb:${Buffer.from(configStr).toString("base64")}:${prompt}`;
		if (isCacheEnabled()) {
			const cachedResponse = await cache.get(cacheKey);
			if (cachedResponse) {
				logger.debug(`Returning cached response for ${prompt}`);
				const parsedResponse = JSON.parse(cachedResponse);
				return {
					output: parsedResponse.output,
					metadata: { citations: parsedResponse.citations },
					tokenUsage: createEmptyTokenUsage(),
					cached: true
				};
			}
		}
		try {
			const { RetrieveAndGenerateCommand } = await import("@aws-sdk/client-bedrock-agent-runtime");
			const command = new RetrieveAndGenerateCommand(params);
			const response = await client.send(command);
			logger.debug("Amazon Bedrock Knowledge Base API response", { response });
			let output = "";
			if (response && response.output && response.output.text) output = response.output.text;
			let citations = [];
			if (response && response.citations && Array.isArray(response.citations)) citations = response.citations;
			if (isCacheEnabled()) try {
				await cache.set(cacheKey, JSON.stringify({
					output,
					citations
				}));
			} catch (err) {
				logger.error(`Failed to cache knowledge base response: ${String(err)}`);
			}
			return {
				output,
				metadata: { citations },
				tokenUsage: createEmptyTokenUsage()
			};
		} catch (err) {
			return { error: `Bedrock Knowledge Base API error: ${String(err)}` };
		}
	}
};
//#endregion
export { AwsBedrockKnowledgeBaseProvider };

//# sourceMappingURL=knowledgeBase--5oPTOZY.js.map
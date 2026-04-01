const require_logger = require("./logger-wcsrvnoS.cjs");
const require_esm = require("./esm-CpPA2ZnQ.cjs");
const require_fileExtensions = require("./fileExtensions-bYh77CN8.cjs");
const require_util = require("./util-BApUrKYL.cjs");
const require_fetch = require("./fetch-Gr9TColK.cjs");
const require_cache = require("./cache-B0ZDftz7.cjs");
const require_openai = require("./openai-C0PBYMcJ.cjs");
const require_util$1 = require("./util-COtFELvD.cjs");
let path = require("path");
path = require_logger.__toESM(path);
//#region src/providers/functionCallbackUtils.ts
/**
* Handles function callback execution for AI providers.
* Provides a unified way to execute function callbacks across different provider formats.
*/
var FunctionCallbackHandler = class {
	loadedCallbacks = {};
	mcpToolNames = null;
	constructor(mcpClient) {
		this.mcpClient = mcpClient;
	}
	/**
	* Processes a function call by executing its callback or returning the original call
	* @param call The function call to process (can be various formats)
	* @param callbacks Configuration mapping function names to callbacks
	* @param context Optional context to pass to the callback
	* @returns The result of processing
	*/
	async processCall(call, callbacks, context) {
		const functionInfo = this.extractFunctionInfo(call);
		if (this.mcpClient && functionInfo) {
			if (this.mcpToolNames === null) {
				const mcpTools = this.mcpClient.getAllTools();
				this.mcpToolNames = new Set(mcpTools.map((tool) => tool.name));
			}
			if (this.mcpToolNames.has(functionInfo.name)) return await this.executeMcpTool(functionInfo.name, functionInfo.arguments);
		}
		if (!functionInfo || !callbacks || !callbacks[functionInfo.name]) return {
			output: typeof call === "string" ? call : JSON.stringify(call),
			isError: false
		};
		try {
			return {
				output: await this.executeCallback(functionInfo.name, functionInfo.arguments || "{}", callbacks, context),
				isError: false
			};
		} catch (error) {
			require_logger.logger.debug(`Function callback failed for ${functionInfo.name}: ${error}`);
			return {
				output: typeof call === "string" ? call : JSON.stringify(call),
				isError: true
			};
		}
	}
	/**
	* Processes multiple function calls
	* @param calls Array of calls or a single call
	* @param callbacks Configuration mapping function names to callbacks
	* @param context Optional context to pass to callbacks
	* @param options Processing options
	* @returns Processed output in appropriate format
	*/
	async processCalls(calls, callbacks, context, _options) {
		if (!calls) return calls;
		const isArray = Array.isArray(calls);
		const callsArray = isArray ? calls : [calls];
		const results = await Promise.all(callsArray.map((call) => this.processCall(call, callbacks, context)));
		if (results.some((r, index) => !r.isError && r.output !== JSON.stringify(callsArray[index]))) {
			const outputs = results.map((r) => r.output);
			if (!isArray && outputs.length === 1) return outputs[0];
			return outputs.every((o) => typeof o === "string") ? outputs.join("\n") : outputs;
		}
		if (!isArray && results.length === 1) return results[0].output;
		return calls;
	}
	/**
	* Extracts function name and arguments from various call formats
	*/
	extractFunctionInfo(call) {
		if (!call || typeof call !== "object") return null;
		if (call.name && typeof call.name === "string") return {
			name: call.name,
			arguments: call.arguments
		};
		if (call.type === "function" && call.function?.name) return {
			name: call.function.name,
			arguments: call.function.arguments
		};
		return null;
	}
	/**
	* Executes a function callback
	*/
	async executeCallback(functionName, args, callbacks, context) {
		let callback = this.loadedCallbacks[functionName];
		if (!callback) {
			const callbackConfig = callbacks[functionName];
			if (typeof callbackConfig === "string") if (callbackConfig.startsWith("file://")) callback = await this.loadExternalFunction(callbackConfig);
			else callback = new Function("return " + callbackConfig)();
			else if (typeof callbackConfig === "function") callback = callbackConfig;
			else throw new Error(`Invalid callback configuration for ${functionName}`);
			this.loadedCallbacks[functionName] = callback;
		}
		const result = await callback(args, context);
		return typeof result === "string" ? result : JSON.stringify(result);
	}
	/**
	* Loads a function from an external file
	*/
	async loadExternalFunction(fileRef) {
		let filePath = fileRef.slice(7);
		let functionName;
		if (filePath.includes(":")) {
			const splits = filePath.split(":");
			if (splits[0] && require_fileExtensions.isJavascriptFile(splits[0])) [filePath, functionName] = splits;
		}
		try {
			const resolvedPath = path.default.resolve(require_logger.state.basePath || "", filePath);
			require_logger.logger.debug(`Loading function from ${resolvedPath}${functionName ? `:${functionName}` : ""}`);
			const mod = await require_esm.importModule(resolvedPath);
			const func = functionName && mod[functionName] ? mod[functionName] : mod.default || mod;
			if (typeof func !== "function") throw new Error(`Expected ${resolvedPath}${functionName ? `:${functionName}` : ""} to export a function, got ${typeof func}`);
			return func;
		} catch (error) {
			throw new Error(`Failed to load function from ${fileRef}: ${error}`);
		}
	}
	/**
	* Executes an MCP tool
	*/
	async executeMcpTool(toolName, args) {
		try {
			if (!this.mcpClient) throw new Error("MCP client not available");
			const parsedArgs = args == null || args === "" ? {} : typeof args === "string" ? JSON.parse(args) : args;
			const result = await this.mcpClient.callTool(toolName, parsedArgs);
			if (result?.error) return {
				output: `MCP Tool Error (${toolName}): ${result.error}`,
				isError: true
			};
			const normalizeContent = (content) => {
				if (content == null) return "";
				if (typeof content === "string") return content;
				if (Array.isArray(content)) return content.map((part) => {
					if (typeof part === "string") return part;
					if (part && typeof part === "object") {
						if ("text" in part && part.text != null) return String(part.text);
						if ("json" in part) return JSON.stringify(part.json);
						if ("data" in part) return JSON.stringify(part.data);
						return JSON.stringify(part);
					}
					return String(part);
				}).join("\n");
				return JSON.stringify(content);
			};
			return {
				output: `MCP Tool Result (${toolName}): ${normalizeContent(result?.content)}`,
				isError: false
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			require_logger.logger.debug(`MCP tool execution failed for ${toolName}: ${errorMessage}`);
			return {
				output: `MCP Tool Error (${toolName}): ${errorMessage}`,
				isError: true
			};
		}
	}
	/**
	* Sets the MCP client, preserving any loaded callbacks
	*/
	setMcpClient(client) {
		this.mcpClient = client;
		this.mcpToolNames = null;
	}
	/**
	* Clears the cached callbacks
	*/
	clearCache() {
		this.loadedCallbacks = {};
	}
};
//#endregion
//#region src/providers/responses/processor.ts
/**
* Extract user-facing metadata from response data.
* Only includes fields that are useful for users viewing eval results.
*/
function extractMetadata(data, processedOutput) {
	const metadata = {};
	if (typeof data.id === "string" && data.id) metadata.responseId = data.id;
	if (typeof data.model === "string" && data.model) metadata.model = data.model;
	if (Array.isArray(processedOutput.annotations) && processedOutput.annotations.length > 0) metadata.annotations = processedOutput.annotations;
	return metadata;
}
/**
* Extract token usage from response data, handling both OpenAI Chat Completions format
* (prompt_tokens, completion_tokens) and Azure Responses format (input_tokens, output_tokens)
*/
function getTokenUsage(data, cached) {
	if (data.usage) if (cached) {
		const totalTokens = data.usage.total_tokens || (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
		return {
			cached: totalTokens,
			total: totalTokens,
			numRequests: 1
		};
	} else {
		const promptTokens = data.usage.prompt_tokens || data.usage.input_tokens || 0;
		const completionTokens = data.usage.completion_tokens || data.usage.output_tokens || 0;
		return {
			total: data.usage.total_tokens || promptTokens + completionTokens,
			prompt: promptTokens,
			completion: completionTokens,
			numRequests: 1,
			...data.usage.completion_tokens_details ? { completionDetails: {
				reasoning: data.usage.completion_tokens_details.reasoning_tokens,
				acceptedPrediction: data.usage.completion_tokens_details.accepted_prediction_tokens,
				rejectedPrediction: data.usage.completion_tokens_details.rejected_prediction_tokens
			} } : {}
		};
	}
	return {};
}
/**
* Shared response processor for OpenAI and Azure Responses APIs.
* Handles all response types with identical logic to ensure feature parity.
*/
var ResponsesProcessor = class {
	constructor(config) {
		this.config = config;
	}
	async processResponseOutput(data, requestConfig, cached) {
		require_logger.logger.debug(`Processing ${this.config.providerType} responses output`, {
			responseId: data.id,
			model: data.model
		});
		if (data.error) return { error: require_util$1.formatOpenAiError(data) };
		try {
			const context = {
				config: requestConfig,
				cached,
				data
			};
			const processedOutput = await this.processOutput(data.output, context);
			if (processedOutput.isRefusal) return {
				output: processedOutput.refusal,
				tokenUsage: getTokenUsage(data, cached),
				isRefusal: true,
				cached,
				cost: this.config.costCalculator(this.config.modelName, data.usage, requestConfig),
				raw: data,
				metadata: extractMetadata(data, processedOutput)
			};
			let finalOutput = processedOutput.result;
			if (requestConfig.response_format?.type === "json_schema" && typeof finalOutput === "string") try {
				finalOutput = JSON.parse(finalOutput);
			} catch (error) {
				require_logger.logger.error(`Failed to parse JSON output: ${error}`);
			}
			const result = {
				output: finalOutput,
				tokenUsage: getTokenUsage(data, cached),
				cached,
				cost: this.config.costCalculator(this.config.modelName, data.usage, requestConfig),
				raw: data,
				metadata: extractMetadata(data, processedOutput)
			};
			if (processedOutput.annotations && processedOutput.annotations.length > 0) result.raw = {
				...data,
				annotations: processedOutput.annotations
			};
			return result;
		} catch (err) {
			return { error: `Error parsing response: ${String(err)}\nResponse: ${JSON.stringify(data)}` };
		}
	}
	async processOutput(output, context) {
		if (this.config.modelName.includes("deep-research")) require_logger.logger.debug(`Deep research response structure: ${JSON.stringify(context.data, null, 2)}`);
		if (!output || !Array.isArray(output) || output.length === 0) throw new Error("Invalid response format: Missing output array");
		let result = "";
		let refusal = "";
		let isRefusal = false;
		const annotations = [];
		for (const item of output) {
			if (!item || typeof item !== "object") {
				require_logger.logger.warn(`Skipping invalid output item: ${JSON.stringify(item)}`);
				continue;
			}
			const processed = await this.processOutputItem(item, context);
			if (processed.isRefusal) {
				refusal = processed.content || "";
				isRefusal = true;
			} else if (processed.content) if (result) result += "\n" + processed.content;
			else result = processed.content;
			if (processed.annotations) annotations.push(...processed.annotations);
		}
		return {
			result,
			refusal,
			isRefusal,
			annotations: annotations.length > 0 ? annotations : void 0
		};
	}
	async processOutputItem(item, context) {
		switch (item.type) {
			case "function_call": return await this.processFunctionCall(item, context);
			case "message": return await this.processMessage(item, context);
			case "tool_result": return this.processToolResult(item);
			case "reasoning": return this.processReasoning(item);
			case "web_search_call": return this.processWebSearch(item);
			case "code_interpreter_call": return this.processCodeInterpreter(item);
			case "mcp_list_tools": return this.processMcpListTools(item);
			case "mcp_call": return this.processMcpCall(item);
			case "mcp_approval_request": return this.processMcpApprovalRequest(item);
			default:
				require_logger.logger.debug(`Unknown output item type: ${item.type}`);
				return {};
		}
	}
	async processFunctionCall(item, context) {
		let functionResult;
		if (item.arguments === "{}" && item.status === "completed") functionResult = JSON.stringify({
			type: "function_call",
			name: item.name,
			status: "no_arguments_provided",
			note: "Function called but no arguments were extracted. Consider using the correct Responses API tool format."
		});
		else functionResult = await this.config.functionCallbackHandler.processCalls(item, context.config.functionToolCallbacks);
		return { content: functionResult };
	}
	async processMessage(item, context) {
		if (item.role !== "assistant") return {};
		let content = "";
		let isRefusal = false;
		let refusal = "";
		const annotations = [];
		if (item.content) for (const contentItem of item.content) {
			if (!contentItem || typeof contentItem !== "object") {
				require_logger.logger.warn(`Skipping invalid content item: ${JSON.stringify(contentItem)}`);
				continue;
			}
			if (contentItem.type === "output_text") {
				content += contentItem.text;
				if (Array.isArray(contentItem.annotations) && contentItem.annotations.length > 0) annotations.push(...contentItem.annotations);
			} else if (contentItem.type === "tool_use" || contentItem.type === "function_call") content = await this.config.functionCallbackHandler.processCalls(contentItem, context.config.functionToolCallbacks);
			else if (contentItem.type === "refusal") {
				refusal = contentItem.refusal;
				isRefusal = true;
			}
		}
		else if (item.refusal) {
			refusal = item.refusal;
			isRefusal = true;
		}
		return {
			content: isRefusal ? refusal : content,
			isRefusal,
			annotations: annotations.length > 0 ? annotations : void 0
		};
	}
	processToolResult(item) {
		return Promise.resolve({ content: JSON.stringify(item) });
	}
	processReasoning(item) {
		if (!item.summary || !item.summary.length) return Promise.resolve({});
		const reasoningText = `Reasoning: ${item.summary.map((s) => s.text).join("\n")}`;
		return Promise.resolve({ content: reasoningText });
	}
	processWebSearch(item) {
		let content = "";
		const action = item.action;
		if (action) if (action.type === "search") content = `Web Search: "${action.query}"`;
		else if (action.type === "open_page") content = `Opening page: ${action.url}`;
		else if (action.type === "find_in_page") content = `Finding in page: "${action.query}"`;
		else content = `Web action: ${action.type}`;
		else content = `Web Search Call (status: ${item.status || "unknown"})`;
		if (item.status === "failed" && item.error) content += ` (Error: ${item.error})`;
		return Promise.resolve({ content });
	}
	processCodeInterpreter(item) {
		let content = `Code Interpreter: ${item.code || "Running code..."}`;
		if (item.status === "failed" && item.error) content += ` (Error: ${item.error})`;
		return Promise.resolve({ content });
	}
	processMcpListTools(item) {
		const content = `MCP Tools from ${item.server_label}: ${JSON.stringify(item.tools, null, 2)}`;
		return Promise.resolve({ content });
	}
	processMcpCall(item) {
		let content;
		if (item.error) content = `MCP Tool Error (${item.name}): ${item.error}`;
		else content = `MCP Tool Result (${item.name}): ${item.output}`;
		return Promise.resolve({ content });
	}
	processMcpApprovalRequest(item) {
		const content = `MCP Approval Required for ${item.server_label}.${item.name}: ${item.arguments}`;
		return Promise.resolve({ content });
	}
};
//#endregion
//#region src/providers/openai/responses.ts
var OpenAiResponsesProvider = class extends require_openai.OpenAiGenericProvider {
	functionCallbackHandler = new FunctionCallbackHandler();
	processor;
	static OPENAI_RESPONSES_MODEL_NAMES = [
		"gpt-4o",
		"gpt-4o-2024-08-06",
		"gpt-4o-2024-11-20",
		"gpt-4o-2024-05-13",
		"gpt-4o-2024-07-18",
		"gpt-4o-mini",
		"gpt-4o-mini-2024-07-18",
		"gpt-4.1",
		"gpt-4.1-2025-04-14",
		"gpt-4.1-mini",
		"gpt-4.1-mini-2025-04-14",
		"gpt-4.1-nano",
		"gpt-4.1-nano-2025-04-14",
		"gpt-5",
		"gpt-5-2025-08-07",
		"gpt-5-chat",
		"gpt-5-chat-latest",
		"gpt-5-nano",
		"gpt-5-nano-2025-08-07",
		"gpt-5-mini",
		"gpt-5-mini-2025-08-07",
		"gpt-5-pro",
		"gpt-5-pro-2025-10-06",
		"gpt-5.1",
		"gpt-5.1-2025-11-13",
		"gpt-5.1-mini",
		"gpt-5.1-nano",
		"gpt-5.1-codex",
		"gpt-5.1-codex-max",
		"gpt-5.1-chat-latest",
		"gpt-5.2",
		"gpt-5.2-2025-12-11",
		"gpt-5.2-chat-latest",
		"gpt-5.2-codex",
		"gpt-5.2-pro",
		"gpt-5.2-pro-2025-12-11",
		"gpt-5.3-chat-latest",
		"gpt-5.3-codex",
		"gpt-5.3-codex-spark",
		"gpt-5.4",
		"gpt-5.4-2026-03-05",
		"gpt-5.4-mini",
		"gpt-5.4-mini-2026-03-17",
		"gpt-5.4-nano",
		"gpt-5.4-nano-2026-03-17",
		"gpt-5.4-pro",
		"gpt-5.4-pro-2026-03-05",
		"gpt-audio",
		"gpt-audio-2025-08-28",
		"gpt-audio-mini",
		"gpt-audio-mini-2025-10-06",
		"computer-use-preview",
		"computer-use-preview-2025-03-11",
		"o1",
		"o1-2024-12-17",
		"o1-preview",
		"o1-preview-2024-09-12",
		"o1-mini",
		"o1-mini-2024-09-12",
		"o1-pro",
		"o1-pro-2025-03-19",
		"o3-pro",
		"o3-pro-2025-06-10",
		"o3",
		"o3-2025-04-16",
		"o4-mini",
		"o4-mini-2025-04-16",
		"o3-mini",
		"o3-mini-2025-01-31",
		"codex-mini-latest",
		"gpt-5-codex",
		"o3-deep-research",
		"o3-deep-research-2025-06-26",
		"o4-mini-deep-research",
		"o4-mini-deep-research-2025-06-26"
	];
	config;
	constructor(modelName, options = {}) {
		super(modelName, options);
		this.config = options.config || {};
		this.processor = new ResponsesProcessor({
			modelName: this.modelName,
			providerType: "openai",
			functionCallbackHandler: this.functionCallbackHandler,
			costCalculator: (modelName, usage, config) => require_util$1.calculateOpenAICost(modelName, config, usage?.input_tokens, usage?.output_tokens, 0, 0) ?? 0
		});
	}
	isGPT5Model() {
		return this.modelName.startsWith("gpt-5") || this.modelName.includes("/gpt-5");
	}
	isReasoningModel() {
		return this.modelName.startsWith("o1") || this.modelName.startsWith("o3") || this.modelName.startsWith("o4") || this.modelName.includes("/o1") || this.modelName.includes("/o3") || this.modelName.includes("/o4") || this.modelName === "codex-mini-latest" || this.isGPT5Model();
	}
	supportsTemperature() {
		return !this.isReasoningModel();
	}
	async getOpenAiBody(prompt, context, _callApiOptions) {
		const config = {
			...this.config,
			...context?.prompt?.config
		};
		let input;
		try {
			const parsedJson = JSON.parse(prompt);
			if (Array.isArray(parsedJson)) input = parsedJson;
			else input = prompt;
		} catch {
			input = prompt;
		}
		const isReasoningModel = this.isReasoningModel();
		const maxOutputTokens = config.max_output_tokens ?? (isReasoningModel ? require_logger.getEnvInt("OPENAI_MAX_COMPLETION_TOKENS") : require_logger.getEnvInt("OPENAI_MAX_TOKENS", 1024));
		const temperature = this.supportsTemperature() ? config.temperature ?? require_logger.getEnvFloat("OPENAI_TEMPERATURE", 0) : void 0;
		const reasoningEffort = isReasoningModel ? require_util.renderVarsInObject(config.reasoning_effort, context?.vars) : void 0;
		const instructions = config.instructions;
		const responseFormat = require_util.maybeLoadResponseFormatFromExternalFile(config.response_format, context?.vars);
		let textFormat;
		if (responseFormat) if (responseFormat.type === "json_object") textFormat = { format: { type: "json_object" } };
		else if (responseFormat.type === "json_schema") {
			const schema = responseFormat.schema || responseFormat.json_schema?.schema;
			textFormat = { format: {
				type: "json_schema",
				name: responseFormat.json_schema?.name || responseFormat.name || "response_schema",
				schema,
				strict: true
			} };
		} else textFormat = { format: { type: "text" } };
		else textFormat = { format: { type: "text" } };
		if (this.isGPT5Model() && config.verbosity) textFormat = {
			...textFormat,
			verbosity: config.verbosity
		};
		const loadedTools = config.tools ? await require_util.maybeLoadToolsFromExternalFile(config.tools, context?.vars) : void 0;
		const body = {
			model: this.modelName,
			input,
			...maxOutputTokens === void 0 ? {} : { max_output_tokens: maxOutputTokens },
			...reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {},
			...temperature === void 0 ? {} : { temperature },
			...instructions ? { instructions } : {},
			...(!reasoningEffort || reasoningEffort === "none") && (config.top_p !== void 0 || require_logger.getEnvString("OPENAI_TOP_P")) ? { top_p: config.top_p ?? require_logger.getEnvFloat("OPENAI_TOP_P", 1) } : {},
			...loadedTools ? { tools: loadedTools } : {},
			...config.tool_choice ? { tool_choice: config.tool_choice } : {},
			...config.max_tool_calls ? { max_tool_calls: config.max_tool_calls } : {},
			...config.previous_response_id ? { previous_response_id: config.previous_response_id } : {},
			text: textFormat,
			...config.truncation ? { truncation: config.truncation } : {},
			...config.metadata ? { metadata: config.metadata } : {},
			..."parallel_tool_calls" in config ? { parallel_tool_calls: Boolean(config.parallel_tool_calls) } : {},
			...config.stream ? { stream: config.stream } : {},
			..."store" in config ? { store: Boolean(config.store) } : {},
			...config.background ? { background: config.background } : {},
			...config.webhook_url ? { webhook_url: config.webhook_url } : {},
			...config.user ? { user: config.user } : {},
			...config.passthrough || {}
		};
		if (config.reasoning && this.isReasoningModel()) body.reasoning = config.reasoning;
		return {
			body,
			config: {
				...config,
				tools: loadedTools,
				response_format: responseFormat
			}
		};
	}
	async callApi(prompt, context, callApiOptions) {
		if (this.requiresApiKey() && !this.getApiKey()) throw new Error(this.getMissingApiKeyErrorMessage());
		const { body, config } = await this.getOpenAiBody(prompt, context, callApiOptions);
		const isDeepResearchModel = this.modelName.includes("deep-research");
		if (isDeepResearchModel) {
			if (!config.tools?.some((tool) => tool.type === "web_search_preview")) return { error: `Deep research model ${this.modelName} requires the web_search_preview tool to be configured. Add it to your provider config:\ntools:\n  - type: web_search_preview` };
			const mcpTools = config.tools?.filter((tool) => tool.type === "mcp") || [];
			for (const mcpTool of mcpTools) if (mcpTool.require_approval !== "never") return { error: `Deep research model ${this.modelName} requires MCP tools to have require_approval: 'never'. Update your MCP tool configuration:\ntools:\n  - type: mcp\n    require_approval: never` };
		}
		let timeout = require_fetch.REQUEST_TIMEOUT_MS;
		const isGpt5ProModel = /(^|\/)gpt-5(?:\.\d+)?-pro(?:-|$)/.test(this.modelName);
		if (isDeepResearchModel || isGpt5ProModel) {
			const evalTimeout = require_logger.getEnvInt("PROMPTFOO_EVAL_TIMEOUT_MS", 0);
			timeout = evalTimeout > 0 ? evalTimeout : require_fetch.LONG_RUNNING_MODEL_TIMEOUT_MS;
			require_logger.logger.debug(`Using timeout of ${timeout}ms for long-running model ${this.modelName}`);
		}
		let data;
		let status;
		let statusText;
		let cached = false;
		let deleteFromCache;
		let responseHeaders;
		try {
			({data, cached, status, statusText, deleteFromCache, headers: responseHeaders} = await require_cache.fetchWithCache(`${this.getApiUrl()}/responses`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...this.getApiKey() ? { Authorization: `Bearer ${this.getApiKey()}` } : {},
					...this.getOrganization() ? { "OpenAI-Organization": this.getOrganization() } : {},
					...config.headers
				},
				body: JSON.stringify(body)
			}, timeout, "json", context?.bustCache ?? context?.debug, this.config.maxRetries));
			if (status < 200 || status >= 300) {
				const errorMessage = `API error: ${status} ${statusText}\n${typeof data === "string" ? data : JSON.stringify(data)}`;
				if (typeof data === "object" && data?.error?.code === "invalid_prompt") return {
					output: errorMessage,
					tokenUsage: data?.usage ? require_util$1.getTokenUsage(data, cached) : void 0,
					isRefusal: true,
					metadata: { http: {
						status,
						statusText,
						headers: responseHeaders ?? {}
					} }
				};
				return {
					error: errorMessage,
					metadata: { http: {
						status,
						statusText,
						headers: responseHeaders ?? {}
					} }
				};
			}
		} catch (err) {
			require_logger.logger.error(`API call error: ${String(err)}`);
			await deleteFromCache?.();
			return {
				error: `API call error: ${String(err)}`,
				metadata: { http: {
					status: 0,
					statusText: "Error",
					headers: responseHeaders ?? {}
				} }
			};
		}
		if (data.error?.message) {
			await deleteFromCache?.();
			return {
				error: require_util$1.formatOpenAiError(data),
				metadata: { http: {
					status,
					statusText,
					headers: responseHeaders ?? {}
				} }
			};
		}
		const result = await this.processor.processResponseOutput(data, config, cached);
		return {
			...result,
			metadata: {
				...result.metadata,
				http: {
					status,
					statusText,
					headers: responseHeaders ?? {}
				}
			}
		};
	}
};
//#endregion
Object.defineProperty(exports, "FunctionCallbackHandler", {
	enumerable: true,
	get: function() {
		return FunctionCallbackHandler;
	}
});
Object.defineProperty(exports, "OpenAiResponsesProvider", {
	enumerable: true,
	get: function() {
		return OpenAiResponsesProvider;
	}
});
Object.defineProperty(exports, "ResponsesProcessor", {
	enumerable: true,
	get: function() {
		return ResponsesProcessor;
	}
});

//# sourceMappingURL=responses-BfwTwTHc.cjs.map
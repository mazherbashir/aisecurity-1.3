const require_logger = require("./logger-wcsrvnoS.cjs");
const require_esm = require("./esm-CpPA2ZnQ.cjs");
const require_fetch = require("./fetch-Gr9TColK.cjs");
const require_openai = require("./openai-C0PBYMcJ.cjs");
let path = require("path");
path = require_logger.__toESM(path);
let _openai_agents = require("@openai/agents");
//#region src/providers/openai/agents-model-settings.ts
function resolveModelSettings(modelSettings) {
	if (!modelSettings) return;
	const retry = modelSettings.retry ? {
		...modelSettings.retry,
		policy: resolveRetryPolicy(modelSettings.retry.policy)
	} : void 0;
	return {
		...modelSettings,
		retry
	};
}
function resolveRetryPolicy(policy) {
	if (!policy) return;
	if (typeof policy === "function") return policy;
	if (typeof policy === "string") switch (policy) {
		case "never": return _openai_agents.retryPolicies.never();
		case "providerSuggested": return _openai_agents.retryPolicies.providerSuggested();
		case "networkError": return _openai_agents.retryPolicies.networkError();
		case "retryAfter": return _openai_agents.retryPolicies.retryAfter();
		default: return;
	}
	if ("httpStatus" in policy) return _openai_agents.retryPolicies.httpStatus(policy.httpStatus);
	if ("any" in policy) {
		const policies = policy.any.map((nestedPolicy) => resolveRetryPolicy(nestedPolicy)).filter((nestedPolicy) => !!nestedPolicy);
		return policies.length ? _openai_agents.retryPolicies.any(...policies) : void 0;
	}
	if ("all" in policy) {
		const policies = policy.all.map((nestedPolicy) => resolveRetryPolicy(nestedPolicy)).filter((nestedPolicy) => !!nestedPolicy);
		return policies.length ? _openai_agents.retryPolicies.all(...policies) : void 0;
	}
}
//#endregion
//#region src/providers/openai/agents-loader.ts
/**
* Load agent definition from file path or return inline definition
*/
async function loadAgentDefinition(agentConfig) {
	if (isAgentInstance(agentConfig)) {
		require_logger.logger.debug("[AgentsLoader] Using provided Agent instance");
		return agentConfig;
	}
	if (typeof agentConfig === "string" && agentConfig.startsWith("file://")) {
		require_logger.logger.debug("[AgentsLoader] Loading agent from file", { path: agentConfig });
		return await loadAgentFromFile(agentConfig);
	}
	if (typeof agentConfig === "object") {
		require_logger.logger.debug("[AgentsLoader] Creating agent from inline definition");
		return await createAgentFromDefinition(agentConfig);
	}
	require_logger.logger.debug("[AgentsLoader] Invalid agent configuration", {
		type: typeof agentConfig,
		keys: typeof agentConfig === "object" && agentConfig !== null ? Object.keys(agentConfig).slice(0, 5) : void 0
	});
	throw new Error("Invalid agent configuration: expected Agent instance, file:// URL, or inline definition");
}
/**
* Load tools from file path or return inline definitions
*/
async function loadTools(toolsConfig) {
	if (!toolsConfig) return;
	if (typeof toolsConfig === "string" && toolsConfig.startsWith("file://")) {
		require_logger.logger.debug("[AgentsLoader] Loading tools from file", { path: toolsConfig });
		return await loadToolsFromFile(toolsConfig);
	}
	if (Array.isArray(toolsConfig)) {
		require_logger.logger.debug("[AgentsLoader] Using inline tool definitions");
		return normalizeTools(toolsConfig);
	}
	require_logger.logger.debug("[AgentsLoader] Invalid tools configuration", {
		type: typeof toolsConfig,
		isArray: Array.isArray(toolsConfig)
	});
	throw new Error("Invalid tools configuration: expected file:// URL or array");
}
/**
* Load handoffs from file path or return inline definitions
*/
async function loadHandoffs(handoffsConfig) {
	if (!handoffsConfig) return;
	if (typeof handoffsConfig === "string" && handoffsConfig.startsWith("file://")) {
		require_logger.logger.debug("[AgentsLoader] Loading handoffs from file", { path: handoffsConfig });
		return await loadHandoffsFromFile(handoffsConfig);
	}
	if (Array.isArray(handoffsConfig)) {
		require_logger.logger.debug("[AgentsLoader] Using inline handoff definitions");
		return normalizeHandoffs(handoffsConfig);
	}
	require_logger.logger.debug("[AgentsLoader] Invalid handoffs configuration", {
		type: typeof handoffsConfig,
		isArray: Array.isArray(handoffsConfig)
	});
	throw new Error("Invalid handoffs configuration: expected file:// URL or array");
}
/**
* Load input guardrails from file path or return inline definitions
*/
async function loadInputGuardrails(guardrailsConfig) {
	if (!guardrailsConfig) return;
	if (typeof guardrailsConfig === "string" && guardrailsConfig.startsWith("file://")) {
		require_logger.logger.debug("[AgentsLoader] Loading input guardrails from file", { path: guardrailsConfig });
		return await loadArrayFromFile(guardrailsConfig, "input guardrails");
	}
	if (Array.isArray(guardrailsConfig)) {
		require_logger.logger.debug("[AgentsLoader] Using inline input guardrails");
		return guardrailsConfig;
	}
	require_logger.logger.debug("[AgentsLoader] Invalid input guardrails configuration", {
		type: typeof guardrailsConfig,
		isArray: Array.isArray(guardrailsConfig)
	});
	throw new Error("Invalid input guardrails configuration: expected file:// URL or array");
}
/**
* Load output guardrails from file path or return inline definitions
*/
async function loadOutputGuardrails(guardrailsConfig) {
	if (!guardrailsConfig) return;
	if (typeof guardrailsConfig === "string" && guardrailsConfig.startsWith("file://")) {
		require_logger.logger.debug("[AgentsLoader] Loading output guardrails from file", { path: guardrailsConfig });
		return await loadArrayFromFile(guardrailsConfig, "output guardrails");
	}
	if (Array.isArray(guardrailsConfig)) {
		require_logger.logger.debug("[AgentsLoader] Using inline output guardrails");
		return guardrailsConfig;
	}
	require_logger.logger.debug("[AgentsLoader] Invalid output guardrails configuration", {
		type: typeof guardrailsConfig,
		isArray: Array.isArray(guardrailsConfig)
	});
	throw new Error("Invalid output guardrails configuration: expected file:// URL or array");
}
/**
* Load agent from file
*/
async function loadAgentFromFile(filePath) {
	const resolvedPath = resolveFilePath(filePath);
	require_logger.logger.debug("[AgentsLoader] Loading agent from resolved path", { path: resolvedPath });
	try {
		const module = await require_esm.importModule(resolvedPath);
		const agent = module.default || module;
		if (!isAgentInstance(agent)) throw new Error(`File ${resolvedPath} does not export an Agent instance`);
		return agent;
	} catch (error) {
		require_logger.logger.error("[AgentsLoader] Failed to load agent from file", {
			path: resolvedPath,
			error
		});
		throw new Error(`Failed to load agent from ${resolvedPath}: ${error}`);
	}
}
/**
* Load tools from file
*/
async function loadToolsFromFile(filePath) {
	return await normalizeTools(await loadArrayFromFile(filePath, "tools")) ?? [];
}
/**
* Load handoffs from file
*/
async function loadHandoffsFromFile(filePath) {
	return await normalizeHandoffs(await loadArrayFromFile(filePath, "handoffs")) ?? [];
}
/**
* Create an Agent instance from an inline definition
*/
async function createAgentFromDefinition(definition) {
	try {
		const tools = await normalizeTools(definition.tools);
		const handoffs = await normalizeHandoffs(definition.handoffs);
		return new _openai_agents.Agent({
			name: definition.name,
			instructions: definition.instructions,
			prompt: definition.prompt,
			model: definition.model,
			modelSettings: resolveModelSettings(definition.modelSettings),
			handoffDescription: definition.handoffDescription,
			outputType: definition.outputType,
			tools,
			handoffs,
			inputGuardrails: definition.inputGuardrails,
			outputGuardrails: definition.outputGuardrails,
			mcpServers: definition.mcpServers,
			toolUseBehavior: definition.toolUseBehavior,
			resetToolChoice: definition.resetToolChoice
		});
	} catch (error) {
		require_logger.logger.error("[AgentsLoader] Failed to create agent from definition", {
			name: definition?.name,
			model: definition?.model,
			toolCount: definition?.tools?.length,
			handoffCount: definition?.handoffs?.length,
			error
		});
		throw new Error(`Failed to create agent from definition: ${error}`);
	}
}
/**
* Check if a value is an Agent instance
*/
function isAgentInstance(value) {
	return value instanceof _openai_agents.Agent;
}
function isToolInstance(value) {
	return !!value && typeof value === "object" && "type" in value && typeof value.type === "string";
}
function isHandoffInstance(value) {
	return !!value && typeof value === "object" && "agent" in value && "getHandoffAsFunctionTool" in value && typeof value.getHandoffAsFunctionTool === "function";
}
async function normalizeTools(definitions) {
	if (!definitions?.length) return;
	return definitions.map((definition) => {
		if (isToolInstance(definition)) return definition;
		return (0, _openai_agents.tool)({
			name: definition.name,
			description: definition.description,
			parameters: definition.parameters,
			strict: definition.strict ?? true,
			deferLoading: definition.deferLoading,
			execute: typeof definition.execute === "function" ? definition.execute : async () => definition.execute
		});
	});
}
async function normalizeHandoffs(definitions) {
	if (!definitions?.length) return;
	return Promise.all(definitions.map(async (definition) => {
		if (isAgentInstance(definition) || isHandoffInstance(definition)) return definition;
		const agent = await loadAgentDefinition(definition.agent);
		if (!definition.description) return agent;
		return (0, _openai_agents.handoff)(agent, { toolDescriptionOverride: definition.description });
	}));
}
async function loadArrayFromFile(filePath, label) {
	const resolvedPath = resolveFilePath(filePath);
	require_logger.logger.debug(`[AgentsLoader] Loading ${label} from resolved path`, { path: resolvedPath });
	try {
		const module = await require_esm.importModule(resolvedPath);
		const exported = module.default || module;
		if (!Array.isArray(exported)) throw new Error(`File ${resolvedPath} does not export an array of ${label}`);
		return exported;
	} catch (error) {
		require_logger.logger.error(`[AgentsLoader] Failed to load ${label} from file`, {
			path: resolvedPath,
			error
		});
		throw new Error(`Failed to load ${label} from ${resolvedPath}: ${error}`);
	}
}
/**
* Resolve file:// path to absolute file system path
*/
function resolveFilePath(filePath) {
	const cleanPath = filePath.replace(/^file:\/\//, "");
	if (path.default.isAbsolute(cleanPath)) return cleanPath;
	const basePath = require_logger.state.basePath || process.cwd();
	const resolvedPath = path.default.resolve(basePath, cleanPath);
	require_logger.logger.debug("[AgentsLoader] Resolved file path", {
		original: filePath,
		basePath,
		resolved: resolvedPath
	});
	return resolvedPath;
}
//#endregion
//#region src/providers/openai/agents-tracing.ts
/**
* OTLP Tracing Exporter for OpenAI Agents
*
* Exports traces and spans from openai-agents-js to promptfoo's OTLP receiver
* in OTLP JSON format over HTTP.
*/
var OTLPTracingExporter = class {
	otlpEndpoint;
	evaluationId;
	testCaseId;
	constructor(options = {}) {
		this.otlpEndpoint = options.otlpEndpoint || "http://localhost:4318";
		this.evaluationId = options.evaluationId;
		this.testCaseId = options.testCaseId;
	}
	/**
	* Export traces and spans to OTLP endpoint
	*/
	async export(items, signal) {
		if (items.length === 0) {
			require_logger.logger.debug("[AgentsTracing] No items to export");
			return;
		}
		require_logger.logger.debug(`[AgentsTracing] Exporting ${items.length} items to OTLP`);
		try {
			const otlpPayload = this.transformToOTLP(items);
			const url = `${this.otlpEndpoint}/v1/traces`;
			require_logger.logger.debug("[AgentsTracing] Sending OTLP payload", {
				url,
				spanCount: otlpPayload.resourceSpans[0]?.scopeSpans[0]?.spans?.length || 0
			});
			const response = await require_fetch.fetchWithProxy(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(otlpPayload),
				signal
			});
			if (response.ok) require_logger.logger.debug("[AgentsTracing] Successfully exported traces to OTLP");
			else require_logger.logger.error(`[AgentsTracing] OTLP export failed: ${response.status} ${response.statusText}`);
		} catch (error) {
			require_logger.logger.error("[AgentsTracing] Failed to export traces to OTLP", { error });
		}
	}
	/**
	* Transform openai-agents-js traces/spans to OTLP JSON format
	*/
	transformToOTLP(items) {
		const spans = items.filter((item) => item.type === "trace.span").map((item) => this.spanToOTLP(item));
		return { resourceSpans: [{
			resource: { attributes: [
				{
					key: "service.name",
					value: { stringValue: "promptfoo-agents" }
				},
				...this.evaluationId ? [{
					key: "evaluation.id",
					value: { stringValue: this.evaluationId }
				}] : [],
				...this.testCaseId ? [{
					key: "test.case.id",
					value: { stringValue: this.testCaseId }
				}] : []
			] },
			scopeSpans: [{
				scope: {
					name: "openai-agents-js",
					version: "0.1.0"
				},
				spans
			}]
		}] };
	}
	/**
	* Convert a single span to OTLP format
	*/
	spanToOTLP(span) {
		const startTime = span.startedAt ? new Date(span.startedAt).getTime() : Date.now();
		const endTime = span.endedAt ? new Date(span.endedAt).getTime() : void 0;
		const traceId = span.traceId || this.generateTraceId();
		const spanId = span.spanId || this.generateSpanId();
		return {
			traceId: this.hexToBase64(traceId, "trace"),
			spanId: this.hexToBase64(spanId, "span"),
			parentSpanId: span.parentId ? this.hexToBase64(span.parentId, "span") : void 0,
			name: this.getSpanName(span),
			kind: 1,
			startTimeUnixNano: String(startTime * 1e6),
			endTimeUnixNano: endTime ? String(endTime * 1e6) : void 0,
			attributes: this.attributesToOTLP(span.spanData),
			status: this.getSpanStatus(span)
		};
	}
	/**
	* Get span name from span data
	*/
	getSpanName(span) {
		const data = span.spanData;
		if ("name" in data && data.name) return data.name;
		if (data.type) return `agent.${data.type}`;
		return "agent.span";
	}
	/**
	* Get span status from span data
	*/
	getSpanStatus(span) {
		const error = span.error;
		if (error) return {
			code: 2,
			message: error.message || String(error)
		};
		return { code: 0 };
	}
	/**
	* Convert span data to OTLP attributes
	*/
	attributesToOTLP(data) {
		const attributes = [];
		if (!data) return attributes;
		for (const [key, value] of Object.entries(data)) {
			if (key === "name" || key === "type") continue;
			attributes.push({
				key: `agent.${key}`,
				value: this.valueToOTLP(value)
			});
		}
		return attributes;
	}
	/**
	* Convert a value to OTLP attribute value format
	*/
	valueToOTLP(value) {
		if (value === null || value === void 0) return { stringValue: "" };
		if (typeof value === "string") return { stringValue: value };
		if (typeof value === "number") return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
		if (typeof value === "boolean") return { boolValue: value };
		if (Array.isArray(value)) return { arrayValue: { values: value.map((v) => this.valueToOTLP(v)) } };
		if (typeof value === "object") return { stringValue: JSON.stringify(value) };
		return { stringValue: String(value) };
	}
	/**
	* Convert hex string to base64 for OTLP format
	* Handles openai-agents-js ID format (trace_XXX, span_XXX)
	* @param hex - The hex string to convert
	* @param kind - Whether this is a 'trace' (16 bytes) or 'span' (8 bytes) ID
	*/
	hexToBase64(hex, kind) {
		if (!hex) return "";
		try {
			let cleanHex = hex.replace(/^(trace_|span_|group_)/, "");
			const targetLength = kind === "span" ? 16 : 32;
			if (cleanHex.length > targetLength) cleanHex = cleanHex.substring(0, targetLength);
			else if (cleanHex.length < targetLength) cleanHex = cleanHex.padEnd(targetLength, "0");
			return Buffer.from(cleanHex, "hex").toString("base64");
		} catch (error) {
			require_logger.logger.error(`[AgentsTracing] Failed to convert hex to base64: ${hex}`, { error });
			const fallbackLen = kind === "span" ? 16 : 32;
			return Buffer.from(this.generateRandomHex(fallbackLen), "hex").toString("base64");
		}
	}
	/**
	* Generate a random trace ID (32 hex chars)
	*/
	generateTraceId() {
		return this.generateRandomHex(32);
	}
	/**
	* Generate a random span ID (16 hex chars)
	*/
	generateSpanId() {
		return this.generateRandomHex(16);
	}
	/**
	* Generate random hex string of specified length
	*/
	generateRandomHex(length) {
		const bytes = Math.ceil(length / 2);
		const buffer = Buffer.alloc(bytes);
		for (let i = 0; i < bytes; i++) buffer[i] = Math.floor(Math.random() * 256);
		return buffer.toString("hex").substring(0, length);
	}
};
//#endregion
//#region src/providers/openai/agents.ts
/**
* OpenAI Agents Provider
*
* Integrates openai-agents-js SDK as a promptfoo provider.
* Supports multi-turn agent workflows with tools, handoffs, and tracing.
*/
var OpenAiAgentsProvider = class extends require_openai.OpenAiGenericProvider {
	agentConfig;
	agent;
	tracingExporter;
	constructor(modelName, options = {}) {
		super(modelName, options);
		this.agentConfig = options.config || {};
	}
	id() {
		return `openai:agents:${this.modelName}`;
	}
	toString() {
		return `[OpenAI Agents Provider ${this.modelName}]`;
	}
	/**
	* Call the agent with the given prompt
	*/
	async callApi(prompt, context, callApiOptions) {
		require_logger.logger.debug("[AgentsProvider] Starting agent call", {
			prompt: prompt.substring(0, 100),
			hasContext: !!context
		});
		try {
			if (!this.agent) this.agent = await this.initializeAgent();
			await this.setupTracingIfNeeded(context);
			const result = await this.runAgent(prompt, context, callApiOptions);
			require_logger.logger.debug("[AgentsProvider] Agent run completed", {
				outputLength: result.output?.length || 0,
				tokenUsage: result.tokenUsage
			});
			return result;
		} catch (error) {
			require_logger.logger.error("[AgentsProvider] Agent call failed", { error });
			throw error;
		}
	}
	/**
	* Initialize the agent from configuration
	*/
	async initializeAgent() {
		require_logger.logger.debug("[AgentsProvider] Initializing agent");
		if (!this.agentConfig.agent) throw new Error("No agent configuration provided");
		try {
			const agent = await loadAgentDefinition(this.agentConfig.agent);
			const [tools, handoffs, inputGuardrails, outputGuardrails] = await Promise.all([
				loadTools(this.agentConfig.tools),
				loadHandoffs(this.agentConfig.handoffs),
				loadInputGuardrails(this.agentConfig.inputGuardrails),
				loadOutputGuardrails(this.agentConfig.outputGuardrails)
			]);
			const configuredAgent = agent.clone({
				tools: mergeArrays(agent.tools, tools),
				handoffs: mergeArrays(agent.handoffs, handoffs),
				inputGuardrails: mergeArrays(agent.inputGuardrails, inputGuardrails),
				outputGuardrails: mergeArrays(agent.outputGuardrails, outputGuardrails)
			});
			const mockAwareAgent = this.wrapToolsIfNeeded(configuredAgent);
			require_logger.logger.debug("[AgentsProvider] Agent initialized successfully", {
				name: mockAwareAgent.name,
				toolCount: mockAwareAgent.tools.length,
				handoffCount: mockAwareAgent.handoffs.length,
				inputGuardrailCount: mockAwareAgent.inputGuardrails.length,
				outputGuardrailCount: mockAwareAgent.outputGuardrails.length
			});
			return mockAwareAgent;
		} catch (error) {
			require_logger.logger.error("[AgentsProvider] Failed to initialize agent", { error });
			throw new Error(`Failed to initialize agent: ${error}`);
		}
	}
	/**
	* Setup tracing if enabled
	*/
	async setupTracingIfNeeded(context) {
		if (!(this.agentConfig.tracing === true || context?.test?.metadata?.tracingEnabled === true || process.env.PROMPTFOO_TRACING_ENABLED === "true")) {
			require_logger.logger.debug("[AgentsProvider] Tracing not enabled");
			return;
		}
		require_logger.logger.debug("[AgentsProvider] Setting up tracing");
		try {
			this.tracingExporter = new OTLPTracingExporter({
				otlpEndpoint: this.agentConfig.otlpEndpoint,
				evaluationId: context?.evaluationId,
				testCaseId: context?.testCaseId
			});
			await this.registerTracingExporter(this.tracingExporter);
			(0, _openai_agents.startTraceExportLoop)();
			require_logger.logger.debug("[AgentsProvider] Tracing setup complete");
		} catch (error) {
			require_logger.logger.error("[AgentsProvider] Failed to setup tracing", { error });
		}
	}
	/**
	* Register tracing exporter with openai-agents-js tracing system
	*/
	async registerTracingExporter(exporter) {
		try {
			(0, _openai_agents.addTraceProcessor)(new _openai_agents.BatchTraceProcessor(exporter, {
				maxQueueSize: 100,
				maxBatchSize: 10,
				scheduleDelay: 1e3
			}));
			require_logger.logger.debug("[AgentsProvider] Tracing processor registered");
		} catch (error) {
			require_logger.logger.error("[AgentsProvider] Failed to register tracing processor", { error });
			throw error;
		}
	}
	/**
	* Run the agent with the given prompt
	*/
	async runAgent(prompt, context, callApiOptions) {
		try {
			require_logger.logger.debug("[AgentsProvider] Running agent", {
				agentName: this.agent?.name,
				maxTurns: this.agentConfig.maxTurns ?? 10
			});
			const runOptions = {
				context: context?.vars,
				maxTurns: this.agentConfig.maxTurns ?? 10,
				signal: callApiOptions?.abortSignal
			};
			if (this.agentConfig.model || this.modelName) runOptions.model = this.agentConfig.model || this.modelName;
			if (this.agentConfig.modelSettings) runOptions.modelSettings = resolveModelSettings(this.agentConfig.modelSettings);
			const result = await (0, _openai_agents.getOrCreateTrace)(async () => {
				return await (0, _openai_agents.run)(this.agent, prompt, runOptions);
			});
			require_logger.logger.debug("[AgentsProvider] Agent run result", {
				hasOutput: !!result.finalOutput,
				turns: result.newItems?.length || 0
			});
			return {
				output: result.finalOutput,
				tokenUsage: this.extractTokenUsage(result),
				cached: false,
				cost: this.calculateCost(result)
			};
		} catch (error) {
			require_logger.logger.error("[AgentsProvider] Failed to run agent", { error });
			throw error;
		}
	}
	/**
	* Extract token usage from agent result
	*/
	extractTokenUsage(result) {
		if (!result.usage) return {};
		const usage = result.usage;
		return {
			total: usage.totalTokens ?? void 0,
			prompt: usage.promptTokens ?? void 0,
			completion: usage.completionTokens ?? void 0
		};
	}
	/**
	* Calculate cost from agent result
	*/
	calculateCost(_result) {}
	wrapToolsIfNeeded(agent) {
		if (this.agentConfig.executeTools !== false && this.agentConfig.executeTools !== "mock") return agent;
		const toolMocks = this.agentConfig.toolMocks ?? {};
		const tools = agent.tools.map((tool) => {
			if (tool.type !== "function") return tool;
			const mockValue = toolMocks[tool.name];
			return {
				...tool,
				invoke: async () => mockValue ?? {
					mocked: true,
					tool: tool.name
				}
			};
		});
		return agent.clone({ tools });
	}
};
function mergeArrays(existing, additions) {
	if (!existing?.length && !additions?.length) return;
	return [...existing ?? [], ...additions ?? []];
}
//#endregion
exports.OpenAiAgentsProvider = OpenAiAgentsProvider;

//# sourceMappingURL=agents-B8cyG-Kz.cjs.map
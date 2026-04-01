import { C as getEnvString, D as state, a as logger } from "./logger-DhVTSriR.js";
import { i as resolvePackageEntryPoint, o as safeResolve, r as importModule } from "./esm-B7rhRyUR.js";
import { t as transformMCPConfigToClaudeCode } from "./transform-wN5Yv5Wh.js";
import { t as ANTHROPIC_MODELS } from "./util-Dzpk480d.js";
import { i as initializeAgenticCache, r as getCachedResponse, t as cacheResponse } from "./agentic-utils-B4yhL-DI.js";
import path from "node:path";
import fs from "node:fs";
import dedent from "dedent";
import os from "node:os";
//#region src/providers/claude-agent-sdk.ts
function deriveSkillCalls(toolCalls) {
	return toolCalls.filter((toolCall) => toolCall.name === "Skill").flatMap((toolCall) => {
		const skillName = toolCall.input && typeof toolCall.input === "object" && typeof toolCall.input.skill === "string" ? toolCall.input.skill.trim() : "";
		if (!skillName) return [];
		return [{
			name: skillName,
			input: toolCall.input,
			is_error: toolCall.is_error,
			source: "tool"
		}];
	});
}
/**
* Claude Agent SDK Provider
*
* This provider requires the @anthropic-ai/claude-agent-sdk package to be installed separately:
*   npm install @anthropic-ai/claude-agent-sdk
*
* Two default configurations:
* - No working_dir: Runs in temp directory with no tools - behaves like plain chat API
* - With working_dir: Runs in specified directory with read-only file tools (Read/Grep/Glob/LS)
*
* User can override tool permissions with 'custom_allowed_tools', 'append_allowed_tools', 'disallowed_tools', and 'permission_mode'.
*
* For side effects (file writes, system calls, etc.), user can override permissions and use a custom working directory. They're then responsible for setup/teardown and security considerations.
*
* MCP server connection details are passed through from config. strict_mcp_config is true by default to only allow explicitly configured MCP servers.
*/
const FS_READONLY_ALLOWED_TOOLS = [
	"Read",
	"Grep",
	"Glob",
	"LS"
].sort();
const CLAUDE_CODE_MODEL_ALIASES = [
	"default",
	"sonnet",
	"opus",
	"haiku",
	"sonnet[1m]",
	"opusplan"
];
/**
* Helper to load the Claude Agent SDK ESM module
* Uses resolvePackageEntryPoint to handle ESM-only packages with restrictive exports
*/
async function loadClaudeCodeSDK() {
	const claudeCodePath = resolvePackageEntryPoint("@anthropic-ai/claude-agent-sdk", state.basePath && path.isAbsolute(state.basePath) ? state.basePath : process.cwd());
	if (!claudeCodePath) throw new Error(dedent`The @anthropic-ai/claude-agent-sdk package is required but not installed.

      To use the Claude Agent SDK provider, install it with:
        npm install @anthropic-ai/claude-agent-sdk

      For more information, see: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/`);
	try {
		return importModule(claudeCodePath);
	} catch (err) {
		logger.error(`Failed to load Claude Agent SDK: ${err}`);
		if (err.stack) logger.error(err.stack);
		throw new Error(dedent`Failed to load @anthropic-ai/claude-agent-sdk.

      The package was found but could not be loaded. This may be due to:
      - Incompatible Node.js version (requires Node.js 20.20+ or 22.22+)
      - Corrupted installation

      Try reinstalling:
        npm install @anthropic-ai/claude-agent-sdk

      For more information, see: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/`);
	}
}
/**
* Creates a canUseTool callback for handling AskUserQuestion tool in automated evaluations.
* This provides automated responses to questions that would normally require user input.
*
* The callback wraps an optional user-provided canUseTool and handles AskUserQuestion specifically,
* deferring to the wrapped callback for all other tools.
*/
function createAskUserQuestionCanUseTool(behavior = "first_option", wrappedCanUseTool) {
	return async (toolName, input, options) => {
		if (toolName !== "AskUserQuestion") {
			if (wrappedCanUseTool) return wrappedCanUseTool(toolName, input, options);
			return {
				behavior: "allow",
				updatedInput: input
			};
		}
		if (behavior === "deny") return {
			behavior: "deny",
			message: "AskUserQuestion is disabled in automated evaluation mode"
		};
		const toolInput = input;
		const answers = {};
		for (const question of toolInput.questions) {
			if (!question.options || question.options.length === 0) continue;
			let selectedLabels;
			if (behavior === "random") {
				const randomIndex = Math.floor(Math.random() * question.options.length);
				selectedLabels = [question.options[randomIndex].label];
			} else selectedLabels = [question.options[0].label];
			answers[question.question] = selectedLabels.join(", ");
		}
		return {
			behavior: "allow",
			updatedInput: {
				questions: toolInput.questions,
				answers
			}
		};
	};
}
var ClaudeCodeSDKProvider = class ClaudeCodeSDKProvider {
	static ANTHROPIC_MODELS = ANTHROPIC_MODELS;
	static ANTHROPIC_MODELS_NAMES = ANTHROPIC_MODELS.map((model) => model.id);
	config;
	env;
	apiKey;
	providerId = "anthropic:claude-agent-sdk";
	claudeCodeModule;
	constructor(options = {}) {
		const { config, env, id } = options;
		this.config = config ?? {};
		this.env = env;
		this.apiKey = this.getApiKey();
		this.providerId = id ?? this.providerId;
		if (this.config.model && !ClaudeCodeSDKProvider.ANTHROPIC_MODELS_NAMES.includes(this.config.model) && !CLAUDE_CODE_MODEL_ALIASES.includes(this.config.model)) logger.warn(`Using unknown model for Claude Agent SDK: ${this.config.model}`);
		if (this.config.fallback_model && !ClaudeCodeSDKProvider.ANTHROPIC_MODELS_NAMES.includes(this.config.fallback_model) && !CLAUDE_CODE_MODEL_ALIASES.includes(this.config.fallback_model)) logger.warn(`Using unknown model for Claude Agent SDK fallback: ${this.config.fallback_model}`);
	}
	id() {
		return this.providerId;
	}
	async callApi(prompt, context, callOptions) {
		const config = {
			...this.config,
			...context?.prompt?.config
		};
		const env = {};
		for (const key of Object.keys(process.env).sort()) if (process.env[key] !== void 0) env[key] = process.env[key];
		if (this.env) for (const key of Object.keys(this.env).sort()) {
			const value = this.env[key];
			if (value !== void 0) env[key] = value;
		}
		if (this.apiKey) env.ANTHROPIC_API_KEY = this.apiKey;
		if (!this.apiKey && !(config.apiKeyRequired === false || env.CLAUDE_CODE_USE_BEDROCK || env.CLAUDE_CODE_USE_VERTEX)) throw new Error(dedent`Anthropic API key is not set. Set the ANTHROPIC_API_KEY environment variable or add "apiKey" to the provider config.

        Use CLAUDE_CODE_USE_BEDROCK or CLAUDE_CODE_USE_VERTEX environment variables to use Bedrock or Vertex instead.`);
		if (config.allow_all_tools && ("custom_allowed_tools" in config || "append_allowed_tools" in config)) throw new Error("Cannot specify both allow_all_tools and custom_allowed_tools or append_allowed_tools");
		if ("custom_allowed_tools" in config && "append_allowed_tools" in config) throw new Error("Cannot specify both custom_allowed_tools and append_allowed_tools");
		if (config.permission_mode === "bypassPermissions" && !config.allow_dangerously_skip_permissions) throw new Error("permission_mode 'bypassPermissions' requires allow_dangerously_skip_permissions: true as a safety measure");
		const defaultAllowedTools = config.working_dir ? FS_READONLY_ALLOWED_TOOLS : [];
		let allowedTools = config.allow_all_tools ? void 0 : defaultAllowedTools;
		if ("custom_allowed_tools" in config) allowedTools = Array.from(new Set(config.custom_allowed_tools ?? [])).sort();
		else if (config.append_allowed_tools) allowedTools = Array.from(new Set([...defaultAllowedTools, ...config.append_allowed_tools])).sort();
		const disallowedTools = config.disallowed_tools ? Array.from(new Set(config.disallowed_tools)).sort() : void 0;
		const basePath = state.basePath ? path.resolve(state.basePath) : process.cwd();
		let isTempDir = false;
		let workingDir;
		if (config.working_dir) workingDir = safeResolve(basePath, config.working_dir);
		else isTempDir = true;
		let canUseTool;
		if (config.ask_user_question) canUseTool = createAskUserQuestionCanUseTool(config.ask_user_question.behavior);
		const cacheKeyQueryOptions = {
			maxTurns: config.max_turns,
			model: config.model,
			fallbackModel: config.fallback_model,
			strictMcpConfig: config.strict_mcp_config ?? true,
			permissionMode: config.permission_mode,
			systemPrompt: config.custom_system_prompt ? config.custom_system_prompt : {
				type: "preset",
				preset: "claude_code",
				append: config.append_system_prompt
			},
			maxThinkingTokens: config.max_thinking_tokens,
			allowedTools,
			disallowedTools,
			plugins: config.plugins?.map((plugin) => ({
				...plugin,
				path: safeResolve(basePath, plugin.path)
			})),
			maxBudgetUsd: config.max_budget_usd,
			additionalDirectories: config.additional_directories?.map((dir) => safeResolve(basePath, dir)),
			resume: config.resume,
			forkSession: config.fork_session,
			resumeSessionAt: config.resume_session_at,
			continue: config.continue,
			agents: config.agents,
			outputFormat: config.output_format,
			hooks: config.hooks,
			includePartialMessages: config.include_partial_messages,
			betas: config.betas,
			thinking: config.thinking,
			effort: config.effort,
			agent: config.agent,
			sessionId: config.session_id,
			debug: config.debug,
			debugFile: config.debug_file ? safeResolve(basePath, config.debug_file) : void 0,
			sandbox: config.sandbox,
			allowDangerouslySkipPermissions: config.allow_dangerously_skip_permissions,
			permissionPromptToolName: config.permission_prompt_tool_name,
			executable: config.executable,
			executableArgs: config.executable_args,
			extraArgs: config.extra_args,
			pathToClaudeCodeExecutable: config.path_to_claude_code_executable ? safeResolve(basePath, config.path_to_claude_code_executable) : void 0,
			settingSources: config.setting_sources,
			tools: config.tools,
			enableFileCheckpointing: config.enable_file_checkpointing,
			persistSession: config.persist_session,
			env
		};
		const cacheResult = await initializeAgenticCache({
			cacheKeyPrefix: "anthropic:claude-agent-sdk",
			workingDir,
			bustCache: context?.bustCache,
			mcp: config.mcp?.servers?.length ? config.mcp : void 0,
			cacheMcp: config.cache_mcp
		}, {
			prompt,
			cacheKeyQueryOptions
		});
		const cachedResponse = await getCachedResponse(cacheResult, "Claude Agent SDK");
		if (cachedResponse) return cachedResponse;
		const mcpServers = config.mcp ? await transformMCPConfigToClaudeCode(config.mcp) : {};
		if (workingDir) {
			let stats;
			try {
				stats = fs.statSync(workingDir);
			} catch (err) {
				throw new Error(`Working dir ${config.working_dir} does not exist or isn't accessible: ${err.message}`);
			}
			if (!stats.isDirectory()) throw new Error(`Working dir ${config.working_dir} is not a directory`);
		} else if (isTempDir) workingDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptfoo-claude-agent-sdk-"));
		if (callOptions?.abortSignal?.aborted) return { error: "Claude Agent SDK call aborted before it started" };
		const abortController = new AbortController();
		let abortHandler;
		if (callOptions?.abortSignal) {
			abortHandler = () => {
				abortController.abort(callOptions.abortSignal.reason);
			};
			callOptions.abortSignal.addEventListener("abort", abortHandler);
		}
		const options = {
			...cacheKeyQueryOptions,
			abortController,
			mcpServers,
			cwd: workingDir,
			stderr: config.stderr,
			spawnClaudeCodeProcess: config.spawn_claude_code_process,
			canUseTool
		};
		const queryParams = {
			prompt,
			options
		};
		logger.debug(`Calling Claude Agent SDK: ${JSON.stringify({
			prompt,
			options: {
				...options,
				mcpServers: options.mcpServers ? Object.keys(options.mcpServers) : void 0,
				env: Object.keys(env).length > 0 ? Object.keys(env) : void 0
			}
		})}`);
		try {
			if (!this.claudeCodeModule) this.claudeCodeModule = await loadClaudeCodeSDK();
			const res = await this.claudeCodeModule.query(queryParams);
			const toolCallsMap = /* @__PURE__ */ new Map();
			for await (const msg of res) if (msg.type === "assistant") {
				for (const block of msg.message.content) if (block.type === "tool_use") toolCallsMap.set(block.id, {
					id: block.id,
					name: block.name,
					input: block.input,
					output: void 0,
					is_error: false,
					parentToolUseId: msg.parent_tool_use_id
				});
			} else if (msg.type === "user") {
				const content = msg.message?.content;
				if (Array.isArray(content)) {
					for (const block of content) if (block.type === "tool_result") {
						const entry = toolCallsMap.get(block.tool_use_id);
						if (entry) {
							entry.output = block.content;
							entry.is_error = block.is_error ?? false;
						}
					}
				}
			} else if (msg.type === "result") {
				const raw = JSON.stringify(msg);
				const tokenUsage = {
					prompt: msg.usage?.input_tokens,
					completion: msg.usage?.output_tokens,
					total: msg.usage?.input_tokens && msg.usage?.output_tokens ? msg.usage?.input_tokens + msg.usage?.output_tokens : void 0
				};
				const cost = msg.total_cost_usd ?? 0;
				const sessionId = msg.session_id;
				const toolCallsArray = Array.from(toolCallsMap.values());
				const skillCalls = deriveSkillCalls(toolCallsArray);
				if (msg.subtype === "success") {
					logger.debug(`Claude Agent SDK response: ${raw}`);
					const response = {
						output: msg.structured_output === void 0 ? msg.result : msg.structured_output,
						tokenUsage,
						cost,
						raw,
						sessionId,
						metadata: {
							skillCalls,
							toolCalls: toolCallsArray,
							numTurns: msg.num_turns,
							durationMs: msg.duration_ms,
							durationApiMs: msg.duration_api_ms,
							modelUsage: msg.modelUsage,
							permissionDenials: msg.permission_denials,
							...msg.structured_output === void 0 ? {} : { structuredOutput: msg.structured_output }
						}
					};
					await cacheResponse(cacheResult, response, "Claude Agent SDK");
					return response;
				} else return {
					error: `Claude Agent SDK call failed: ${msg.subtype}`,
					tokenUsage,
					cost,
					raw,
					sessionId,
					metadata: {
						skillCalls,
						toolCalls: toolCallsArray,
						numTurns: msg.num_turns,
						durationMs: msg.duration_ms,
						durationApiMs: msg.duration_api_ms,
						modelUsage: msg.modelUsage,
						permissionDenials: msg.permission_denials
					}
				};
			}
			return { error: "Claude Agent SDK call didn't return a result" };
		} catch (error) {
			if (error?.name === "AbortError" || callOptions?.abortSignal?.aborted) {
				logger.warn("Claude Agent SDK call aborted");
				return { error: "Claude Agent SDK call aborted" };
			}
			logger.error(`Error calling Claude Agent SDK: ${error}`);
			return { error: `Error calling Claude Agent SDK: ${error}` };
		} finally {
			if (isTempDir && workingDir) fs.rmSync(workingDir, {
				recursive: true,
				force: true
			});
			if (callOptions?.abortSignal && abortHandler) callOptions.abortSignal.removeEventListener("abort", abortHandler);
		}
	}
	toString() {
		return "[Anthropic Claude Agent SDK Provider]";
	}
	/**
	* For normal Claude Agent SDK support, just use the Anthropic API key
	* Users can also use Bedrock (with CLAUDE_CODE_USE_BEDROCK env var) or Vertex (with CLAUDE_CODE_USE_VERTEX env var)
	*/
	requiresApiKey() {
		return !(this.env?.CLAUDE_CODE_USE_BEDROCK || this.env?.CLAUDE_CODE_USE_VERTEX || getEnvString("CLAUDE_CODE_USE_BEDROCK") || getEnvString("CLAUDE_CODE_USE_VERTEX"));
	}
	getApiKey() {
		return this.config?.apiKey || this.env?.ANTHROPIC_API_KEY || getEnvString("ANTHROPIC_API_KEY");
	}
	async cleanup() {}
};
//#endregion
export { ClaudeCodeSDKProvider };

//# sourceMappingURL=claude-agent-sdk-DR86EFNY.js.map
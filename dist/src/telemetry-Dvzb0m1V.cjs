const require_logger = require("./logger-wcsrvnoS.cjs");
const require_fetch = require("./fetch-Gr9TColK.cjs");
const require_accounts = require("./accounts-CdxcY0FS.cjs");
let zod = require("zod");
require("posthog-node");
zod.z.object({
	event: zod.z.enum([
		"assertion_used",
		"command_used",
		"eval setup",
		"eval_ran",
		"feature_used",
		"funnel",
		"redteam discover",
		"redteam generate",
		"redteam init",
		"redteam poison",
		"redteam report",
		"redteam run",
		"redteam setup",
		"webui_action",
		"webui_api",
		"webui_page_view"
	]),
	packageVersion: zod.z.string().optional().prefault(require_fetch.VERSION),
	properties: zod.z.record(zod.z.string(), zod.z.union([
		zod.z.string(),
		zod.z.number(),
		zod.z.boolean(),
		zod.z.array(zod.z.string())
	]))
});
let posthogClient = null;
let isShuttingDown = false;
function getPostHogClient() {
	if (require_logger.getEnvBool("PROMPTFOO_DISABLE_TELEMETRY") || require_logger.getEnvBool("IS_TESTING")) return null;
	return posthogClient;
}
const TELEMETRY_TIMEOUT_MS = 1e3;
var Telemetry = class {
	telemetryDisabledRecorded = false;
	id;
	email;
	constructor() {
		this.id = require_accounts.getUserId();
		this.email = require_accounts.getUserEmail();
		this.identify();
	}
	async identify() {
		if (this.disabled || require_logger.getEnvBool("IS_TESTING")) return;
		const client = getPostHogClient();
		if (client) try {
			client.identify({
				distinctId: this.id,
				properties: {
					email: this.email,
					isLoggedIntoCloud: require_accounts.isLoggedIntoCloud(),
					authMethod: require_accounts.getAuthMethod(),
					isRunningInCi: require_logger.isCI()
				}
			});
			client.flush().catch(() => {});
		} catch (error) {
			require_logger.logger.debug(`PostHog identify error: ${error}`);
		}
	}
	get disabled() {
		return require_logger.getEnvBool("PROMPTFOO_DISABLE_TELEMETRY");
	}
	recordTelemetryDisabled() {
		if (!this.telemetryDisabledRecorded) {
			this.sendEvent("feature_used", { feature: "telemetry disabled" });
			this.telemetryDisabledRecorded = true;
		}
	}
	record(eventName, properties) {
		if (this.disabled) this.recordTelemetryDisabled();
		else this.sendEvent(eventName, properties);
	}
	sendEvent(eventName, properties) {
		const propertiesWithMetadata = {
			...properties,
			packageVersion: require_fetch.VERSION,
			isRunningInCi: require_logger.isCI()
		};
		const client = getPostHogClient();
		if (client && !require_logger.getEnvBool("IS_TESTING")) try {
			client.capture({
				distinctId: this.id,
				event: eventName,
				properties: propertiesWithMetadata
			});
			client.flush().catch(() => {});
		} catch (error) {
			require_logger.logger.debug(`PostHog capture error: ${error}`);
		}
		require_fetch.fetchWithProxy(require_fetch.R_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				event: eventName,
				environment: require_logger.getEnvString("NODE_ENV", "development"),
				email: this.email,
				meta: {
					user_id: this.id,
					...propertiesWithMetadata
				}
			})
		}).catch(() => {});
	}
	async shutdown() {
		if (isShuttingDown) return;
		const client = getPostHogClient();
		if (!client) return;
		isShuttingDown = true;
		try {
			await client.shutdown();
		} catch (error) {
			require_logger.logger.debug(`PostHog shutdown error: ${error}`);
		}
	}
	/**
	* This is a separate endpoint to save consent used only for redteam data synthesis for "harmful" plugins.
	*/
	async saveConsent(email, metadata) {
		try {
			const response = await require_fetch.fetchWithTimeout(require_fetch.CONSENT_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					metadata
				})
			}, TELEMETRY_TIMEOUT_MS);
			if (!response.ok) throw new Error(`Failed to save consent: ${response.statusText}`);
		} catch (err) {
			require_logger.logger.debug(`Failed to save consent: ${err.message}`);
		}
	}
};
const telemetry = new Telemetry();
const TELEMETRY_INSTANCE_KEY = Symbol.for("promptfoo.telemetry.instance");
const SHUTDOWN_HANDLER_KEY = Symbol.for("promptfoo.telemetry.shutdownHandler");
process[TELEMETRY_INSTANCE_KEY] = telemetry;
if (!process[SHUTDOWN_HANDLER_KEY]) {
	process[SHUTDOWN_HANDLER_KEY] = true;
	process.once("beforeExit", () => {
		const instance = process[TELEMETRY_INSTANCE_KEY];
		if (instance) instance.shutdown().catch(() => {});
	});
}
//#endregion
Object.defineProperty(exports, "Telemetry", {
	enumerable: true,
	get: function() {
		return Telemetry;
	}
});
Object.defineProperty(exports, "telemetry", {
	enumerable: true,
	get: function() {
		return telemetry;
	}
});

//# sourceMappingURL=telemetry-Dvzb0m1V.cjs.map
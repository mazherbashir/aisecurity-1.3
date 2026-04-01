#!/usr/bin/env node
import { C as getEnvBool, E as getEnvString, k as isCI, s as logger } from "./logger-D6YuF-jw.js";
import { E as CONSENT_ENDPOINT, O as R_ENDPOINT, P as VERSION, i as fetchWithTimeout, n as fetchWithProxy } from "./fetch-BYaLM5gl.js";
import { c as isLoggedIntoCloud, i as getAuthMethod, o as getUserEmail, s as getUserId } from "./accounts-CvaCJaak.js";
import "posthog-node";
import { z } from "zod";
//#region src/telemetry.ts
const TelemetryEventSchema = z.object({
	event: z.enum([
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
	packageVersion: z.string().optional().prefault(VERSION),
	properties: z.record(z.string(), z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.array(z.string())
	]))
});
let posthogClient = null;
let isShuttingDown = false;
function getPostHogClient() {
	if (getEnvBool("PROMPTFOO_DISABLE_TELEMETRY") || getEnvBool("IS_TESTING")) return null;
	return posthogClient;
}
const TELEMETRY_TIMEOUT_MS = 1e3;
var Telemetry = class {
	telemetryDisabledRecorded = false;
	id;
	email;
	constructor() {
		this.id = getUserId();
		this.email = getUserEmail();
		this.identify();
	}
	async identify() {
		if (this.disabled || getEnvBool("IS_TESTING")) return;
		const client = getPostHogClient();
		if (client) try {
			client.identify({
				distinctId: this.id,
				properties: {
					email: this.email,
					isLoggedIntoCloud: isLoggedIntoCloud(),
					authMethod: getAuthMethod(),
					isRunningInCi: isCI()
				}
			});
			client.flush().catch(() => {});
		} catch (error) {
			logger.debug(`PostHog identify error: ${error}`);
		}
	}
	get disabled() {
		return getEnvBool("PROMPTFOO_DISABLE_TELEMETRY");
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
			packageVersion: VERSION,
			isRunningInCi: isCI()
		};
		const client = getPostHogClient();
		if (client && !getEnvBool("IS_TESTING")) try {
			client.capture({
				distinctId: this.id,
				event: eventName,
				properties: propertiesWithMetadata
			});
			client.flush().catch(() => {});
		} catch (error) {
			logger.debug(`PostHog capture error: ${error}`);
		}
		fetchWithProxy(R_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				event: eventName,
				environment: getEnvString("NODE_ENV", "development"),
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
			logger.debug(`PostHog shutdown error: ${error}`);
		}
	}
	/**
	* This is a separate endpoint to save consent used only for redteam data synthesis for "harmful" plugins.
	*/
	async saveConsent(email, metadata) {
		try {
			const response = await fetchWithTimeout(CONSENT_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					metadata
				})
			}, TELEMETRY_TIMEOUT_MS);
			if (!response.ok) throw new Error(`Failed to save consent: ${response.statusText}`);
		} catch (err) {
			logger.debug(`Failed to save consent: ${err.message}`);
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
export { TelemetryEventSchema as n, telemetry as r, Telemetry as t };

//# sourceMappingURL=telemetry-BM-n0cIV.js.map
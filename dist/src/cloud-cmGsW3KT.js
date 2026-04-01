#!/usr/bin/env node
import { E as getEnvString, s as logger, x as getConfigDirectoryPath } from "./logger-D6YuF-jw.js";
import * as fs$1 from "fs";
import * as path$1 from "path";
import yaml from "js-yaml";
//#region src/globalConfig/globalConfig.ts
/**
* Functions for manipulating the global configuration file, which lives at
* ~/.promptfoo/promptfoo.yaml by default.
*/
function writeGlobalConfig(config) {
	fs$1.writeFileSync(path$1.join(getConfigDirectoryPath(true), "promptfoo.yaml"), yaml.dump(config));
}
function readGlobalConfig() {
	const configDir = getConfigDirectoryPath();
	const configFilePath = path$1.join(configDir, "promptfoo.yaml");
	let globalConfig = { id: crypto.randomUUID() };
	if (fs$1.existsSync(configFilePath)) {
		globalConfig = yaml.load(fs$1.readFileSync(configFilePath, "utf-8")) || {};
		if (!globalConfig?.id) {
			globalConfig = {
				...globalConfig,
				id: crypto.randomUUID()
			};
			writeGlobalConfig(globalConfig);
		}
	} else {
		if (!fs$1.existsSync(configDir)) fs$1.mkdirSync(configDir, { recursive: true });
		fs$1.writeFileSync(configFilePath, yaml.dump(globalConfig));
	}
	return globalConfig;
}
/**
* Merges the top-level keys into existing config.
* @param partialConfig New keys to merge into the existing config.
*/
function writeGlobalConfigPartial(partialConfig) {
	const updatedConfig = { ...readGlobalConfig() };
	Object.entries(partialConfig).forEach(([key, value]) => {
		if (value !== void 0 && value !== null) updatedConfig[key] = value;
		else delete updatedConfig[key];
	});
	writeGlobalConfig(updatedConfig);
}
//#endregion
//#region src/globalConfig/cloud.ts
const CLOUD_API_HOST = "https://api.promptfoo.app";
const API_HOST = getEnvString("API_HOST", CLOUD_API_HOST);
const SHARING_CUTOFF_DATE = /* @__PURE__ */ new Date("2026-03-09T00:00:00Z");
var CloudConfig = class {
	config;
	constructor() {
		const savedConfig = readGlobalConfig()?.cloud || {};
		this.config = {
			appUrl: savedConfig.appUrl || "https://www.promptfoo.app",
			apiHost: savedConfig.apiHost,
			apiKey: savedConfig.apiKey,
			sharing: savedConfig.sharing,
			currentOrganizationId: savedConfig.currentOrganizationId,
			currentTeamId: savedConfig.currentTeamId,
			teams: savedConfig.teams
		};
	}
	/**
	* Returns the API key from config file or PROMPTFOO_API_KEY environment variable.
	* Config file takes precedence over environment variable.
	*/
	resolveApiKey() {
		return this.config.apiKey || process.env.PROMPTFOO_API_KEY;
	}
	/**
	* Returns the API host from config file, PROMPTFOO_CLOUD_API_URL environment variable,
	* or defaults to the standard cloud API host.
	* Config file takes precedence over environment variable.
	*/
	resolveApiHost() {
		return this.config.apiHost || process.env.PROMPTFOO_CLOUD_API_URL || API_HOST;
	}
	isEnabled() {
		return !!this.resolveApiKey();
	}
	setApiHost(apiHost) {
		this.config.apiHost = apiHost;
		this.saveConfig();
	}
	setApiKey(apiKey) {
		this.config.apiKey = apiKey;
		this.saveConfig();
	}
	getApiKey() {
		return this.resolveApiKey();
	}
	getApiHost() {
		return this.resolveApiHost();
	}
	setAppUrl(appUrl) {
		this.config.appUrl = appUrl;
		this.saveConfig();
	}
	getAppUrl() {
		return this.config.appUrl;
	}
	getSharing() {
		return this.config.sharing;
	}
	/**
	* Sets the sharing preference. Note: this value is only updated at authentication time
	* (via `validateAndSetApiToken`) and may become stale if the user's license status
	* changes between re-authentications.
	*/
	setSharing(sharing) {
		this.config.sharing = sharing;
		this.saveConfig();
	}
	delete() {
		writeGlobalConfigPartial({ cloud: {} });
		this.reload();
	}
	saveConfig() {
		writeGlobalConfigPartial({ cloud: this.config });
		this.reload();
	}
	reload() {
		const savedConfig = readGlobalConfig()?.cloud || {};
		this.config = {
			appUrl: savedConfig.appUrl || "https://www.promptfoo.app",
			apiHost: savedConfig.apiHost,
			apiKey: savedConfig.apiKey,
			sharing: savedConfig.sharing,
			currentOrganizationId: savedConfig.currentOrganizationId,
			currentTeamId: savedConfig.currentTeamId,
			teams: savedConfig.teams
		};
	}
	async validateAndSetApiToken(token, apiHost) {
		try {
			const { fetchWithProxy } = await import("./fetch-CODkcq01.js");
			const response = await fetchWithProxy(`${apiHost}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } });
			if (!response.ok) {
				const errorMessage = await response.text();
				logger.error(`[Cloud] Failed to validate API token: ${errorMessage}. HTTP Status: ${response.status} - ${response.statusText}.`);
				throw new Error("Failed to validate API token: " + response.statusText);
			}
			const { user, organization, app, hasActiveLicense } = await response.json();
			this.setApiKey(token);
			this.setApiHost(apiHost);
			this.setAppUrl(app.url);
			if (typeof hasActiveLicense === "boolean") {
				const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
				const isGrandfathered = createdAt != null && createdAt < SHARING_CUTOFF_DATE;
				this.setSharing(hasActiveLicense || isGrandfathered);
			}
			return {
				user,
				organization,
				app,
				hasActiveLicense: typeof hasActiveLicense === "boolean" ? hasActiveLicense : false
			};
		} catch (err) {
			const error = err;
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(`[Cloud] Failed to validate API token with host ${apiHost}: ${errorMessage}`);
			if (error.cause) logger.error(`Cause: ${error.cause}`);
			throw error;
		}
	}
	getCurrentOrganizationId() {
		return this.config.currentOrganizationId;
	}
	setCurrentOrganization(organizationId) {
		this.config.currentOrganizationId = organizationId;
		this.saveConfig();
	}
	getCurrentTeamId(organizationId) {
		if (organizationId) return this.config.teams?.[organizationId]?.currentTeamId;
		return this.config.currentTeamId;
	}
	setCurrentTeamId(teamId, organizationId) {
		if (organizationId) {
			if (!this.config.teams) this.config.teams = {};
			if (!this.config.teams[organizationId]) this.config.teams[organizationId] = {};
			this.config.teams[organizationId].currentTeamId = teamId;
		} else this.config.currentTeamId = teamId;
		this.saveConfig();
	}
	clearCurrentTeamId(organizationId) {
		if (organizationId) {
			if (this.config.teams?.[organizationId]) delete this.config.teams[organizationId].currentTeamId;
		} else delete this.config.currentTeamId;
		this.saveConfig();
	}
	cacheTeams(teams, organizationId) {
		if (organizationId) {
			if (!this.config.teams) this.config.teams = {};
			if (!this.config.teams[organizationId]) this.config.teams[organizationId] = {};
			this.config.teams[organizationId].cache = teams.map((t) => ({
				id: t.id,
				name: t.name,
				slug: t.slug,
				lastFetched: (/* @__PURE__ */ new Date()).toISOString()
			}));
		}
		this.saveConfig();
	}
	getCachedTeams(organizationId) {
		if (organizationId) return this.config.teams?.[organizationId]?.cache;
	}
};
const cloudConfig = new CloudConfig();
//#endregion
export { cloudConfig as a, writeGlobalConfigPartial as c, SHARING_CUTOFF_DATE as i, CLOUD_API_HOST as n, readGlobalConfig as o, CloudConfig as r, writeGlobalConfig as s, API_HOST as t };

//# sourceMappingURL=cloud-cmGsW3KT.js.map
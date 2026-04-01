#!/usr/bin/env node
import { s as logger } from "./logger-D6YuF-jw.js";
//#region src/providers/providerRegistry.ts
/**
* Global registry of Python providers for cleanup on process exit.
* Ensures no zombie Python processes are left running.
*/
var ProviderRegistry = class {
	providers = /* @__PURE__ */ new Set();
	shutdownRegistered = false;
	register(provider) {
		this.providers.add(provider);
		if (!this.shutdownRegistered) {
			this.registerShutdownHandlers();
			this.shutdownRegistered = true;
		}
	}
	unregister(provider) {
		this.providers.delete(provider);
	}
	registerShutdownHandlers() {
		let shuttingDown = false;
		const shutdown = async (signal) => {
			if (shuttingDown) return;
			shuttingDown = true;
			logger.debug(`Received ${signal}, shutting down ${this.providers.size} Python providers...`);
			await Promise.all(Array.from(this.providers).map((p) => p.shutdown().catch((err) => {
				logger.error(`Error shutting down provider: ${err}`);
			})));
			logger.debug("Python provider shutdown complete");
		};
		process.once("SIGINT", () => void shutdown("SIGINT"));
		process.once("SIGTERM", () => void shutdown("SIGTERM"));
		process.once("beforeExit", () => void shutdown("beforeExit"));
	}
	async shutdownAll() {
		const results = await Promise.allSettled(Array.from(this.providers).map((p) => p.shutdown()));
		for (const result of results) if (result.status === "rejected") logger.warn(`Error shutting down provider: ${result.reason}`);
		this.providers.clear();
	}
};
const providerRegistry = new ProviderRegistry();
//#endregion
export { providerRegistry as t };

//# sourceMappingURL=providerRegistry-CBUe3pcb.js.map
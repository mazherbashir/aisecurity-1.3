const require_logger = require("./logger-wcsrvnoS.cjs");
const require_cache = require("./cache-B0ZDftz7.cjs");
let fs = require("fs");
fs = require_logger.__toESM(fs);
let path = require("path");
path = require_logger.__toESM(path);
let dedent = require("dedent");
dedent = require_logger.__toESM(dedent);
let crypto = require("crypto");
crypto = require_logger.__toESM(crypto);
//#region src/providers/agentic-utils.ts
/**
* Shared utilities for agentic providers (Claude Agent SDK, OpenCode SDK, etc.)
*
* These utilities handle common functionality needed by coding agent providers:
* - Working directory fingerprinting for cache key generation
* - Response caching with fingerprint support
*/
/**
* Timeout for working directory fingerprint generation (ms)
* Prevents hanging on extremely large directories
*/
const FINGERPRINT_TIMEOUT_MS = 2e3;
/**
* Get a fingerprint for a working directory to use as a cache key.
* Checks directory mtime and descendant file mtimes recursively.
*
* This allows for caching prompts that use the same working directory
* when the files haven't changed.
*
* @param workingDir - Absolute path to the working directory
* @returns SHA-256 hash fingerprint of the directory state
* @throws Error if fingerprinting times out or directory is inaccessible
*/
async function getWorkingDirFingerprint(workingDir) {
	const dirMtime = fs.default.statSync(workingDir).mtimeMs;
	const startTime = Date.now();
	const getAllFiles = (dir, files = []) => {
		if (Date.now() - startTime > FINGERPRINT_TIMEOUT_MS) throw new Error("Working directory fingerprint timed out");
		const entries = fs.default.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.default.join(dir, entry.name);
			if (entry.isDirectory()) getAllFiles(fullPath, files);
			else if (entry.isFile()) files.push(fullPath);
		}
		return files;
	};
	const fingerprintData = `dir:${dirMtime};files:${getAllFiles(workingDir).map((file) => {
		const stat = fs.default.statSync(file);
		return `${path.default.relative(workingDir, file)}:${stat.mtimeMs}`;
	}).sort().join(",")}`;
	return crypto.default.createHash("sha256").update(fingerprintData).digest("hex");
}
/**
* Generate a cache key from arbitrary data using SHA-256 hash
*
* @param prefix - Cache key prefix (provider identifier)
* @param data - Data to hash for the cache key
* @returns Prefixed SHA-256 hash cache key
*/
function generateCacheKey(prefix, data) {
	const stringified = JSON.stringify(data);
	return `${prefix}:${crypto.default.createHash("sha256").update(stringified).digest("hex")}`;
}
/**
* Initialize cache and check for cached response
*
* This handles the common caching pattern used by agentic providers:
* 1. Check if caching is enabled
* 2. Generate working directory fingerprint if needed
* 3. Generate cache key
* 4. Return cache configuration for use by the provider
*
* @param options - Cache options including prefix and working directory
* @param cacheKeyData - Data to include in the cache key
* @returns Cache configuration and optional cached response
*/
async function initializeAgenticCache(options, cacheKeyData) {
	if (!require_cache.isCacheEnabled()) return {
		shouldCache: false,
		shouldReadCache: false,
		shouldWriteCache: false
	};
	if (options.mcp && !options.cacheMcp) return {
		shouldCache: false,
		shouldReadCache: false,
		shouldWriteCache: false
	};
	let workingDirFingerprint = null;
	if (options.workingDir) try {
		workingDirFingerprint = await getWorkingDirFingerprint(options.workingDir);
	} catch (error) {
		require_logger.logger.error(dedent.default`Error getting working directory fingerprint for cache key - ${options.workingDir}: ${String(error)}

        Caching is disabled.`);
		return {
			shouldCache: false,
			shouldReadCache: false,
			shouldWriteCache: false
		};
	}
	const cache = await require_cache.getCache();
	const cacheKey = generateCacheKey(options.cacheKeyPrefix, {
		...cacheKeyData,
		workingDirFingerprint,
		...options.mcp ? { mcp: options.mcp } : {}
	});
	return {
		shouldCache: true,
		shouldReadCache: !options.bustCache,
		shouldWriteCache: true,
		cache,
		cacheKey,
		workingDirFingerprint
	};
}
/**
* Try to get a cached response
*
* @param cacheResult - Result from initializeAgenticCache
* @param debugContext - Context for debug logging (e.g., prompt preview)
* @returns Cached ProviderResponse if found, undefined otherwise
*/
async function getCachedResponse(cacheResult, debugContext) {
	if (!cacheResult.shouldReadCache || !cacheResult.cache || !cacheResult.cacheKey) return;
	try {
		const cachedResponse = await cacheResult.cache.get(cacheResult.cacheKey);
		if (cachedResponse) {
			require_logger.logger.debug(`Returning cached response${debugContext ? ` for ${debugContext}` : ""} (cache key: ${cacheResult.cacheKey})`);
			return {
				...JSON.parse(cachedResponse),
				cached: true
			};
		}
	} catch (error) {
		require_logger.logger.error(`Error getting cached response: ${String(error)}`);
	}
}
/**
* Cache a provider response
*
* @param cacheResult - Result from initializeAgenticCache
* @param response - The ProviderResponse to cache
* @param debugContext - Context for debug logging
*/
async function cacheResponse(cacheResult, response, debugContext) {
	if (!cacheResult.shouldWriteCache || !cacheResult.cache || !cacheResult.cacheKey) return;
	try {
		await cacheResult.cache.set(cacheResult.cacheKey, JSON.stringify(response));
	} catch (error) {
		require_logger.logger.error(`Error caching response${debugContext ? ` for ${debugContext}` : ""}: ${String(error)}`);
	}
}
//#endregion
Object.defineProperty(exports, "cacheResponse", {
	enumerable: true,
	get: function() {
		return cacheResponse;
	}
});
Object.defineProperty(exports, "generateCacheKey", {
	enumerable: true,
	get: function() {
		return generateCacheKey;
	}
});
Object.defineProperty(exports, "getCachedResponse", {
	enumerable: true,
	get: function() {
		return getCachedResponse;
	}
});
Object.defineProperty(exports, "initializeAgenticCache", {
	enumerable: true,
	get: function() {
		return initializeAgenticCache;
	}
});

//# sourceMappingURL=agentic-utils-DV8uR0yk.cjs.map
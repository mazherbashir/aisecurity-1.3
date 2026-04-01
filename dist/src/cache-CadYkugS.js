import { t as __exportAll } from "./chunk-DEq-mXcV.js";
import { C as getEnvString, S as getEnvInt, a as logger, b as getEnvBool, y as getConfigDirectoryPath } from "./logger-DWcVXa9k.js";
import { d as sleep, h as REQUEST_TIMEOUT_MS, n as fetchWithRetries } from "./fetch-JwctAM20.js";
import fs from "fs";
import path from "path";
import { createCache } from "cache-manager";
import { Keyv } from "keyv";
import { KeyvFile } from "keyv-file";
//#region src/util/fetch/errors.ts
/**
* Non-transient HTTP status codes that indicate the target is unavailable or misconfigured.
* These errors will not resolve on retry and should abort the scan immediately.
*
* - 401: Unauthorized - authentication required or invalid credentials
* - 403: Forbidden - valid credentials but access denied
* - 404: Not Found - target endpoint doesn't exist
* - 501: Not Implemented - server doesn't support the request method
*
* Excluded: 500 (often transient — server crashes, DB timeouts, deployment rollouts,
* or input-dependent bugs where one prompt triggers it but the next doesn't),
* 502/503/504 (typically transient gateway issues).
*/
const NON_TRANSIENT_HTTP_STATUSES = [
	401,
	403,
	404,
	501
];
function isNonTransientHttpStatus(status) {
	return NON_TRANSIENT_HTTP_STATUSES.includes(status);
}
function isTransientConnectionError(error) {
	if (!error) return false;
	const code = error.code;
	if (code === "ECONNRESET" || code === "EPIPE") return true;
	const message = (error.message ?? "").toLowerCase();
	if (message.includes("eproto") && (message.includes("wrong version number") || message.includes("self signed") || message.includes("unable to verify") || message.includes("unknown ca") || message.includes("cert"))) return false;
	return message.includes("bad record mac") || message.includes("eproto") || message.includes("econnreset") || message.includes("socket hang up");
}
//#endregion
//#region src/cache.ts
var cache_exports = /* @__PURE__ */ __exportAll({
	clearCache: () => clearCache,
	disableCache: () => disableCache,
	enableCache: () => enableCache,
	fetchWithCache: () => fetchWithCache,
	getCache: () => getCache,
	isCacheEnabled: () => isCacheEnabled
});
let cacheInstance;
let enabled = getEnvBool("PROMPTFOO_CACHE_ENABLED", true);
const cacheType = getEnvString("PROMPTFOO_CACHE_TYPE") || (getEnvString("NODE_ENV") === "test" ? "memory" : "disk");
/** Default cache TTL: 14 days in seconds */
const DEFAULT_CACHE_TTL_SECONDS = 3600 * 24 * 14;
/**
* Get the cache TTL in milliseconds.
* Reads from PROMPTFOO_CACHE_TTL environment variable (in seconds) or uses default.
*/
function getCacheTtlMs() {
	return getEnvInt("PROMPTFOO_CACHE_TTL", DEFAULT_CACHE_TTL_SECONDS) * 1e3;
}
function getCache() {
	if (!cacheInstance) {
		let cachePath = "";
		const stores = [];
		if (cacheType === "disk" && enabled) {
			cachePath = getEnvString("PROMPTFOO_CACHE_PATH") || path.join(getConfigDirectoryPath(), "cache");
			if (!fs.existsSync(cachePath)) {
				logger.info(`Creating cache folder at ${cachePath}.`);
				fs.mkdirSync(cachePath, { recursive: true });
			}
			const newCacheFile = path.join(cachePath, "cache.json");
			try {
				const keyv = new Keyv({
					store: new KeyvFile({ filename: newCacheFile }),
					ttl: getCacheTtlMs()
				});
				stores.push(keyv);
			} catch (err) {
				logger.warn(`[Cache] Failed to initialize disk cache: ${err.message}. Using memory cache instead.`);
			}
		}
		cacheInstance = createCache({
			stores,
			ttl: getCacheTtlMs(),
			refreshThreshold: 0
		});
	}
	return cacheInstance;
}
const inflightFetchResponses = /* @__PURE__ */ new Map();
function serializeFetchResponse(data, status, statusText, headers, latencyMs) {
	return JSON.stringify({
		data,
		status,
		statusText,
		headers,
		latencyMs
	});
}
function deserializeFetchResponse(response, cached, cache, cacheKey) {
	const parsedResponse = JSON.parse(response);
	return {
		cached,
		data: parsedResponse.data,
		status: parsedResponse.status,
		statusText: parsedResponse.statusText,
		headers: parsedResponse.headers,
		latencyMs: parsedResponse.latencyMs,
		deleteFromCache: async () => {
			await cache.del(cacheKey);
			logger.debug(`Evicted from cache: ${cacheKey}`);
		}
	};
}
async function fetchAndReadBody(url, options, timeout, maxRetries, isIdempotent) {
	const maxBodyRetries = isIdempotent ? 2 : 0;
	for (let bodyAttempt = 0; bodyAttempt <= maxBodyRetries; bodyAttempt++) {
		const fetchStart = Date.now();
		const resp = await fetchWithRetries(url, options, timeout, maxRetries);
		const fetchLatencyMs = Date.now() - fetchStart;
		try {
			return {
				respText: await resp.text(),
				resp,
				fetchLatencyMs
			};
		} catch (err) {
			if (isTransientConnectionError(err) && bodyAttempt < maxBodyRetries) {
				const backoffMs = Math.pow(2, bodyAttempt) * 1e3;
				logger.debug("[Cache] Body stream failed with transient error, retrying", {
					attempt: bodyAttempt + 1,
					maxRetries: maxBodyRetries,
					backoffMs,
					error: err?.message?.slice(0, 200)
				});
				await sleep(backoffMs);
				continue;
			}
			throw err;
		}
	}
	throw new Error("Exhausted body retries without returning or throwing");
}
async function prepareFetchResponse(url, options, timeout, maxRetries, isIdempotent, format) {
	const result = await fetchAndReadBody(url, options, timeout, maxRetries, isIdempotent);
	const response = result.resp;
	const responseText = result.respText;
	const fetchLatencyMs = result.fetchLatencyMs;
	const headers = Object.fromEntries(response.headers.entries());
	try {
		const parsedData = format === "json" ? JSON.parse(responseText) : responseText;
		const serializedResponse = serializeFetchResponse(parsedData, response.status, response.statusText, headers, fetchLatencyMs);
		if (!response.ok) return {
			response: responseText === "" ? serializeFetchResponse(`Empty Response: ${response.status}: ${response.statusText}`, response.status, response.statusText, headers, fetchLatencyMs) : serializedResponse,
			cacheable: false
		};
		if (format === "json" && parsedData?.error) {
			logger.debug(`Not caching ${url} because it contains an 'error' key: ${parsedData.error}`);
			return {
				response: serializedResponse,
				cacheable: false
			};
		}
		logger.debug(`Storing ${url} response in cache with latencyMs=${fetchLatencyMs}: ${serializedResponse}`);
		return {
			response: serializedResponse,
			cacheable: true
		};
	} catch (err) {
		throw new Error(`Error parsing response from ${url}: ${err.message}. Received text: ${responseText}`);
	}
}
async function fetchWithCache(url, options = {}, timeout = REQUEST_TIMEOUT_MS, format = "json", bust = false, maxRetries) {
	const method = (options.method ?? (url instanceof Request ? url.method : "GET")).toUpperCase();
	const isIdempotent = [
		"GET",
		"HEAD",
		"OPTIONS",
		"PUT",
		"DELETE"
	].includes(method);
	if (!enabled || bust) {
		const { respText, resp, fetchLatencyMs } = await fetchAndReadBody(url, options, timeout, maxRetries, isIdempotent);
		try {
			return {
				cached: false,
				data: format === "json" ? JSON.parse(respText) : respText,
				status: resp.status,
				statusText: resp.statusText,
				headers: Object.fromEntries(resp.headers.entries()),
				latencyMs: fetchLatencyMs,
				deleteFromCache: async () => {}
			};
		} catch {
			throw new Error(`Error parsing response as JSON: ${respText}`);
		}
	}
	const copy = Object.assign({}, options);
	delete copy.headers;
	const cacheKey = `fetch:v2:${url}:${JSON.stringify(copy)}`;
	const cache = await getCache();
	const cachedResponse = await cache.get(cacheKey);
	if (cachedResponse != null) {
		logger.debug(`Returning cached response for ${url}: ${cachedResponse}`);
		return deserializeFetchResponse(cachedResponse, true, cache, cacheKey);
	}
	let inflightResponse = inflightFetchResponses.get(cacheKey);
	if (!inflightResponse) {
		inflightResponse = (async () => {
			const preparedResponse = await prepareFetchResponse(url, options, timeout, maxRetries, isIdempotent, format);
			if (preparedResponse.cacheable) await cache.set(cacheKey, preparedResponse.response);
			return preparedResponse.response;
		})().finally(() => {
			inflightFetchResponses.delete(cacheKey);
		});
		inflightFetchResponses.set(cacheKey, inflightResponse);
	}
	return deserializeFetchResponse(await inflightResponse, false, cache, cacheKey);
}
function enableCache() {
	enabled = true;
}
function disableCache() {
	enabled = false;
}
async function clearCache() {
	inflightFetchResponses.clear();
	return getCache().clear();
}
function isCacheEnabled() {
	return enabled;
}
//#endregion
export { isCacheEnabled as a, isTransientConnectionError as c, getCache as i, disableCache as n, NON_TRANSIENT_HTTP_STATUSES as o, fetchWithCache as r, isNonTransientHttpStatus as s, cache_exports as t };

//# sourceMappingURL=cache-CadYkugS.js.map
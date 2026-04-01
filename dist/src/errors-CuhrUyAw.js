#!/usr/bin/env node
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
export { isNonTransientHttpStatus as n, isTransientConnectionError as r, NON_TRANSIENT_HTTP_STATUSES as t };

//# sourceMappingURL=errors-CuhrUyAw.js.map
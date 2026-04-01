import { createHash } from "crypto";
//#region src/util/createHash.ts
function sha256(str) {
	return createHash("sha256").update(str).digest("hex");
}
function randomSequence(length = 3) {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * 62));
	return result;
}
//#endregion
export { sha256 as n, randomSequence as t };

//# sourceMappingURL=createHash-DmPQkvBh.js.map
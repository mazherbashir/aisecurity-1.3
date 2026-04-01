require("./logger-wcsrvnoS.cjs");
let crypto = require("crypto");
//#region src/util/createHash.ts
function sha256(str) {
	return (0, crypto.createHash)("sha256").update(str).digest("hex");
}
function randomSequence(length = 3) {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * 62));
	return result;
}
//#endregion
Object.defineProperty(exports, "randomSequence", {
	enumerable: true,
	get: function() {
		return randomSequence;
	}
});
Object.defineProperty(exports, "sha256", {
	enumerable: true,
	get: function() {
		return sha256;
	}
});

//# sourceMappingURL=createHash-BDm5V8Xg.cjs.map
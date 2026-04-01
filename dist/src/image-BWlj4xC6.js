import { a as logger } from "./logger-DhVTSriR.js";
import { h as REQUEST_TIMEOUT_MS } from "./fetch-B8RXKmmr.js";
import { r as fetchWithCache } from "./cache-CTFAMBrM.js";
import { t as OpenAiGenericProvider } from "./openai-5MY9da9T.js";
import { s as formatOpenAiError } from "./util-BXGhj1dO.js";
import { t as ellipsize } from "./text-B_UCRPp2.js";
//#region src/providers/openai/image.ts
const DALLE2_VALID_SIZES = [
	"256x256",
	"512x512",
	"1024x1024"
];
const DALLE3_VALID_SIZES = [
	"1024x1024",
	"1792x1024",
	"1024x1792"
];
const GPT_IMAGE1_VALID_SIZES = [
	"1024x1024",
	"1024x1536",
	"1536x1024"
];
const DEFAULT_SIZE = "1024x1024";
const DALLE2_COSTS = {
	"256x256": .016,
	"512x512": .018,
	"1024x1024": .02
};
const DALLE3_COSTS = {
	standard_1024x1024: .04,
	standard_1024x1792: .08,
	standard_1792x1024: .08,
	hd_1024x1024: .08,
	hd_1024x1792: .12,
	hd_1792x1024: .12
};
const GPT_IMAGE1_COSTS = {
	low_1024x1024: .011,
	low_1024x1536: .016,
	low_1536x1024: .016,
	medium_1024x1024: .042,
	medium_1024x1536: .063,
	medium_1536x1024: .063,
	high_1024x1024: .167,
	high_1024x1536: .25,
	high_1536x1024: .25
};
const GPT_IMAGE1_MINI_COSTS = {
	low_1024x1024: .005,
	low_1024x1536: .006,
	low_1536x1024: .006,
	medium_1024x1024: .011,
	medium_1024x1536: .015,
	medium_1536x1024: .015,
	high_1024x1024: .036,
	high_1024x1536: .052,
	high_1536x1024: .052
};
const GPT_IMAGE1_5_COSTS = {
	low_1024x1024: .064,
	low_1024x1536: .096,
	low_1536x1024: .096,
	medium_1024x1024: .128,
	medium_1024x1536: .192,
	medium_1536x1024: .192,
	high_1024x1024: .192,
	high_1024x1536: .288,
	high_1536x1024: .288
};
function isGptImage1(model) {
	return model === "gpt-image-1" || model.startsWith("gpt-image-1-2025");
}
function isGptImage1Mini(model) {
	return model === "gpt-image-1-mini" || model.startsWith("gpt-image-1-mini-2025");
}
function isGptImage15(model) {
	return model === "gpt-image-1.5" || model.startsWith("gpt-image-1.5-2025");
}
function isGptImageModel(model) {
	return isGptImage1(model) || isGptImage1Mini(model) || isGptImage15(model);
}
function validateSizeForModel(size, model) {
	if (model === "dall-e-3" && !DALLE3_VALID_SIZES.includes(size)) return {
		valid: false,
		message: `Invalid size "${size}" for DALL-E 3. Valid sizes are: ${DALLE3_VALID_SIZES.join(", ")}`
	};
	if (model === "dall-e-2" && !DALLE2_VALID_SIZES.includes(size)) return {
		valid: false,
		message: `Invalid size "${size}" for DALL-E 2. Valid sizes are: ${DALLE2_VALID_SIZES.join(", ")}`
	};
	if (isGptImageModel(model) && size !== "auto" && !GPT_IMAGE1_VALID_SIZES.includes(size)) {
		let modelName = model;
		if (isGptImage15(model)) modelName = "GPT Image 1.5";
		else if (isGptImage1Mini(model)) modelName = "GPT Image 1 Mini";
		else if (isGptImage1(model)) modelName = "GPT Image 1";
		return {
			valid: false,
			message: `Invalid size "${size}" for ${modelName}. Valid sizes are: ${GPT_IMAGE1_VALID_SIZES.join(", ")}, auto`
		};
	}
	return { valid: true };
}
function getMimeTypeForOutputFormat(outputFormat) {
	switch (outputFormat) {
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}
function inferMimeTypeFromUrl(url) {
	try {
		const pathname = new URL(url).pathname.toLowerCase();
		if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
		if (pathname.endsWith(".webp")) return "image/webp";
		if (pathname.endsWith(".gif")) return "image/gif";
		if (pathname.endsWith(".svg")) return "image/svg+xml";
		if (pathname.endsWith(".png")) return "image/png";
	} catch {}
}
function buildStructuredImageOutputs(data, outputFormat) {
	if (!Array.isArray(data.data) || data.data.length === 0) return;
	return data.data.map((item) => {
		if (item.b64_json) {
			const mimeType = getMimeTypeForOutputFormat(outputFormat);
			return {
				data: `data:${mimeType};base64,${item.b64_json}`,
				mimeType
			};
		}
		if (item.url) {
			const mimeType = inferMimeTypeFromUrl(item.url);
			return mimeType ? {
				data: item.url,
				mimeType
			} : { data: item.url };
		}
		return null;
	}).filter((item) => item !== null);
}
function formatOutput(data, prompt, responseFormat, outputFormat) {
	if (responseFormat === "b64_json") {
		const b64Json = data.data[0].b64_json;
		if (!b64Json) return { error: `No base64 image data found in response: ${JSON.stringify(data)}` };
		return `data:${getMimeTypeForOutputFormat(outputFormat)};base64,${b64Json}`;
	} else {
		const url = data.data[0].url;
		if (!url) return { error: `No image URL found in response: ${JSON.stringify(data)}` };
		return `![${ellipsize(prompt.replace(/\r?\n|\r/g, " ").replace(/\[/g, "(").replace(/\]/g, ")"), 50)}](${url})`;
	}
}
function prepareRequestBody(model, prompt, size, responseFormat, config) {
	const body = {
		model,
		prompt,
		n: config.n || 1,
		size
	};
	if (!isGptImageModel(model)) body.response_format = responseFormat;
	if (model === "dall-e-3") {
		if ("quality" in config && config.quality) body.quality = config.quality;
		if ("style" in config && config.style) body.style = config.style;
	}
	if (isGptImageModel(model)) {
		if ("quality" in config && config.quality) body.quality = config.quality;
		if ("background" in config && config.background) body.background = config.background;
		if ("output_format" in config && config.output_format) body.output_format = config.output_format;
		if ("output_compression" in config && config.output_compression !== void 0) body.output_compression = config.output_compression;
		if ("moderation" in config && config.moderation) body.moderation = config.moderation;
	}
	return body;
}
function calculateImageCost(model, size, quality, n = 1) {
	const imageQuality = quality || "standard";
	if (model === "dall-e-3") return (DALLE3_COSTS[`${imageQuality}_${size}`] || DALLE3_COSTS["standard_1024x1024"]) * n;
	else if (model === "dall-e-2") return (DALLE2_COSTS[size] || DALLE2_COSTS["1024x1024"]) * n;
	else if (isGptImage1(model)) return (GPT_IMAGE1_COSTS[`${quality || "low"}_${size}`] || GPT_IMAGE1_COSTS["low_1024x1024"]) * n;
	else if (isGptImage1Mini(model)) return (GPT_IMAGE1_MINI_COSTS[`${quality || "low"}_${size}`] || GPT_IMAGE1_MINI_COSTS["low_1024x1024"]) * n;
	else if (isGptImage15(model)) return (GPT_IMAGE1_5_COSTS[`${quality || "low"}_${size}`] || GPT_IMAGE1_5_COSTS["low_1024x1024"]) * n;
	return .04 * n;
}
async function callOpenAiImageApi(url, body, headers, timeout) {
	return await fetchWithCache(url, {
		method: "POST",
		headers,
		body: JSON.stringify(body)
	}, timeout);
}
async function processApiResponse(data, prompt, responseFormat, cached, model, size, latencyMs, quality, n = 1, outputFormat) {
	if (data.error) {
		await data?.deleteFromCache?.();
		return { error: formatOpenAiError(data) };
	}
	try {
		const formattedOutput = formatOutput(data, prompt, responseFormat, outputFormat);
		if (typeof formattedOutput === "object") return formattedOutput;
		const cost = cached ? 0 : calculateImageCost(model, size, quality, n);
		return {
			output: formattedOutput,
			images: buildStructuredImageOutputs(data, outputFormat),
			cached,
			latencyMs,
			cost,
			...responseFormat === "b64_json" ? {
				isBase64: true,
				format: "json"
			} : {}
		};
	} catch (err) {
		await data?.deleteFromCache?.();
		return { error: `API error: ${String(err)}: ${JSON.stringify(data)}` };
	}
}
var OpenAiImageProvider = class extends OpenAiGenericProvider {
	config;
	constructor(modelName, options = {}) {
		super(modelName, options);
		this.config = options.config || {};
	}
	async callApi(prompt, context, _callApiOptions) {
		if (this.requiresApiKey() && !this.getApiKey()) throw new Error(this.getMissingApiKeyErrorMessage());
		const config = {
			...this.config,
			...context?.prompt?.config
		};
		const model = config.model || this.modelName;
		const operation = "operation" in config && config.operation || "generation";
		const responseFormat = isGptImageModel(model) ? "b64_json" : config.response_format || "url";
		if (operation !== "generation") return { error: `Only 'generation' operations are currently supported. '${operation}' operations are not implemented.` };
		const endpoint = "/images/generations";
		const size = config.size || DEFAULT_SIZE;
		const sizeValidation = validateSizeForModel(size, model);
		if (!sizeValidation.valid) return { error: sizeValidation.message };
		const body = prepareRequestBody(model, prompt, size, responseFormat, config);
		const headers = {
			"Content-Type": "application/json",
			...this.getApiKey() ? { Authorization: `Bearer ${this.getApiKey()}` } : {},
			...this.getOrganization() ? { "OpenAI-Organization": this.getOrganization() } : {},
			...config.headers
		};
		let data, status, statusText;
		let cached = false;
		let latencyMs;
		try {
			({data, cached, status, statusText, latencyMs} = await callOpenAiImageApi(`${this.getApiUrl()}${endpoint}`, body, headers, REQUEST_TIMEOUT_MS));
			if (status < 200 || status >= 300) return { error: `API error: ${status} ${statusText}\n${typeof data === "string" ? data : JSON.stringify(data)}` };
		} catch (err) {
			logger.error(`API call error: ${String(err)}`);
			await data?.deleteFromCache?.();
			return { error: `API call error: ${String(err)}` };
		}
		return processApiResponse(data, prompt, responseFormat, cached, model, size, latencyMs, config.quality, config.n || 1, "output_format" in config ? config.output_format : void 0);
	}
};
//#endregion
export { formatOutput as i, buildStructuredImageOutputs as n, callOpenAiImageApi as r, OpenAiImageProvider as t };

//# sourceMappingURL=image-BWlj4xC6.js.map
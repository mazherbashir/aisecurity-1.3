#!/usr/bin/env node
import { E as getEnvString, s as logger } from "./logger-D6YuF-jw.js";
import { m as REQUEST_TIMEOUT_MS, n as fetchWithProxy } from "./fetch-BYaLM5gl.js";
import { a as fetchWithCache } from "./cache-CFDO0XPw.js";
import { i as storeBlob } from "./blobs-CY5eb9fc.js";
import { n as isBlobStorageEnabled } from "./extractor-DYJwf4k1.js";
import { t as ellipsize } from "./text-Db-Wt2u2.js";
//#region src/providers/modelslab.ts
/**
* ModelsLab provider for text-to-image generation.
*
* Handles async polling: initial response may return {status: "processing"},
* in which case we poll the fetch endpoint until completion.
*
* API docs: https://docs.modelslab.com
*
* NOTE: ModelsLab uses key-in-body authentication (not Bearer header).
* The API key is sent as the "key" field in the JSON request body.
*/
const MODELSLAB_BASE_URL = "https://modelslab.com/api/v6";
const POLL_INTERVAL_MS = 3e3;
const MAX_POLL_ATTEMPTS = 60;
var ModelsLabImageProvider = class {
	modelName;
	apiKey;
	config;
	constructor(modelName, options = {}) {
		const { config, id, env } = options;
		this.modelName = modelName;
		this.apiKey = config?.apiKey || env?.MODELSLAB_API_KEY || getEnvString("MODELSLAB_API_KEY");
		const { apiKey: _apiKey, ...restConfig } = config ?? {};
		this.config = restConfig;
		this.id = id ? () => id : this.id;
	}
	id() {
		return `modelslab:image:${this.modelName}`;
	}
	toString() {
		return `[ModelsLab Image Provider ${this.modelName}]`;
	}
	async callApi(prompt, context, _callApiOptions) {
		if (!this.apiKey) return { error: "ModelsLab API key is not set. Set the MODELSLAB_API_KEY environment variable or add `apiKey` to the provider config." };
		const config = {
			...this.config,
			...context?.prompt?.config
		};
		const requestBody = {
			key: this.apiKey,
			model_id: this.modelName,
			prompt,
			width: config.width ?? 512,
			height: config.height ?? 512,
			num_inference_steps: config.num_inference_steps ?? 30,
			guidance_scale: config.guidance_scale ?? 7.5,
			samples: config.samples ?? 1,
			safety_checker: config.safety_checker ?? "no",
			enhance_prompt: config.enhance_prompt ?? "no"
		};
		if (config.negative_prompt) requestBody.negative_prompt = config.negative_prompt;
		if (config.seed !== void 0) requestBody.seed = config.seed;
		try {
			logger.debug("[ModelsLab] Image generation request", {
				model: this.modelName,
				prompt: ellipsize(prompt, 50)
			});
			const response = await fetchWithCache(`${MODELSLAB_BASE_URL}/images/text2img`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody)
			}, REQUEST_TIMEOUT_MS, "json", true);
			let data = response.data;
			let cached = response.cached;
			if (data.status === "processing") {
				const requestId = data.request_id ?? String(data.id);
				logger.debug("[ModelsLab] Image is processing, polling for result", {
					model: this.modelName,
					requestId
				});
				data = await this.pollForCompletion(requestId);
				cached = false;
			}
			if (data.status === "error") return {
				cached,
				error: `ModelsLab API error: ${data.message || "Unknown error"}`
			};
			if (data.status === "success") {
				if (!data.output || data.output.length === 0) return { error: "ModelsLab returned no image URLs" };
				const imageUrl = data.output[0];
				const { url: resolvedUrl, blobRef } = await this.maybeDownloadToBlob(imageUrl);
				return {
					output: `![${ellipsize(prompt.replace(/\r?\n|\r/g, " ").replace(/\[/g, "(").replace(/\]/g, ")"), 50)}](${resolvedUrl})`,
					cached,
					...blobRef && { metadata: {
						blobRef,
						blobHash: blobRef.hash
					} }
				};
			}
			return { error: `Unexpected ModelsLab response status: ${data.status}` };
		} catch (err) {
			return { error: `ModelsLab API call error: ${String(err)}` };
		}
	}
	async maybeDownloadToBlob(imageUrl) {
		if (!isBlobStorageEnabled()) return { url: imageUrl };
		try {
			const response = await fetchWithProxy(imageUrl);
			if (!response.ok) {
				logger.warn("[ModelsLab] Failed to download image for blob storage", {
					url: imageUrl,
					status: response.status
				});
				return { url: imageUrl };
			}
			const { ref } = await storeBlob(Buffer.from(await response.arrayBuffer()), response.headers.get("content-type")?.split(";")[0] || "image/png", {
				location: "response.output",
				kind: "image"
			});
			return {
				url: ref.uri,
				blobRef: ref
			};
		} catch (error) {
			logger.warn("[ModelsLab] Failed to store image as blob, using URL", {
				url: imageUrl,
				error: String(error)
			});
			return { url: imageUrl };
		}
	}
	async pollForCompletion(requestId) {
		const fetchUrl = `${MODELSLAB_BASE_URL}/images/fetch/${requestId}`;
		for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
			try {
				const data = (await fetchWithCache(fetchUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ key: this.apiKey })
				}, REQUEST_TIMEOUT_MS, "json", true)).data;
				logger.debug("[ModelsLab] Poll attempt", {
					attempt: attempt + 1,
					requestId,
					status: data.status
				});
				if (data.status === "success" || data.status === "error") return data;
			} catch (error) {
				logger.warn("[ModelsLab] Poll attempt failed", {
					attempt: attempt + 1,
					requestId,
					error: String(error)
				});
			}
		}
		return {
			status: "error",
			message: `ModelsLab image generation timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1e3}s`
		};
	}
};
//#endregion
export { ModelsLabImageProvider };

//# sourceMappingURL=modelslab-87AwyKKU.js.map
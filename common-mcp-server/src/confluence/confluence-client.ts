import axios, { AxiosInstance } from "axios";

function normalizeConfluenceBaseUrl(baseUrl: string): string {
	const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
	return trimmedBaseUrl.endsWith("/wiki") ? trimmedBaseUrl : `${trimmedBaseUrl}/wiki`;
}

function escapeCqlString(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export class ConfluenceClient {
	private client: AxiosInstance;

	constructor(baseUrl: string, email: string, token: string) {
		this.client = axios.create({
			baseURL: normalizeConfluenceBaseUrl(baseUrl),
			auth: {
				username: email,
				password: token,
			},
			headers: {
				Accept: "application/json",
			},
		});
	}

	async searchPages(query: string, limit = 25, spaceKey?: string) {
		const cqlParts = ["type = page", `text ~ "${escapeCqlString(query)}"`];

		if (spaceKey) {
			cqlParts.push(`space = "${escapeCqlString(spaceKey)}"`);
		}

		const response = await this.client.get("/rest/api/content/search", {
			params: {
				cql: cqlParts.join(" AND "),
				limit,
				expand: "space,version",
			},
		});

		return response.data;
	}

	async getPage(pageId: string) {
		const response = await this.client.get(`/rest/api/content/${pageId}`, {
			params: {
				expand: "body.storage,space,version,ancestors",
			},
		});

		return response.data;
	}

	async getPageVersionNumber(pageId: string): Promise<number> {
		const response = await this.client.get(`/rest/api/content/${pageId}`, {
			params: {
				expand: "version",
			},
		});

		const currentVersionNumber = response.data?.version?.number;
		if (typeof currentVersionNumber !== "number") {
			throw new Error(`Could not determine current version for Confluence page ${pageId}`);
		}

		return currentVersionNumber;
	}

	async createPage(spaceKey: string, title: string, body: string, parentPageId?: string) {
		const payload: Record<string, unknown> = {
			type: "page",
			title,
			space: { key: spaceKey },
			body: {
				storage: {
					value: body,
					representation: "storage",
				},
			},
		};

		if (parentPageId) {
			payload.ancestors = [{ id: parentPageId }];
		}

		const response = await this.client.post("/rest/api/content", payload, {
			headers: {
				"Content-Type": "application/json",
			},
		});

		return response.data;
	}

	async updatePage(pageId: string, title: string, body: string, versionNumber?: number) {
		const nextVersionNumber = versionNumber ?? (await this.getPageVersionNumber(pageId)) + 1;

		const response = await this.client.put(
			`/rest/api/content/${pageId}`,
			{
				id: pageId,
				type: "page",
				title,
				version: {
					number: nextVersionNumber,
				},
				body: {
					storage: {
						value: body,
						representation: "storage",
					},
				},
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		return response.data;
	}
}
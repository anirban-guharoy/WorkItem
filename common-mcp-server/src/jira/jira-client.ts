import axios, { AxiosInstance } from "axios";

export class JiraClient {
	private baseUrl: string;
	private client: AxiosInstance;

	constructor(baseUrl: string, email: string, token: string) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
		this.client = axios.create({
			baseURL: this.baseUrl,
			auth: {
				username: email,
				password: token,
			},
			headers: {
				Accept: "application/json",
			},
		});
	}

	async getIssues(projectKey: string, maxResults = 50) {
		const url = "/rest/api/3/search/jql";
		const data = {
			jql: `project = ${projectKey} AND type != Epic`,
			expand: "changelog",
			maxResults,
		};

		const searchResponse = await this.client.post(url, data);
		const searchResults = searchResponse.data;

		const issues = [];
		for (const issueSummary of searchResults.issues?.slice(0, maxResults) || []) {
			const issueKey = issueSummary.key;
			if (!issueKey) {
				continue;
			}

			try {
				const issueResponse = await this.client.get(`/rest/api/2/issue/${issueKey}`);
				if (issueResponse.status === 200) {
					issues.push(issueResponse.data);
				}
			} catch (error) {
				console.error(`Error fetching issue ${issueKey}:`, error instanceof Error ? error.message : String(error));
			}
		}

		return { issues };
	}

	async createIssue(projectKey: string, issueType: string, summary: string, description?: string) {
		const url = "/rest/api/3/issue";
		const data: any = {
			fields: {
				project: { key: projectKey },
				issuetype: { name: issueType },
				summary,
			},
		};

		if (description) {
			data.fields.description = {
				type: "doc",
				version: 1,
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: description }],
					},
				],
			};
		}

		const response = await this.client.post(url, data);
		return response.data;
	}

	async getIssue(issueKey: string) {
		const url = `/rest/api/3/issue/${issueKey}`;
		const params = {
			fields: "key,summary,description,status,assignee,reporter,created,updated",
		};

		const response = await this.client.get(url, { params });
		return response.data;
	}
}

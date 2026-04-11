export class FigmaClient {
	private apiBaseUrl = "https://api.figma.com/v1";

	constructor(private apiToken: string) {}

	private async request(path: string) {
		const response = await fetch(`${this.apiBaseUrl}${path}`, {
			headers: {
				"X-Figma-Token": this.apiToken,
			},
		});

		if (!response.ok) {
			throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	}

	async getProjectFiles(projectId: string) {
		return this.request(`/projects/${projectId}/files`);
	}

	async getTeamProjects(teamId: string) {
		return this.request(`/teams/${teamId}/projects`);
	}

	async getFile(fileKey: string) {
		return this.request(`/files/${fileKey}`);
	}

	async getFileNodes(fileKey: string, nodeIds: string[]) {
		const nodeIdsParam = nodeIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
		return this.request(`/files/${fileKey}/nodes?${nodeIdsParam}`);
	}

	async getStyles(fileKey: string) {
		return this.request(`/files/${fileKey}/styles`);
	}

	async getVariables(fileKey: string) {
		return this.request(`/files/${fileKey}/variables`);
	}
}

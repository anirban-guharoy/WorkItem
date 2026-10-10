import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";

type CatalogSearchResponse = {
  items?: unknown[];
  totalItems?: number;
  pageInfo?: unknown;
};

export class BackstageClient {
  private readonly baseUrl: string;
  private readonly scope: string;
  private readonly credential: TokenCredential;
  private readonly fetcher: typeof fetch;

  constructor(
    baseUrl: string,
    scope: string,
    credential: TokenCredential = new DefaultAzureCredential(),
    fetcher: typeof fetch = fetch
  ) {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("BACKSTAGE_BASE_URL must use HTTPS except for localhost development.");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("BACKSTAGE_BASE_URL must not contain credentials, a query, or a fragment.");
    }
    if (!scope.trim()) {
      throw new Error("BACKSTAGE_API_SCOPE must not be empty.");
    }

    this.baseUrl = url.toString().replace(/\/$/, "");
    this.scope = scope;
    this.credential = credential;
    this.fetcher = fetcher;
  }

  async searchEntities(filter: string, limit: number): Promise<CatalogSearchResponse> {
    const url = new URL(`${this.baseUrl}/api/catalog/entities/by-query`);
    url.searchParams.set("filter", filter);
    url.searchParams.set("limit", String(limit));

    return this.request<CatalogSearchResponse>(url);
  }

  async getEntity(kind: string, namespace: string, name: string): Promise<unknown> {
    const path = [kind, namespace, name].map(encodeEntitySegment).join("/");
    return this.request(new URL(`${this.baseUrl}/api/catalog/entities/by-name/${path}`));
  }

  private async request<T>(url: URL): Promise<T> {
    const token = await this.credential.getToken(this.scope);
    if (!token) {
      throw new Error("Microsoft Entra ID did not issue an access token for Backstage.");
    }

    const response = await this.fetcher(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.token}`,
      },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Backstage request failed with HTTP ${response.status} ${response.statusText}.`);
    }

    return (await response.json()) as T;
  }
}

function encodeEntitySegment(value: string): string {
  if (!value || value === "." || value === ".." || /[\\/]/.test(value)) {
    throw new Error("Backstage entity kind, namespace, and name must be valid path segments.");
  }
  return encodeURIComponent(value);
}

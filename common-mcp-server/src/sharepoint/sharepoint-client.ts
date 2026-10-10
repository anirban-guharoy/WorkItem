import axios from "axios";
import { OnBehalfOfCredential } from "@azure/identity";

type SharePointClientOptions = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userAssertion: string;
};

type DriveItem = {
  id?: string;
  name?: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  file?: { mimeType?: string };
  parentReference?: { driveId?: string; siteId?: string; path?: string };
};

type SearchHit = {
  resource?: DriveItem;
  summary?: string;
  rank?: number;
};

type GraphSearchResponse = {
  value?: Array<{
    hitsContainers?: Array<{
      total?: number;
      hits?: SearchHit[];
    }>;
  }>;
};

export class SharePointClient {
  private readonly options: SharePointClientOptions;

  constructor(options: SharePointClientOptions) {
    this.options = options;
  }

  async search(query: string, limit: number) {
    const credential = new OnBehalfOfCredential({
      tenantId: this.options.tenantId,
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
      userAssertionToken: this.options.userAssertion,
    });
    const graphToken = await credential.getToken("https://graph.microsoft.com/.default");
    if (!graphToken) {
      throw new Error("Microsoft Entra ID did not issue a Microsoft Graph token for SharePoint search.");
    }

    const response = await axios.post<GraphSearchResponse>(
      "https://graph.microsoft.com/v1.0/search/query",
      {
        requests: [
          {
            entityTypes: ["driveItem"],
            query: { queryString: query },
            from: 0,
            size: limit,
            fields: ["id", "name", "webUrl", "file", "lastModifiedDateTime", "parentReference"],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${graphToken.token}` } }
    );

    const containers = response.data.value?.flatMap((result) => result.hitsContainers ?? []) ?? [];
    const hits = containers.flatMap((container) => container.hits ?? []);

    return {
      total: containers.reduce((total, container) => total + (container.total ?? 0), 0),
      results: hits.map(({ resource, summary, rank }) => ({
        id: resource?.id,
        name: resource?.name,
        web_url: resource?.webUrl,
        summary,
        rank,
        mime_type: resource?.file?.mimeType,
        last_modified: resource?.lastModifiedDateTime,
        drive_id: resource?.parentReference?.driveId,
        site_id: resource?.parentReference?.siteId,
      })),
    };
  }
}
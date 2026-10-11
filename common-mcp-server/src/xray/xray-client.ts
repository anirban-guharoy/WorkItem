import axios, { AxiosInstance } from "axios";

export type XrayStep = {
  action: string;
  data?: string;
  result?: string;
};

export type NewTestCase = {
  summary: string;
  description?: string;
  test_type?: string;
  steps?: XrayStep[];
  gherkin?: string;
  labels?: string[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "given", "has", "have", "in", "is",
  "it", "of", "on", "or", "should", "that", "the", "then", "to", "user", "when", "will", "with", "shall", "must",
]);

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(-\d+)?$/;
const MAX_KEYWORDS = 12;

export function assertKey(value: string, label: string): void {
  if (!KEY_PATTERN.test(value)) {
    throw new Error(`${label} "${value}" is not a valid Jira key`);
  }
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((word) => !STOP_WORDS.has(word));
}

function topKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  for (const word of tokenize(text)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, MAX_KEYWORDS)
    .map(([word]) => word);
}

export class XrayClient {
  private client: AxiosInstance;
  private token?: { value: string; expiresAt: number };

  constructor(
    baseUrl: string,
    private clientId: string,
    private clientSecret: string
  ) {
    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ""),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      timeout: 60_000,
    });
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }

    const response = await this.client.post("/api/v2/authenticate", {
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const value = String(response.data);
    // Xray Cloud tokens are valid for 24 hours; refresh well before that.
    this.token = { value, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
    return value;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const token = await this.getToken();
    const response = await this.client.post(
      "/api/v2/graphql",
      { query, variables },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data?.errors?.length) {
      const messages = response.data.errors.map((e: { message: string }) => e.message).join("; ");
      throw new Error(`Xray GraphQL error: ${messages}`);
    }
    return response.data.data as T;
  }

  async searchSimilarTests(projectKey: string, acceptanceCriteria: string, maxResults: number) {
    assertKey(projectKey, "project_key");
    const keywords = topKeywords(acceptanceCriteria);
    if (keywords.length === 0) {
      throw new Error("acceptance_criteria does not contain any searchable terms");
    }

    const textClause = keywords.map((word) => `text ~ "${word}"`).join(" OR ");
    const jql = `project = ${projectKey} AND issuetype = Test AND (${textClause})`;

    const data = await this.graphql<{
      getTests: {
        total: number;
        results: Array<{
          issueId: string;
          testType?: { name: string };
          jira: { key: string; summary?: string; description?: unknown; labels?: string[] };
        }>;
      };
    }>(
      `query ($jql: String, $limit: Int!) {
        getTests(jql: $jql, limit: $limit) {
          total
          results {
            issueId
            testType { name }
            jira(fields: ["key", "summary", "description", "labels"])
          }
        }
      }`,
      { jql, limit: 100 }
    );

    const criteriaTerms = new Set(tokenize(acceptanceCriteria));
    const matches = data.getTests.results
      .map((test) => {
        const haystack = `${test.jira.summary ?? ""} ${
          typeof test.jira.description === "string" ? test.jira.description : ""
        }`;
        const testTerms = new Set(tokenize(haystack));
        let overlap = 0;
        for (const term of testTerms) {
          if (criteriaTerms.has(term)) overlap++;
        }
        const score = testTerms.size === 0 ? 0 : overlap / Math.sqrt(testTerms.size * criteriaTerms.size);
        return {
          key: test.jira.key,
          issueId: test.issueId,
          summary: test.jira.summary,
          testType: test.testType?.name,
          labels: test.jira.labels,
          similarity: Number(score.toFixed(3)),
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    return { jql, keywords, totalCandidates: data.getTests.total, matches };
  }

  private async getTestPlanIssueId(testPlanKey: string, projectKey?: string): Promise<{ issueId: string; project: string }> {
    assertKey(testPlanKey, "test_plan_key");
    const data = await this.graphql<{
      getTestPlans: { results: Array<{ issueId: string; jira: { key: string; project?: { key: string } } }> };
    }>(
      `query ($jql: String) {
        getTestPlans(jql: $jql, limit: 1) {
          results { issueId jira(fields: ["key", "project"]) }
        }
      }`,
      { jql: `key = ${testPlanKey}` }
    );

    const plan = data.getTestPlans.results[0];
    if (!plan) {
      throw new Error(`Test plan ${testPlanKey} was not found`);
    }
    const project = projectKey ?? plan.jira.project?.key ?? testPlanKey.split("-")[0];
    return { issueId: plan.issueId, project };
  }

  async createTestCases(testPlanKey: string, testCases: NewTestCase[], projectKey?: string) {
    if (projectKey) assertKey(projectKey, "project_key");
    const plan = await this.getTestPlanIssueId(testPlanKey, projectKey);

    const created: Array<{ key: string; issueId: string; summary: string }> = [];
    const failed: Array<{ summary: string; error: string }> = [];

    for (const testCase of testCases) {
      try {
        const testType = testCase.test_type ?? (testCase.gherkin ? "Cucumber" : "Manual");
        const fields: Record<string, unknown> = {
          summary: testCase.summary,
          project: { key: plan.project },
        };
        if (testCase.description) {
          fields.description = testCase.description;
        }
        if (testCase.labels?.length) {
          fields.labels = testCase.labels;
        }

        const data = await this.graphql<{
          createTest: { test: { issueId: string; jira: { key: string } } | null; warnings?: string[] };
        }>(
          `mutation ($testType: UpdateTestTypeInput, $steps: [CreateStepInput], $gherkin: String, $jira: JSON!) {
            createTest(testType: $testType, steps: $steps, gherkin: $gherkin, jira: $jira) {
              test { issueId jira(fields: ["key"]) }
              warnings
            }
          }`,
          {
            testType: { name: testType },
            steps: testType === "Manual" ? (testCase.steps ?? []) : undefined,
            gherkin: testType === "Cucumber" ? testCase.gherkin : undefined,
            jira: { fields },
          }
        );

        const test = data.createTest.test;
        if (!test) {
          throw new Error(data.createTest.warnings?.join("; ") || "Xray did not return a created test");
        }
        created.push({ key: test.jira.key, issueId: test.issueId, summary: testCase.summary });
      } catch (error) {
        failed.push({ summary: testCase.summary, error: error instanceof Error ? error.message : String(error) });
      }
    }

    let addedToPlan: string[] = [];
    let addToPlanWarning: string | undefined;
    if (created.length > 0) {
      try {
        const data = await this.graphql<{
          addTestsToTestPlan: { addedTests?: string[]; warning?: string };
        }>(
          `mutation ($issueId: String!, $testIssueIds: [String]!) {
            addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
              addedTests
              warning
            }
          }`,
          { issueId: plan.issueId, testIssueIds: created.map((t) => t.issueId) }
        );
        addedToPlan = data.addTestsToTestPlan.addedTests ?? [];
        addToPlanWarning = data.addTestsToTestPlan.warning;
      } catch (error) {
        addToPlanWarning = `Tests were created but could not be added to ${testPlanKey}: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }

    return { testPlan: testPlanKey, created, failed, addedToPlan, warning: addToPlanWarning };
  }
}

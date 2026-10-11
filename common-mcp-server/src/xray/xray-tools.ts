import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireServiceEnv } from "../common/config.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { NewTestCase, XrayClient } from "./xray-client.js";

const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS_LIMIT = 50;
const MAX_TEST_CASES = 50;
const DEFAULT_BASE_URL = "https://xray.cloud.getxray.app";

const xrayTools: Tool[] = [
  {
    name: "search-test-cases",
    description:
      "Search XRay for existing test cases similar to the given acceptance criteria. Returns matching tests ranked by similarity.",
    inputSchema: {
      type: "object",
      properties: {
        project_key: { type: "string", description: "Jira project key to search for tests in (e.g., PROJ)" },
        acceptance_criteria: { type: "string", description: "Acceptance criteria text to find similar test cases for" },
        max_results: {
          type: "number",
          description: `Maximum number of test cases to return (1-${MAX_RESULTS_LIMIT})`,
          default: DEFAULT_MAX_RESULTS,
        },
      },
      required: ["project_key", "acceptance_criteria"],
    },
  },
  {
    name: "create-test-cases",
    description: "Create a list of test cases in XRay and add them to the specified test plan (test schedule).",
    inputSchema: {
      type: "object",
      properties: {
        test_plan_key: { type: "string", description: "Issue key of the XRay test plan to add the tests to (e.g., PROJ-123)" },
        project_key: {
          type: "string",
          description: "Project to create the tests in. Defaults to the test plan's project.",
        },
        test_cases: {
          type: "array",
          description: `Test cases to create (1-${MAX_TEST_CASES})`,
          items: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Test case title" },
              description: { type: "string", description: "Test case description" },
              test_type: { type: "string", description: "Manual (default), Cucumber or Generic" },
              steps: {
                type: "array",
                description: "Steps for Manual tests",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    data: { type: "string" },
                    result: { type: "string", description: "Expected result" },
                  },
                  required: ["action"],
                },
              },
              gherkin: { type: "string", description: "Gherkin scenario for Cucumber tests" },
              labels: { type: "array", items: { type: "string" } },
            },
            required: ["summary"],
          },
        },
      },
      required: ["test_plan_key", "test_cases"],
    },
  },
];

function getClient(): XrayClient {
  const config = requireServiceEnv(["XRAY_CLIENT_ID", "XRAY_CLIENT_SECRET"], "XRay");
  return new XrayClient(process.env.XRAY_BASE_URL?.trim() || DEFAULT_BASE_URL, config.XRAY_CLIENT_ID, config.XRAY_CLIENT_SECRET);
}

export function getXrayTools(): Tool[] {
  return xrayTools;
}

function validateTestCases(value: unknown): NewTestCase[] | string {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TEST_CASES) {
    return `test_cases must be an array of 1-${MAX_TEST_CASES} items`;
  }
  for (const [index, item] of value.entries()) {
    const testCase = item as Partial<NewTestCase> | null;
    if (!testCase || typeof testCase.summary !== "string" || !testCase.summary.trim()) {
      return `test_cases[${index}].summary is required`;
    }
    if (testCase.steps !== undefined) {
      if (!Array.isArray(testCase.steps) || testCase.steps.some((s) => !s || typeof s.action !== "string" || !s.action)) {
        return `test_cases[${index}].steps must be an array of objects with an action`;
      }
    }
  }
  return value as NewTestCase[];
}

export async function handleXrayTool(toolName: string, args: unknown): Promise<ToolResult> {
  try {
    const client = getClient();
    const argsObj = (args as Record<string, unknown>) || {};

    switch (toolName) {
      case "search-test-cases": {
        const projectKey = argsObj.project_key;
        const criteria = argsObj.acceptance_criteria;
        const maxResults = argsObj.max_results === undefined ? DEFAULT_MAX_RESULTS : argsObj.max_results;
        if (typeof projectKey !== "string" || !projectKey || typeof criteria !== "string" || !criteria.trim()) {
          return failure("Error: project_key and acceptance_criteria are required");
        }
        if (typeof maxResults !== "number" || !Number.isInteger(maxResults) || maxResults < 1 || maxResults > MAX_RESULTS_LIMIT) {
          return failure(`Error: max_results must be an integer between 1 and ${MAX_RESULTS_LIMIT}`);
        }

        return success(await client.searchSimilarTests(projectKey, criteria, maxResults));
      }
      case "create-test-cases": {
        const testPlanKey = argsObj.test_plan_key;
        const projectKey = argsObj.project_key;
        if (typeof testPlanKey !== "string" || !testPlanKey) {
          return failure("Error: test_plan_key is required");
        }
        if (projectKey !== undefined && typeof projectKey !== "string") {
          return failure("Error: project_key must be a string");
        }
        const testCases = validateTestCases(argsObj.test_cases);
        if (typeof testCases === "string") {
          return failure(`Error: ${testCases}`);
        }

        return success(await client.createTestCases(testPlanKey, testCases, projectKey || undefined));
      }
      default:
        return failure(`Unknown XRay tool: ${toolName}`);
    }
  } catch (error) {
    return failure(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

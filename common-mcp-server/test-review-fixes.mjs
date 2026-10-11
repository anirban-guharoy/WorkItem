import assert from "node:assert/strict";
import test from "node:test";
import { handleFigmaTool } from "./dist/figma/figma-tools.js";
import { handleJiraTool } from "./dist/jira/jira-tools.js";

test("Figma token extraction reports API errors instead of returning empty tokens", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_API_TOKEN;
  process.env.FIGMA_API_TOKEN = "test-token";
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/styles")) {
      return Response.json({ meta: { styles: {} } });
    }
    return new Response("forbidden", { status: 403, statusText: "Forbidden" });
  };

  try {
    const result = await handleFigmaTool("figma_extract_design_tokens", { file_key: "test-file" });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /403 Forbidden/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_API_TOKEN;
    else process.env.FIGMA_API_TOKEN = originalToken;
  }
});

test("Jira issue retrieval rejects invalid and over-limit result counts", async () => {
  const originalEnvironment = {
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    token: process.env.JIRA_API_TOKEN,
  };
  process.env.JIRA_BASE_URL = "https://jira.example.com";
  process.env.JIRA_EMAIL = "test@example.com";
  process.env.JIRA_API_TOKEN = "test-token";

  try {
    for (const max_results of [0, -1, 1.5, 101, "10"]) {
      const result = await handleJiraTool("jira_get_issues", {
        project_key: "TEST",
        max_results,
      });
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /max_results must be an integer between 1 and 100/);
    }
  } finally {
    if (originalEnvironment.baseUrl === undefined) delete process.env.JIRA_BASE_URL;
    else process.env.JIRA_BASE_URL = originalEnvironment.baseUrl;
    if (originalEnvironment.email === undefined) delete process.env.JIRA_EMAIL;
    else process.env.JIRA_EMAIL = originalEnvironment.email;
    if (originalEnvironment.token === undefined) delete process.env.JIRA_API_TOKEN;
    else process.env.JIRA_API_TOKEN = originalEnvironment.token;
  }
});

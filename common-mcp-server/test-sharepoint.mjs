import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentEntraAssertion, runWithEntraAssertion } from "./dist/common/request-context.js";
import { handleSharePointTool, getSharePointTools } from "./dist/sharepoint/sharepoint-tools.js";

test("SharePoint search is registered with a required query", () => {
  const tool = getSharePointTools().find(({ name }) => name === "sharepoint_search");
  assert.ok(tool);
  assert.deepEqual(tool.inputSchema.required, ["query"]);
});

test("request-local Entra assertions stay isolated across concurrent requests", async () => {
  const assertions = await Promise.all(
    ["assertion-a", "assertion-b"].map((assertion) =>
      runWithEntraAssertion(assertion, async () => {
        await Promise.resolve();
        return getCurrentEntraAssertion();
      })
    )
  );

  assert.deepEqual(assertions, ["assertion-a", "assertion-b"]);
  assert.equal(getCurrentEntraAssertion(), undefined);
});

test("SharePoint search requires a remote Entra user assertion", async () => {
  const result = await handleSharePointTool("sharepoint_search", { query: "project notes" });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /remote MCP request authenticated with an Entra user token/);
});

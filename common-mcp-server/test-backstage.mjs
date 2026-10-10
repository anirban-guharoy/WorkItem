import assert from "node:assert/strict";
import test from "node:test";
import { BackstageClient } from "./dist/backstage/backstage-client.js";

function createCredential() {
  const requestedScopes = [];
  return {
    requestedScopes,
    async getToken(scope) {
      requestedScopes.push(scope);
      return { token: "backstage-access-token", expiresOnTimestamp: Date.now() + 60_000 };
    },
  };
}

test("Backstage catalog search uses app authentication and catalog filters", async () => {
  const credential = createCredential();
  let requestedUrl;
  let requestOptions;
  const client = new BackstageClient(
    "https://backstage.example.com/",
    "api://backstage-app/.default",
    credential,
    async (url, options) => {
      requestedUrl = new URL(url);
      requestOptions = options;
      return Response.json({ items: [{ kind: "Component", metadata: { name: "petstore" } }], totalItems: 1 });
    }
  );

  const result = await client.searchEntities("kind=component,metadata.name=petstore", 10);

  assert.equal(credential.requestedScopes[0], "api://backstage-app/.default");
  assert.equal(requestedUrl.pathname, "/api/catalog/entities/by-query");
  assert.equal(requestedUrl.searchParams.get("filter"), "kind=component,metadata.name=petstore");
  assert.equal(requestedUrl.searchParams.get("limit"), "10");
  assert.equal(requestOptions.headers.Authorization, "Bearer backstage-access-token");
  assert.deepEqual(result.items[0].metadata, { name: "petstore" });
});

test("Backstage entity lookup safely encodes the entity reference", async () => {
  const credential = createCredential();
  let requestedUrl;
  const client = new BackstageClient(
    "https://backstage.example.com",
    "api://backstage-app/.default",
    credential,
    async (url) => {
      requestedUrl = new URL(url);
      return Response.json({ kind: "Component", metadata: { name: "petstore" } });
    }
  );

  await client.getEntity("Component", "default", "pet store");

  assert.equal(requestedUrl.pathname, "/api/catalog/entities/by-name/Component/default/pet%20store");
  await assert.rejects(client.getEntity("Component", "default", ".."), /valid path segments/);
});

test("Backstage client rejects insecure remote URLs and surfaces HTTP errors", async () => {
  assert.throws(
    () => new BackstageClient("http://backstage.example.com", "api://backstage-app/.default"),
    /must use HTTPS/
  );
  assert.throws(
    () => new BackstageClient("https://backstage.example.com/?tenant=other", "api://backstage-app/.default"),
    /must not contain credentials, a query, or a fragment/
  );

  const client = new BackstageClient(
    "https://backstage.example.com",
    "api://backstage-app/.default",
    createCredential(),
    async () => new Response(null, { status: 403, statusText: "Forbidden" })
  );

  await assert.rejects(client.getEntity("Component", "default", "petstore"), /HTTP 403 Forbidden/);
});

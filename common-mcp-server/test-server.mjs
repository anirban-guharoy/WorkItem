import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import test from "node:test";

async function getAvailablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose()))
  );
  return port;
}

test("remote MCP publishes auth metadata and rejects unauthenticated requests", async () => {
  const port = await getAvailablePort();
  const publicUrl = `http://127.0.0.1:${port}/mcp`;
  const serverProcess = spawn(process.execPath, [resolve("dist/remote-server.js")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ENTRA_AUTH_ENABLED: "true",
      ENTRA_TENANT_ID: "test-tenant",
      ENTRA_CLIENT_ID: "test-client",
      MCP_PUBLIC_URL: publicUrl,
      MCP_HOST: "127.0.0.1",
      MCP_PORT: String(port),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  let serverOutput = "";
  serverProcess.stderr.setEncoding("utf8");
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  try {
    let metadataResponse;
    let lastError;
    const deadline = Date.now() + 5_000;

    while (Date.now() < deadline) {
      try {
        metadataResponse = await fetch(`http://127.0.0.1:${port}/.well-known/oauth-protected-resource`);
        break;
      } catch (error) {
        lastError = error;
        if (serverProcess.exitCode !== null) {
          throw new Error(`Remote MCP server exited before listening: ${serverOutput}`, { cause: error });
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
      }
    }

    assert.ok(metadataResponse, `Remote MCP did not start: ${serverOutput}. ${lastError ?? ""}`);
    assert.equal(metadataResponse.status, 200);
    const metadata = await metadataResponse.json();
    assert.equal(metadata.resource, publicUrl);
    assert.deepEqual(metadata.scopes_supported, ["api://test-client/access_as_user"]);

    const unauthenticatedResponse = await fetch(publicUrl);
    assert.equal(unauthenticatedResponse.status, 401);
  } finally {
    if (serverProcess.exitCode === null) {
      const exited = once(serverProcess, "exit");
      serverProcess.kill("SIGTERM");
      await exited;
    }
  }
});

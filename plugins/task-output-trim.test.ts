/**
 * Tests for task-output-trim plugin config loading.
 *
 * Run: npx ts-node --esm plugins/task-output-trim.test.ts
 *
 * Tests reset the module-level cache between each block via clearTrimConfigCache().
 */

import assert from "node:assert/strict";
import { loadTrimConfig, clearTrimConfigCache } from "./task-output-trim.ts";

// ---------------------------------------------------------------------------
// Helper: create a minimal mock client
// ---------------------------------------------------------------------------
function mockClient(configData: unknown): any {
  return {
    config: {
      get: async (_params: any) => {
        if (configData === undefined) {
          return { error: new Error("not found"), data: null };
        }
        return { error: null, data: configData };
      },
    },
    app: {
      log: async (_params: any) => {},
    },
  };
}

// ===========================================================================
// Caching
// ===========================================================================
{
  clearTrimConfigCache();
  let callCount = 0;
  const client: any = {
    config: {
      get: async (_params: any) => {
        callCount++;
        return { error: null, data: { agent: { "task-output-trim": { model: "a/b" } } } };
      },
    },
    app: {
      log: async (_params: any) => {},
    },
  };

  const r1 = await loadTrimConfig(client, "/tmp/test-cache");
  const r2 = await loadTrimConfig(client, "/tmp/test-cache");
  assert.equal(callCount, 1, "config.get should only be called once (cached second call)");
  assert.deepEqual(r1, r2);
  console.log("PASS: caching works");
}

// ===========================================================================
// Default config when config.get returns error
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient(undefined);
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.deepEqual(
    result,
    { model: { providerID: "opencode-go", modelID: "deepseek-v4-pro" }, summarize: null },
    "should return default model and null summarize when config.get errors",
  );
  console.log("PASS: default config on error");
}

// ===========================================================================
// Default config when config.get returns null data
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient(null);
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.deepEqual(
    result,
    { model: { providerID: "opencode-go", modelID: "deepseek-v4-pro" }, summarize: null },
    "should return default model and null summarize when data is null",
  );
  console.log("PASS: default config on null data");
}

// ===========================================================================
// Model spec parsing (valid "providerID/modelID")
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient({
    agent: {
      "task-output-trim": {
        model: "custom-provider/custom-model",
      },
    },
  });
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.deepEqual(
    result.model,
    { providerID: "custom-provider", modelID: "custom-model" },
    "should parse 'providerID/modelID' correctly",
  );
  console.log("PASS: model spec parsing");
}

// ===========================================================================
// Model spec with slash missing uses default
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient({
    agent: {
      "task-output-trim": {
        model: "no-slash-here",
      },
    },
  });
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.deepEqual(
    result.model,
    { providerID: "opencode-go", modelID: "deepseek-v4-pro" },
    "should fall back to default model when spec has no '/'",
  );
  console.log("PASS: model spec missing slash uses default");
}

// ===========================================================================
// Summarize allowlist parsing (valid string array)
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient({
    agent: {
      "task-output-trim": {
        summarize: ["code-explorer", "test-verifier"],
      },
    },
  });
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.deepEqual(
    result.summarize,
    ["code-explorer", "test-verifier"],
    "should parse summarize allowlist correctly",
  );
  console.log("PASS: summarize allowlist parsing");
}

// ===========================================================================
// Empty summarize array => null (no filtering)
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient({
    agent: {
      "task-output-trim": {
        summarize: [],
      },
    },
  });
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.strictEqual(result.summarize, null, "empty summarize array should become null (all allowed)");
  console.log("PASS: empty summarize array becomes null");
}

// ===========================================================================
// Both model and summarize together
// ===========================================================================
{
  clearTrimConfigCache();
  const client = mockClient({
    agent: {
      "task-output-trim": {
        model: "my-provider/my-model",
        summarize: ["agent-a", "agent-b"],
      },
    },
  });
  const result = await loadTrimConfig(client, "/tmp/test");
  assert.deepEqual(result.model, { providerID: "my-provider", modelID: "my-model" });
  assert.deepEqual(result.summarize, ["agent-a", "agent-b"]);
  console.log("PASS: model + summarize together");
}

// ===========================================================================
// Summary
// ===========================================================================
console.log("\nAll tests passed ✅");

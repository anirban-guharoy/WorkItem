import { AsyncLocalStorage } from "node:async_hooks";

const entraAssertionContext = new AsyncLocalStorage<string>();

export function runWithEntraAssertion<T>(assertion: string, operation: () => T): T {
  return entraAssertionContext.run(assertion, operation);
}

export function getCurrentEntraAssertion(): string | undefined {
  return entraAssertionContext.getStore();
}
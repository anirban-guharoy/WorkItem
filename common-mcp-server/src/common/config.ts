export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }

  return value;
}

export function requireServiceEnv(names: string[], serviceName: string): Record<string, string> {
  const values: Record<string, string> = {};
  const missing: string[] = [];

  for (const name of names) {
    const value = process.env[name]?.trim();
    if (!value) {
      missing.push(name);
      continue;
    }

    values[name] = value;
  }

  if (missing.length > 0) {
    throw new Error(`${serviceName} is not configured. Set ${missing.join(", ")}.`);
  }

  return values;
}
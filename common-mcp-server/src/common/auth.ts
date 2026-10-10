import { AccessToken, DeviceCodeCredential, DeviceCodeInfo } from "@azure/identity";
import { createRemoteJWKSet, decodeJwt, errors as joseErrors, jwtVerify, JWTPayload } from "jose";

const DEFAULT_SCOPES = ["https://graph.microsoft.com/User.Read"];
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const JWT_TIME_SKEW_SECONDS = 60;
const DEFAULT_ENTRA_JWKS_TENANT = "common";
const NATIVE_TOKEN_ENV_NAMES = ["ENTRA_ACCESS_TOKEN", "AZURE_ACCESS_TOKEN", "ENTRA_ID_TOKEN"] as const;
const entraJwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export type DeveloperIdentity = {
  email?: string;
  displayName?: string;
  objectId?: string;
  tenantId?: string;
};

export type EntraRemoteAuthConfig = {
  tenantId: string;
  clientId: string;
  scope: string;
  allowedUserEmails: string[];
};

export interface DeveloperAuthenticator {
  ensureAuthenticated(): Promise<void>;
  getIdentity(): DeveloperIdentity | null;
}

type EntraDeveloperAuthenticatorOptions = {
  tenantId?: string;
  clientId?: string;
  scopes: string[];
  allowedUserEmails: string[];
  allowedAudiences: string[];
};

type JwtClaims = JWTPayload & Record<string, unknown>;

class EntraDeveloperAuthenticator implements DeveloperAuthenticator {
  private readonly credential?: DeviceCodeCredential;
  private readonly scopes: string[];
  private readonly allowedUserEmails: Set<string>;
  private readonly tenantId?: string;
  private readonly allowedAudiences: Set<string>;
  private readonly useNativeToken: boolean;
  private cachedIdentity: DeveloperIdentity | null = null;
  private tokenExpiresAtMs = 0;
  private cachedRawToken: string | null = null;

  constructor({ tenantId, clientId, scopes, allowedUserEmails, allowedAudiences }: EntraDeveloperAuthenticatorOptions) {
    this.tenantId = tenantId;
    this.scopes = scopes;
    this.allowedUserEmails = new Set(allowedUserEmails.map((email) => email.toLowerCase()));
    this.allowedAudiences = new Set(allowedAudiences);
    this.useNativeToken = hasNativeTokenConfigured();

    if (!this.useNativeToken) {
      if (!tenantId || !clientId) {
        throw new Error(
          "Azure Entra authentication is enabled. Set ENTRA_ACCESS_TOKEN (or AZURE_ACCESS_TOKEN / ENTRA_ID_TOKEN) or configure ENTRA_TENANT_ID and ENTRA_CLIENT_ID."
        );
      }

      this.credential = new DeviceCodeCredential({
        tenantId,
        clientId,
        userPromptCallback: (info: DeviceCodeInfo) => {
          console.error("Azure Entra ID sign-in required for MCP access.");
          console.error(info.message);
        },
      });
    }
  }

  public async ensureAuthenticated(): Promise<void> {
    const now = Date.now();
    if (this.cachedIdentity && this.tokenExpiresAtMs - now > TOKEN_REFRESH_BUFFER_MS && !this.nativeTokenChanged()) {
      return;
    }

    if (this.useNativeToken) {
      const token = resolveNativeToken();
      if (!token) {
        throw new Error(
          `Azure Entra authentication is enabled but no native token was found. Set one of ${NATIVE_TOKEN_ENV_NAMES.join(", ")}.`
        );
      }

      this.cacheIdentityFromJwt(token);
      return;
    }

    if (!this.credential) {
      throw new Error("Azure Entra device-code authentication is not configured.");
    }

    const token = await this.credential.getToken(this.scopes);
    if (!token) {
      throw new Error("Unable to acquire an Azure Entra ID access token.");
    }

    this.cacheIdentityFromToken(token);
  }

  public getIdentity(): DeveloperIdentity | null {
    return this.cachedIdentity;
  }

  private nativeTokenChanged(): boolean {
    if (!this.useNativeToken) {
      return false;
    }

    return resolveNativeToken() !== this.cachedRawToken;
  }

  private async cacheIdentityFromJwt(rawToken: string): Promise<void> {
    const claims = await verifyNativeToken(rawToken, this.tenantId);
    validateTokenClaims(claims, this.tenantId, this.allowedAudiences);
    this.cachedRawToken = rawToken;
    this.cacheIdentityFromClaims(claims);

    const expirationSeconds = numericClaim(claims, "exp");
    this.tokenExpiresAtMs = expirationSeconds ? expirationSeconds * 1000 : 0;
  }

  private cacheIdentityFromToken(token: AccessToken): void {
    const claims = decodeJwtClaims(token.token);
    validateTokenClaims(claims, this.tenantId, this.allowedAudiences);
    this.cachedRawToken = token.token;
    this.cacheIdentityFromClaims(claims);
    this.tokenExpiresAtMs = token.expiresOnTimestamp;
  }

  private cacheIdentityFromClaims(claims: JwtClaims): void {
    const email = firstStringClaim(claims, ["preferred_username", "upn", "email", "unique_name"]);
    const objectId = firstStringClaim(claims, ["oid", "sub"]);
    const tenantId = firstStringClaim(claims, ["tid"]);
    const displayName = firstStringClaim(claims, ["name", "given_name"]);

    if (this.allowedUserEmails.size > 0) {
      const normalizedEmail = email?.toLowerCase();
      if (!normalizedEmail || !this.allowedUserEmails.has(normalizedEmail)) {
        throw new Error("Authenticated user is not authorized for this MCP server.");
      }
    }

    if (this.cachedIdentity?.objectId && objectId && this.cachedIdentity.objectId !== objectId) {
      throw new Error("A different Entra user attempted to use this running MCP server.");
    }

    this.cachedIdentity = {
      email,
      objectId,
      tenantId,
      displayName,
    };
  }
}

export function createDeveloperAuthenticatorFromEnv(): DeveloperAuthenticator | null {
  if (!isEnabled(process.env.ENTRA_AUTH_ENABLED)) {
    return null;
  }

  const tenantId = process.env.ENTRA_TENANT_ID?.trim();
  const clientId = process.env.ENTRA_CLIENT_ID?.trim();

  const scopes = parseCsv(process.env.ENTRA_SCOPES);
  const allowedUserEmails = parseCsv(process.env.ENTRA_ALLOWED_USER_EMAILS).map((email) => email.toLowerCase());
  const allowedAudiences = parseCsv(process.env.ENTRA_ALLOWED_TOKEN_AUDIENCES);

  return new EntraDeveloperAuthenticator({
    tenantId,
    clientId,
    scopes: scopes.length > 0 ? scopes : DEFAULT_SCOPES,
    allowedUserEmails,
    allowedAudiences,
  });
}

export function createEntraRemoteAuthConfigFromEnv(): EntraRemoteAuthConfig {
  const tenantId = process.env.ENTRA_TENANT_ID?.trim();
  const clientId = process.env.ENTRA_CLIENT_ID?.trim();
  if (!tenantId || !clientId) {
    throw new Error("Remote Entra authentication requires ENTRA_TENANT_ID and ENTRA_CLIENT_ID.");
  }

  return {
    tenantId,
    clientId,
    scope: process.env.ENTRA_API_SCOPE?.trim() || "access_as_user",
    allowedUserEmails: parseCsv(process.env.ENTRA_ALLOWED_USER_EMAILS).map((email) => email.toLowerCase()),
  };
}

export async function verifyEntraRemoteAccessToken(
  token: string,
  config: EntraRemoteAuthConfig
): Promise<DeveloperIdentity> {
  const jwks = getEntraJwks(config.tenantId);
  let claims: JwtClaims;

  try {
    const result = await jwtVerify(token, jwks, {
      issuer: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
      audience: config.clientId,
      clockTolerance: JWT_TIME_SKEW_SECONDS,
    });
    claims = result.payload as JwtClaims;
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      throw new Error("The Entra access token has expired.");
    }
    throw new Error("The Entra access token signature or claims are invalid.");
  }

  const tenantId = firstStringClaim(claims, ["tid"]);
  const objectId = firstStringClaim(claims, ["oid"]);
  const email = firstStringClaim(claims, ["preferred_username", "upn", "email"]);
  const scopes = firstStringClaim(claims, ["scp"])?.split(/\s+/) ?? [];

  if (tenantId !== config.tenantId || !objectId) {
    throw new Error("The Entra access token does not identify a user in the configured tenant.");
  }
  if (!numericClaim(claims, "exp")) {
    throw new Error("The Entra access token is missing its expiration claim.");
  }
  if (!scopes.includes(config.scope)) {
    throw new Error(`The Entra access token is missing the required delegated scope '${config.scope}'.`);
  }
  if (config.allowedUserEmails.length > 0 && (!email || !config.allowedUserEmails.includes(email.toLowerCase()))) {
    throw new Error("Authenticated user is not authorized for this MCP server.");
  }

  return {
    email,
    displayName: firstStringClaim(claims, ["name", "given_name"]),
    objectId,
    tenantId,
  };
}

function isEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function hasNativeTokenConfigured(): boolean {
  return resolveNativeToken() !== null;
}

function resolveNativeToken(): string | null {
  for (const envName of NATIVE_TOKEN_ENV_NAMES) {
    const value = process.env[envName]?.trim();
    if (!value) {
      continue;
    }

    return value.replace(/^Bearer\s+/i, "");
  }

  return null;
}

function decodeJwtClaims(token: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Received an invalid Entra access token.");
  }

  const payload = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(payload) as JwtClaims;
}

function firstStringClaim(claims: JwtClaims, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function numericClaim(claims: JwtClaims, key: string): number | undefined {
  const value = claims[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
}

function validateTokenClaims(claims: JwtClaims, expectedTenantId: string | undefined, allowedAudiences: Set<string>): void {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = numericClaim(claims, "exp");
  if (expiresAt && expiresAt <= nowSeconds + JWT_TIME_SKEW_SECONDS) {
    throw new Error("The supplied Entra token is expired or about to expire.");
  }

  const notBefore = numericClaim(claims, "nbf");
  if (notBefore && notBefore > nowSeconds + JWT_TIME_SKEW_SECONDS) {
    throw new Error("The supplied Entra token is not valid yet.");
  }

  const tokenTenantId = firstStringClaim(claims, ["tid"]);
  if (expectedTenantId && tokenTenantId && tokenTenantId !== expectedTenantId) {
    throw new Error("The supplied Entra token belongs to a different tenant.");
  }

  if (allowedAudiences.size > 0) {
    const audiences = getTokenAudiences(claims);
    const isAllowedAudience = audiences.some((audience) => allowedAudiences.has(audience));

    if (!isAllowedAudience) {
      throw new Error("The supplied Entra token audience is not authorized for this MCP server.");
    }
  }
}

function getTokenAudiences(claims: JwtClaims): string[] {
  const audienceClaim = claims["aud"];
  if (typeof audienceClaim === "string" && audienceClaim.trim().length > 0) {
    return [audienceClaim];
  }

  if (Array.isArray(audienceClaim)) {
    return audienceClaim.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }

  return [];
}

async function verifyNativeToken(token: string, expectedTenantId: string | undefined): Promise<JwtClaims> {
  let unverifiedClaims: JwtClaims;

  try {
    unverifiedClaims = decodeJwt(token) as JwtClaims;
  } catch {
    throw new Error("Received an invalid Entra access token.");
  }

  const tokenTenantId = firstStringClaim(unverifiedClaims, ["tid"]);
  const jwksTenant = expectedTenantId ?? tokenTenantId ?? DEFAULT_ENTRA_JWKS_TENANT;
  const jwks = getEntraJwks(jwksTenant);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      clockTolerance: JWT_TIME_SKEW_SECONDS,
    });

    return payload as JwtClaims;
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      throw new Error("The supplied Entra token is expired or about to expire.");
    }

    if (error instanceof joseErrors.JWTClaimValidationFailed) {
      throw new Error("The supplied Entra token failed validation.");
    }

    throw new Error("The supplied Entra token signature could not be verified.");
  }
}

function getEntraJwks(tenantId: string) {
  const normalizedTenantId = tenantId.trim().length > 0 ? tenantId.trim() : DEFAULT_ENTRA_JWKS_TENANT;
  const cachedJwks = entraJwksCache.get(normalizedTenantId);
  if (cachedJwks) {
    return cachedJwks;
  }

  const jwks = createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${encodeURIComponent(normalizedTenantId)}/discovery/v2.0/keys`)
  );
  entraJwksCache.set(normalizedTenantId, jwks);
  return jwks;
}
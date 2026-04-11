import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { requireServiceEnv } from "../common/config.js";
import { failure, success, type ToolResult } from "../common/mcp.js";
import { MongoDbVectorClient, type MongoVectorConfig } from "./mongodb-client.js";

const mongodbTools: Tool[] = [
	{
		name: "mongodb_vector_upsert",
		description: "Upsert a document and embedding into MongoDB for vector search",
		inputSchema: {
			type: "object",
			properties: {
				document_id: { type: "string", description: "Stable id for the vector document" },
				content: { type: "string", description: "Optional human-readable content stored with the embedding" },
				embedding: { type: "array", description: "Numeric embedding vector", items: { type: "number" } },
				metadata: { type: "object", description: "Optional metadata stored alongside the vector" },
			},
			required: ["document_id", "embedding"],
		},
	},
	{
		name: "mongodb_vector_search",
		description: "Run a vector similarity search against MongoDB",
		inputSchema: {
			type: "object",
			properties: {
				query_vector: { type: "array", description: "Numeric embedding vector to search with", items: { type: "number" } },
				limit: { type: "number", description: "Maximum number of matches to return", default: 5 },
				num_candidates: { type: "number", description: "Optional vector candidate pool size" },
				filter: { type: "object", description: "Optional MongoDB filter document applied during vector search" },
			},
			required: ["query_vector"],
		},
	},
	{
		name: "mongodb_vector_get_document",
		description: "Get a MongoDB vector document by id",
		inputSchema: {
			type: "object",
			properties: {
				document_id: { type: "string", description: "Vector document id" },
			},
			required: ["document_id"],
		},
	},
	{
		name: "mongodb_vector_delete_document",
		description: "Delete a MongoDB vector document by id",
		inputSchema: {
			type: "object",
			properties: {
				document_id: { type: "string", description: "Vector document id" },
			},
			required: ["document_id"],
		},
	},
];

function getClient(): MongoDbVectorClient {
	const config = requireServiceEnv(
		["MONGODB_URI", "MONGODB_DATABASE", "MONGODB_COLLECTION", "MONGODB_VECTOR_INDEX"],
		"MongoDB"
	);

	const vectorConfig: MongoVectorConfig = {
		uri: config.MONGODB_URI,
		database: config.MONGODB_DATABASE,
		collection: config.MONGODB_COLLECTION,
		vectorIndex: config.MONGODB_VECTOR_INDEX,
		embeddingField: process.env.MONGODB_EMBEDDING_FIELD?.trim() || "embedding",
		contentField: process.env.MONGODB_CONTENT_FIELD?.trim() || "content",
	};

	return new MongoDbVectorClient(vectorConfig);
}

function isNumberArray(value: unknown): value is number[] {
	return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

export function getMongoDbTools(): Tool[] {
	return mongodbTools;
}

export async function handleMongoDbTool(toolName: string, args: unknown): Promise<ToolResult> {
	try {
		const client = getClient();
		const argsObj = (args as Record<string, unknown>) || {};

		switch (toolName) {
			case "mongodb_vector_upsert": {
				const documentId = argsObj.document_id as string | undefined;
				const content = argsObj.content as string | undefined;
				const embedding = argsObj.embedding;
				const metadata = argsObj.metadata as Record<string, unknown> | undefined;

				if (!documentId || !isNumberArray(embedding)) {
					return failure("Error: document_id and a numeric embedding array are required");
				}

				return success(await client.upsertDocument(documentId, embedding, content, metadata));
			}
			case "mongodb_vector_search": {
				const queryVector = argsObj.query_vector;
				const limit = (argsObj.limit as number | undefined) || 5;
				const numCandidates = argsObj.num_candidates as number | undefined;
				const filter = argsObj.filter as Record<string, unknown> | undefined;

				if (!isNumberArray(queryVector)) {
					return failure("Error: query_vector must be a numeric embedding array");
				}

				return success(await client.vectorSearch(queryVector, limit, numCandidates, filter));
			}
			case "mongodb_vector_get_document": {
				const documentId = argsObj.document_id as string | undefined;
				if (!documentId) {
					return failure("Error: document_id is required");
				}

				return success(await client.getDocument(documentId));
			}
			case "mongodb_vector_delete_document": {
				const documentId = argsObj.document_id as string | undefined;
				if (!documentId) {
					return failure("Error: document_id is required");
				}

				return success(await client.deleteDocument(documentId));
			}
			default:
				return failure(`Unknown MongoDB tool: ${toolName}`);
		}
	} catch (error) {
		return failure(`Error: ${error instanceof Error ? error.message : String(error)}`);
	}
}
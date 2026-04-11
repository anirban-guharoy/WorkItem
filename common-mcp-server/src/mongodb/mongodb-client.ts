import { MongoClient, type Collection, type Document } from "mongodb";

type MongoVectorConfig = {
	uri: string;
	database: string;
	collection: string;
	vectorIndex: string;
	embeddingField: string;
	contentField: string;
};

type MongoVectorDocument = Document & {
	_id: string;
};

function toDocumentId(value: string): string {
	const trimmedValue = value.trim();
	if (!trimmedValue) {
		throw new Error("document_id must not be empty");
	}

	return trimmedValue;
}

export class MongoDbVectorClient {
	private static clients = new Map<string, MongoClient>();

	constructor(private config: MongoVectorConfig) {}

	private async getClient(): Promise<MongoClient> {
		const existingClient = MongoDbVectorClient.clients.get(this.config.uri);
		if (existingClient) {
			return existingClient;
		}

		const client = new MongoClient(this.config.uri);
		await client.connect();
		MongoDbVectorClient.clients.set(this.config.uri, client);
		return client;
	}

	private async getCollection(): Promise<Collection<MongoVectorDocument>> {
		const client = await this.getClient();
		return client.db(this.config.database).collection(this.config.collection);
	}

	async upsertDocument(documentId: string, embedding: number[], content?: string, metadata?: Record<string, unknown>) {
		const collection = await this.getCollection();
		const normalizedDocumentId = toDocumentId(documentId);

		await collection.updateOne(
			{ _id: normalizedDocumentId },
			{
				$set: {
					[this.config.embeddingField]: embedding,
					[this.config.contentField]: content ?? null,
					metadata: metadata ?? {},
					updatedAt: new Date().toISOString(),
				},
				$setOnInsert: {
					createdAt: new Date().toISOString(),
				},
			},
			{ upsert: true }
		);

		return this.getDocument(normalizedDocumentId);
	}

	async getDocument(documentId: string) {
		const collection = await this.getCollection();
		return collection.findOne({ _id: toDocumentId(documentId) });
	}

	async deleteDocument(documentId: string) {
		const collection = await this.getCollection();
		const result = await collection.deleteOne({ _id: toDocumentId(documentId) });
		return {
			acknowledged: result.acknowledged,
			deletedCount: result.deletedCount,
		};
	}

	async vectorSearch(queryVector: number[], limit = 5, numCandidates?: number, filter?: Record<string, unknown>) {
		const collection = await this.getCollection();
		const effectiveNumCandidates = numCandidates ?? Math.max(limit * 10, 20);

		const pipeline: Document[] = [
			{
				$vectorSearch: {
					index: this.config.vectorIndex,
					path: this.config.embeddingField,
					queryVector,
					numCandidates: effectiveNumCandidates,
					limit,
					...(filter ? { filter } : {}),
				},
			},
			{
				$project: {
					_id: 1,
					[this.config.contentField]: 1,
					metadata: 1,
					updatedAt: 1,
					score: { $meta: "vectorSearchScore" },
				},
			},
		];

		return collection.aggregate(pipeline).toArray();
	}
}

export type { MongoVectorConfig };
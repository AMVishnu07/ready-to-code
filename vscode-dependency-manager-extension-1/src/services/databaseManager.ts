import { MongoClient } from 'mongodb';
import { UserConfig, Dependency } from '../types';

export class DatabaseManager {
    private client: MongoClient;
    private dbName: string = 'dependencyManagerDB';
    private collectionName: string = 'dependencies';

    constructor(uri: string) {
        this.client = new MongoClient(uri);
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.close();
    }

    async storeDependencies(dependencies: Dependency[]) {
        const db = this.client.db(this.dbName);
        const collection = db.collection(this.collectionName);
        await collection.insertMany(dependencies);
    }

    async getDependencies(): Promise<Dependency[]> {
        const db = this.client.db(this.dbName);
        const collection = db.collection(this.collectionName);
        return await collection.find({}).toArray() as Dependency[];
    }

    async storeUserConfig(userConfig: UserConfig) {
        const db = this.client.db(this.dbName);
        const collection = db.collection('userConfig');
        await collection.updateOne({ userId: userConfig.userId }, { $set: userConfig }, { upsert: true });
    }

    async getUserConfig(userId: string): Promise<UserConfig | null> {
        const db = this.client.db(this.dbName);
        const collection = db.collection('userConfig');
        return await collection.findOne({ userId }) as UserConfig | null;
    }
}
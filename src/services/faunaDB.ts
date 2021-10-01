import faunaDB from 'faunadb';
import { Item } from '../common/interfaces';


const q = faunaDB.query;
const faunaClient = new faunaDB.Client({
    domain: process.env.FAUNA_DOMAIN,
    secret: process.env.FAUNA_KEY as string
});

interface FaunaDocument<T> {
    data: T;
    ts: number,
    ref: { id: string };
}
interface FaunaDocumentList<T> {
    data: FaunaDocument<T>[];
}

const db = {
    async readAllItems(roomId: string): Promise<Item[]> {
        // console.log('reading items');
        try {
            const items = (await faunaClient.query<FaunaDocumentList<Item>>(q.Map(q.Paginate(q.Documents(q.Collection(roomId))), q.Lambda(x => q.Get(x))))).data;
            return items.map(item => ({ ...item.data, id: item.ref.id }));
        } catch (e) {
            return e.description;
        }
    },
    async addItem(roomId: string, item: Item): Promise<Item> {
        // console.log(`adding new item type: ${item.type}`);
        try {
            const newItem = await faunaClient.query<FaunaDocument<Item>>(q.Create(q.Collection(roomId), { data: item }));
            return ({ ...newItem.data, id: newItem.ref.id });
        } catch (e) {
            return e.description;
        }
    },
    async removeItem(roomId: string, id: string): Promise<void> { 
        // console.log(`removing ${id}`);
        try {
            return faunaClient.query(q.Delete(q.Ref(q.Collection(roomId), id)));
        } catch (e) {
            return e.description;
        }
    },
    async editItem(roomId: string, { id, ...rest }: Item): Promise<Item> {
        // console.log(`editting item ${id}`);
        try {
            const newItem = await faunaClient.query<FaunaDocument<Item>>(q.Replace(q.Ref(q.Collection(roomId), id), { data: rest }));
            return ({ ...newItem.data, id: newItem.ref.id });
        } catch (e) {
            return e.description;
        }
    },
    async doesRoomExist(roomId: string): Promise<boolean> {
        // console.log(`checking room ${roomId}`);
        try {
            return faunaClient.query(q.Exists(q.Collection(roomId)));
        } catch (e) {
            return e.description;
        }
    },
    async createRoom(roomId: string): Promise<void> {
        // console.log(`creating ${roomId}`);
        try {
            await faunaClient.query(q.CreateCollection({ name: roomId, history_days: 2 }));
        } catch (e) {
            return e.description;
        }
    },
    async deleteRoom(roomId: string): Promise<void> {
        // console.log(`deleting room ${roomId}`);
        try {
            await faunaClient.query(q.Delete(q.Collection(roomId)));
        } catch (e) {
            return e.description;
        }
    }
};

export default db;
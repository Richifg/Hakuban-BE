import faunaDB from 'faunadb';
import { Item } from '../common/interfaces';

const q = faunaDB.query;
const faunaClient = new faunaDB.Client({
    domain: process.env.FAUNA_DOMAIN,
    secret: process.env.FAUNA_KEY as string,
});

interface FaunaDocument<T> {
    data: T;
    ts: number;
    ref: { id: string };
}
interface FaunaDocumentList<T> {
    data: FaunaDocument<T>[];
}

const db = {
    async readAllItems(roomId: string): Promise<Item[]> {
        // console.log('reading items');
        const items = (
            await faunaClient.query<FaunaDocumentList<Item>>(
                q.Map(
                    q.Paginate(q.Documents(q.Collection(roomId))),
                    q.Lambda((x) => q.Get(x)),
                ),
            )
        ).data;
        return items.map((item) => ({ ...item.data, id: item.ref.id }));
    },
    async addItem(roomId: string, item: Item): Promise<Item> {
        const { id, ...rest } = item;
        let editedItem: FaunaDocument<Item>;
        const itemExists = await faunaClient.query(q.Exists(q.Ref(q.Collection(roomId), id)));
        if (itemExists) {
            // console.log(`adding new item type: ${item.type}`);
            editedItem = await faunaClient.query<FaunaDocument<Item>>(
                q.Replace(q.Ref(q.Collection(roomId), id), { data: rest }),
            );
        } else {
            // console.log(`editing item: ${item.id}`);
            editedItem = await faunaClient.query<FaunaDocument<Item>>(
                q.Create(q.Ref(q.Collection(roomId), id), { data: item }),
            );
        }
        return { ...editedItem.data, id: editedItem.ref.id };
    },
    async removeItem(roomId: string, id: string): Promise<void> {
        // console.log(`removing ${id}`);
        return faunaClient.query(q.Delete(q.Ref(q.Collection(roomId), id)));
    },
    async doesRoomExist(roomId: string): Promise<boolean> {
        // console.log(`checking room ${roomId}`);
        return faunaClient.query(q.Exists(q.Collection(roomId)));
    },
    async createRoom(): Promise<string> {
        // console.log(`creating ${roomId}`);
        const roomId = (await faunaClient.query<string>(q.NewId())).substr(-5);
        await faunaClient.query(q.CreateCollection({ name: roomId, history_days: 5, ttl: 2 }));
        return roomId;
    },
    async deleteRoom(roomId: string): Promise<void> {
        // console.log(`deleting room ${roomId}`);
        await faunaClient.query(q.Delete(q.Collection(roomId)));
    },
};

export default db;

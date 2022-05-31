import faunaDB from 'faunadb';
import { Item, UpdateData } from '../common/interfaces';

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
    async getAllItems(roomId: string): Promise<Item[]> {
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
    async itemExists(roomId: string, id: string): Promise<boolean> {
        return faunaClient.query(q.Exists(q.Ref(q.Collection(roomId), id)));
    },
    async addItem(roomId: string, item: Item): Promise<Item> {
        const { id, ...rest } = item;
        let editedItem: FaunaDocument<Item>;
        if (id) {
            const itemExists = await this.itemExists(roomId, id);
            if (itemExists) {
                editedItem = await faunaClient.query<FaunaDocument<Item>>(
                    q.Replace(q.Ref(q.Collection(roomId), id), { data: rest }),
                );
            } else {
                editedItem = await faunaClient.query<FaunaDocument<Item>>(
                    q.Create(q.Ref(q.Collection(roomId), id), { data: item }),
                );
            }
            return { ...editedItem.data, id: editedItem.ref.id };
        } else throw 'New item has no id';
    },
    async updateItem(roomId: string, data: UpdateData): Promise<UpdateData> {
        const { id, ...rest } = data;
        const itemExists = await this.itemExists(roomId, id);
        if (itemExists) {
            const oldItem = await faunaClient.query<FaunaDocument<Item>>(q.Get(q.Ref(q.Collection(roomId), id)));
            await faunaClient.query<FaunaDocument<Item>>(
                q.Replace(q.Ref(q.Collection(roomId), id), { data: { ...oldItem.data, ...rest } }),
            );
            return data;
        } else throw `Item id:${id} does not exist`;
    },
    async removeItem(roomId: string, id: string): Promise<void> {
        return faunaClient.query(q.Delete(q.Ref(q.Collection(roomId), id)));
    },
    async doesRoomExist(roomId: string): Promise<boolean> {
        return faunaClient.query(q.Exists(q.Collection(roomId)));
    },
    async isPasswordCorrect(roomId: string, password?: string): Promise<boolean> {
        const roomPassword = (
            await faunaClient.query<FaunaDocument<{ password: string }>>(q.Get(q.Ref(q.Collection(roomId), 0)))
        ).data.password;
        return roomPassword === password;
    },
    async createRoom(password?: string): Promise<string> {
        const roomId = (await faunaClient.query<string>(q.NewId())).substr(-5);
        await faunaClient.query(q.CreateCollection({ name: roomId, history_days: 5, ttl: 2 }));
        await faunaClient.query(q.Create(q.Ref(q.Collection(roomId), 0), { data: { password } }));
        return roomId;
    },
    async deleteRoom(roomId: string): Promise<void> {
        await faunaClient.query(q.Delete(q.Collection(roomId)));
    },
};

export default db;

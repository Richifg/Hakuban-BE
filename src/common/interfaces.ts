
interface WSItemMessage {
    type: 'item',
    content: Item;
}

interface WSCollectionMessage {
    type: 'collection',
    content: Item[],
}

interface WSIdMessage {
    type: 'id',
    content: string;
}

interface WSChatMessage {
    type: 'chat',
    content: string;
    from: string;
}

interface WSErrorMessage {
    type: 'error',
    content: string;
}

// Messages sent via webSocket
export type WSMessage = WSItemMessage | WSCollectionMessage | WSIdMessage | WSChatMessage | WSErrorMessage;

interface ItemBase {
    id?: string;
    coordinates: string;
}

interface Note {
    type: 'note';
    content: string;
    height: number;
    width: number;
    color: string;
}

interface Text {
    type: 'text',
    content: string;
    fontSize: string;
    color: string;
}


// Items created by users
export type Item = ItemBase & (Note | Text)
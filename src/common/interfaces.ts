export interface Item {
    id?: string;
    creationDate?: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UpdateData = { id: string; [key: string]: any };

interface WSAddMessage {
    type: 'add';
    content: Item[];
}

interface WSUpdateMessage {
    type: 'update';
    content: UpdateData[];
}

interface WSDeleteMessage {
    type: 'delete';
    content: string[];
}

interface WSIdMessage {
    type: 'id';
    content: string;
}

interface WSChatMessage {
    type: 'chat';
    content: Item;
}

interface WSErrorMessage {
    type: 'error';
    content: string;
}

// Messages sent via webSocket
export type WSMessage = WSAddMessage | WSUpdateMessage | WSDeleteMessage | WSIdMessage | WSChatMessage | WSErrorMessage;

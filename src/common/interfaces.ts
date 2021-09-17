
// Items created by users
export interface NewItem {
    itemType: string;
    content: string;
    coordinates: string;
}
export interface Item extends NewItem {
    id: string;
}

// Messages sent through ws
export interface ErrorMessage {
    type: 'error';
    error: string;
}
export interface ItemMessage {
    type: 'item';
    item: Item;
}
export interface CollectionMessage {
    type: 'collection';
    items: Item[];
}

// TODO: find out how to merge types



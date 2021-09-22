
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
export interface Message {
    type: 'error' | 'item' | 'collection';
    error?: string;
    item?: Item;
    items?: Item[];
}

// TODO: find out how to merge types



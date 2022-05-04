import { LockData } from 'common/interfaces';

interface Room<User> {
    users: User[];
    password?: string;
    lockedItems: { [key: string]: string };
}

class RoomManager<User> {
    private activeRooms: { [key: string]: Room<User> };

    constructor() {
        this.activeRooms = {};
    }

    getActiveRoomIds(): string[] {
        return Object.keys(this.activeRooms);
    }

    getRoomUsers(roomId: string): User[] {
        return this.activeRooms[roomId].users || [];
    }

    createRoom(roomId: string, password?: string): void {
        this.activeRooms[roomId] = { users: [], password, lockedItems: {} };
    }

    deleteRoom(roomId: string, callBack?: (user: User) => void): void {
        callBack && this.activeRooms[roomId].users.forEach((user) => callBack(user));
        delete this.activeRooms[roomId];
    }

    addUser(roomId: string, user: User, password?: string): boolean {
        // create room first if it doesn't exist
        if (!this.activeRooms[roomId]) {
            this.createRoom(roomId, password);
        }
        const roomPassword = this.activeRooms[roomId].password;
        if (!roomPassword || roomPassword === password) {
            this.activeRooms[roomId].users.push(user);
            return true;
        }
        return false;
    }

    removeUser(roomId: string, userToRemove: User): void {
        if (this.activeRooms[roomId]) {
            this.activeRooms[roomId].users = this.activeRooms[roomId].users.filter((user) => user !== userToRemove);
        }
    }

    canEditItem(roomId: string, userId: string, itemId: string): boolean {
        if (this.activeRooms[roomId]) {
            const lockUser = this.activeRooms[roomId].lockedItems[itemId];
            return !lockUser || lockUser === userId;
        }
        return false;
    }

    toggleItemsLock(roomId: string, userId: string, lockData: LockData): string[] {
        const sucessfullIds: string[] = [];
        if (this.activeRooms[roomId]) {
            const { itemIds, lockState } = lockData;
            const lockedItems = { ...this.activeRooms[roomId].lockedItems };
            itemIds.forEach((id) => {
                const lockUser = lockedItems[id];
                if (lockState && !lockUser) {
                    lockedItems[id] = userId;
                    sucessfullIds.push(id);
                } else if (!lockState && lockUser === userId) {
                    delete lockedItems[id];
                    sucessfullIds.push(id);
                }
            });
            this.activeRooms[roomId].lockedItems = lockedItems;
        }
        return sucessfullIds;
    }
}

export default RoomManager;

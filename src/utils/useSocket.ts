import type { Socket } from 'socket.io';

import type { CoreParticipant, Participant } from '@events/login';

import { io } from '@index';

import { get, set } from './cache';

export default function useSocket(socket: Socket) {
    const rooms = Array.from(socket.rooms);
    const room = rooms[1];

    if (!room)
        return {
            error: 'Not in a room',
        };

    const socketId = socket.id;

    const prefix = `${room}`;

    let cachedParticipants: Participant[] | null = null;

    // creating a new function helps here since we actually want to use the cached value once per request
    async function getParticipants() {
        if (cachedParticipants !== null) return cachedParticipants;

        const socketRoomParticipants = ((await get(`${prefix}:users`)) ?? []) as Participant[];

        cachedParticipants = socketRoomParticipants;

        return socketRoomParticipants;
    }

    return {
        getRoomPtr: () => {
            return room;
        },
        isOwner: async () => {
            const socketRoomParticipants = await getParticipants();

            if (socketRoomParticipants) {
                const owner = socketRoomParticipants.find((user) => user.owner);
                if (owner?.sid == socketId) return true;
            }

            return false;
        },
        isModerator: async () => {
            const socketRoomParticipants = await getParticipants();

            if (socketRoomParticipants) {
                const mod = socketRoomParticipants.find((user) => user.sid == socketId);
                if (mod?.moderator) return true;
            }

            return false;
        },
        isPriviliged: async function () {
            return (await this.isOwner()) || (await this.isModerator());
        },
        isMuted: async () => {
            const mutedParticipants = ((await get(`${prefix}:mutedParticipants`)) ??
                []) as string[];
            const socketRoomParticipants = await getParticipants();

            if (socketRoomParticipants) {
                const currentUser = socketRoomParticipants.find((user) => user.sid == socketId);
                if (currentUser && mutedParticipants.includes(currentUser.id)) return true;
            }

            return false;
        },
        getParticipants: async () => {
            const socketRoomParticipants = await getParticipants();

            return socketRoomParticipants;
        },
        getCurrentUser: async (): Promise<Participant | null> => {
            const socketRoomParticipants = await getParticipants();

            if (socketRoomParticipants) {
                const currentUser = socketRoomParticipants.find((user) => user.sid == socketId);
                if (currentUser) return currentUser;
                else return null;
            }

            return null;
        },
        getUserFromId: async (id: string) => {
            const socketRoomParticipants = await getParticipants();

            if (socketRoomParticipants) {
                const user = socketRoomParticipants.find((user) => user.id == id);
                return user;
            }

            return null;
        },
        getMutedParticipants: async () => {
            const mutedParticipants = ((await get(`${prefix}:mutedParticipants`)) ??
                []) as string[];
            return mutedParticipants;
        },
        getBannedParticipants: async () => {
            const bannedParticipants = ((await get(`${prefix}:bannedParticipants`)) ??
                []) as CoreParticipant[];
            return bannedParticipants;
        },
        roomControlledByMods: async () => {
            const modRequired = (await get(`${prefix}:controlledByMods`)) ?? false;
            return modRequired;
        },
        getRoomKey: async (key: string) => {
            return get(`${prefix}:${key}`);
        },
        broadcastToEveryoneExceptAuthor: (event: string, data: any) => {
            socket.broadcast.to(room).emit(event, data);
        },
        broadcastToEveryone: (event: string, data: any) => {
            io.in(room).emit(event, data);
        },
        setRoomKey: async (key: string, value: any) => {
            await set(`${prefix}:${key}`, value);
        },
    };
}

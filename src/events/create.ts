import crypto from 'node:crypto';

import { Socket } from 'socket.io';
import { z } from 'zod';

import { chatBotProps, io } from '@index';
import { get, multipleSet, set } from '@utils/cache';
import sendSystemMessage from '@utils/systemMessage';
import { addTurkishPossessiveSuffix } from '@utils/turkishPossessiveSuffix';
import useSocket from '@utils/useSocket';

export type Participant = {
    id: string;
    username: string;
    avatar: string;
    avatarDecoration: number;
    owner: boolean;
    moderator: boolean;
    sid: string;
};

export type CoreParticipant = Omit<Participant, 'sid' | 'owner' | 'moderator'>;

export type SocketSession = {
    room: string;
    id: string;
    participant?: Participant;
};

export async function getParticipantsFromSocketRoom(room: string) {
    const roomSockets = io.sockets.adapter.rooms.get(room);
    if (!roomSockets) return [];

    const participants = await Promise.all(
        [...roomSockets].map(async (sid) => {
            const session = (await get(`sid:${sid}`)) as SocketSession | null;

            if (session?.room != room) return null;
            return session.participant ?? null;
        }),
    );

    return participants.filter((participant): participant is Participant => !!participant);
}

const validation = z.object({
    token: z.string().max(1000),
    anime: z.object({
        fansub: z.string().min(1).max(500),
        slug: z.string().min(1).max(500),
        season: z.number().int(),
        episode: z.number().int(),
    }),
    timestamp: z.number().nonnegative().optional(),
});

export default class CreateRoom {
    async handle({ socket, callback, data }: { socket: Socket; callback: any; data: any }) {
        const token = data?.token || socket.handshake.headers.authorization;

        const val = validation.safeParse({
            ...data,
            token,
        });

        if ('error' in val) {
            let err = val.error.issues[0].message;

            if (err == 'Required') err = 'Invalid body';
            return callback({ error: err });
        }

        const { anime, timestamp } = data;

        const user = (await fetch(`${process.env.API_URL}/user`, {
            headers: {
                Authorization: token,
                'Client-Protocol-Model': process.env.CLIENT_PROTOCOL_MODEL_VALUE,
            },
        })) as any;

        // allocate 4 bytes. in hex, a byte is represented by 2 chars so its n * 2 - so 8 chars.
        const roomId = 'room:' + crypto.randomBytes(4).toString('hex');

        const json = await user.json();
        if (!json?.id) return callback({ error: 'Kullanıcı verisi alınamadı' });

        let roomParticipants = ((await get(`${roomId}:users`)) ?? []) as Participant[];
        const participantsDefinedBySocketIO = io.sockets.adapter.rooms.get(roomId);

        if (participantsDefinedBySocketIO) {
            roomParticipants = roomParticipants.filter((participant) =>
                participantsDefinedBySocketIO.has(participant.sid),
            );

            if (roomParticipants.length == 0) {
                roomParticipants = await getParticipantsFromSocketRoom(roomId);
            }
        }

        if (roomParticipants && roomParticipants.find((user) => user.id == json.id)) {
            return callback({ error: 'Zaten bu odadasın' });
        }

        const roomName = `${addTurkishPossessiveSuffix(json.username)} odası`;

        const currentParticipant: Participant = {
            id: json.id,
            username: json.username,
            avatar: json.avatar,
            avatarDecoration: json?.avatarDecoration ?? 0,
            owner: true,
            moderator: true,
            sid: socket.id,
        };

        await multipleSet({
            [`${roomId}:users`]: [currentParticipant],
            [`${roomId}:timestamp`]: timestamp ?? 0,
            [`${roomId}:anime`]: anime,
            [`${roomId}:owner`]: json.id,
            [`${roomId}:password`]: null,
            [`${roomId}:bannedParticipants`]: [],
            [`${roomId}:mutedParticipants`]: [],
            [`${roomId}:controlledByMods`]: false,
            [`${roomId}:name`]: roomName,
        });

        await set(`sid:${socket.id}`, {
            room: roomId,
            id: json.id,
            participant: currentParticipant,
        });

        socket.join(roomId);

        sendSystemMessage(roomId, `${json.username} odaya katıldı 👋`);

        setTimeout(async () => {
            const hook = useSocket(socket);
            if (hook?.error) return;

            hook.broadcastToEveryone('participants', {
                participants: await hook.getParticipants(),
            });
        }, 1000);

        return callback({
            message: 'OK',
            details: {
                bannedParticipants: [],
                mutedParticipants: [],
                timestamp: timestamp ?? 0,
                roomId: roomId,
                roomName: roomName,
                controlledByMods: false,
            },
            system: chatBotProps,
        });
    }
}

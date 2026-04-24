import { Socket } from 'socket.io';
import { z } from 'zod';

import { io } from '@index';
import { get, multipleSet, set } from '@utils/cache';
import sendSystemMessage from '@utils/systemMessage';
import useSocket from '@utils/useSocket';

type Participant = {
    id: string;
    username: string;
    avatar: string;
    owner: boolean;
    moderator: boolean;
    sid: string;
};

type CoreParticipant = Omit<Participant, 'sid' | 'owner' | 'moderator'>;

const validation = z.object({
    token: z.string().max(1000),
    room: z
        .string()
        .trim()
        .min(2, { message: 'Oda adı en az 2 karakter olabilir' })
        .max(32, { message: 'Oda adı en fazla 32 karakter olabilir' }),
    password: z
        .string()
        .trim()
        .min(2, {
            message: 'Oda şifresi en az 2 karakter olabilir',
        })
        .max(32, {
            message: 'Oda şifresi en fazla 32 karakter olabilir',
        }),
    anime: z.object({
        fansub: z.string().min(1).max(500),
        slug: z.string().min(1).max(500),
        season: z.number().int(),
        episode: z.number().int(),
    }),
});

export default class Login {
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

        let { password, room } = data;
        const { anime } = data;

        const prefix = 'room:' + room;

        password = password.trim();
        room = room.trim();

        const user = (await fetch(`${process.env.API_URL}/user`, {
            headers: {
                Authorization: token,
                'Client-Protocol-Model': process.env.CLIENT_PROTOCOL_MODEL_VALUE,
            },
        })) as any;

        const json = await user.json();
        if (!json?.id) return callback({ error: 'Kullanıcı verisi alınamadı' });

        const roomParticipants = await get(`${prefix}:users`);
        if (roomParticipants && roomParticipants.find((user) => user.id == json.id)) {
            return callback({ error: 'Zaten bu odadasın' });
        }

        const getPass = await get(`${prefix}:password`);
        if (getPass && getPass != password) {
            return callback({ error: 'Yanlış şifre' });
        }

        const bannedParticipants = ((await get(`${prefix}:bannedParticipants`)) ??
            []) as CoreParticipant[];

        const banned = bannedParticipants.find((x) => x.id == json.id);
        if (banned) {
            return callback({ error: 'Bu odadan yasaklandınız' });
        }

        const getRoomAnimeInformation = await get(`${prefix}:anime`);
        const mutedParticipants = (await get(`${prefix}:mutedParticipants`)) ?? [];

        if (
            getRoomAnimeInformation &&
            JSON.stringify(getRoomAnimeInformation) != JSON.stringify(anime)
        ) {
            return callback({
                error: 'Bu oda başka bir anime izliyor',
                anime: getRoomAnimeInformation,
            });
        }

        const participantsDefinedBySocketIO = io.sockets.adapter.rooms.get(room);

        // If there is no clients inside the room, we should create a new room and make the user the owner of the room
        if (!participantsDefinedBySocketIO) {
            await multipleSet({
                [`${prefix}:users`]: [
                    {
                        id: json.id,
                        username: json.username,
                        avatar: json.avatar,
                        owner: true,
                        moderator: true,
                        sid: socket.id,
                    },
                ],
                [`${prefix}:timestamp`]: 0,
                [`${prefix}:anime`]: anime,
                [`${prefix}:owner`]: json.id,
                [`${prefix}:password`]: password,
                [`${prefix}:bannedParticipants`]: [],
                [`${prefix}:mutedParticipants`]: [],
                [`${prefix}:controlledByMods`]: false,
            });
        } else {
            const roomOwner = await get(`${prefix}:owner`);

            await set(`${prefix}:users`, [
                ...roomParticipants,
                {
                    id: json.id,
                    username: json.username,
                    avatar: json.avatar,
                    owner: roomOwner == json.id,
                    moderator: roomOwner == json.id,
                    sid: socket.id,
                },
            ]);
        }

        await set(`sid:${socket.id}`, {
            room,
            id: json.id,
        });

        socket.join(room);

        const lastTimestamp = (await get(`${prefix}:timestamp`)) ?? 0;
        sendSystemMessage(room, `${json.username} odaya katıldı 👋`);

        setTimeout(async () => {
            const hook = useSocket(socket);
            if (hook?.error) return;

            hook.broadcastToEveryone('participants', {
                participants: await hook.getParticipants(),
            });
        }, 1000);

        return callback({
            message: 'OK',
            details: { bannedParticipants, mutedParticipants, timestamp: lastTimestamp, room },
        });
    }
}

export { CoreParticipant, Participant };

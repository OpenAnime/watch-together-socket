import type { Server, Socket } from 'socket.io';

import type { Participant } from '@events/login';

import { del, delWithPattern, get } from '@utils/cache';
import useSocket from '@utils/useSocket';

type SocketSession = {
    room: string;
    id: string;
    participant?: Participant;
};

async function getParticipantsFromSocketIds(room: string, socketIds: string[]) {
    const participants = await Promise.all(
        socketIds.map(async (sid) => {
            const session = (await get(`sid:${sid}`)) as SocketSession | null;

            if (session?.room != room) return null;
            return session.participant ?? null;
        }),
    );

    return participants.filter((participant): participant is Participant => !!participant);
}

export default class Disconnect {
    async handle({ socket, io }: { socket: Socket; io: Server }) {
        const hook = useSocket(socket);
        if (hook?.error) return;

        const room = hook.getRoomPtr();
        const socketRoomParticipants = await hook.getParticipants();
        const remainingSocketIds = [...(io.sockets.adapter.rooms.get(room) ?? [])].filter(
            (sid) => sid != socket.id,
        );

        await del(`sid:${socket.id}`);

        if (socketRoomParticipants) {
            const newParticipants = socketRoomParticipants.filter((user) => user.sid != socket.id);

            if (newParticipants.length == 0) {
                const rebuiltParticipants = await getParticipantsFromSocketIds(
                    room,
                    remainingSocketIds,
                );

                if (rebuiltParticipants.length > 0) {
                    await hook.setRoomKey('users', rebuiltParticipants);

                    hook.broadcastToEveryone('participants', {
                        participants: rebuiltParticipants,
                    });

                    return;
                }

                if (remainingSocketIds.length == 0) {
                    await delWithPattern(`room:${room}:*`);
                }

                return;
            }

            await hook.setRoomKey('users', newParticipants);

            hook.broadcastToEveryone('participants', {
                participants: newParticipants,
            });

            return;
        }

        if (remainingSocketIds.length == 0) await delWithPattern(`room:${room}:*`);
    }
}

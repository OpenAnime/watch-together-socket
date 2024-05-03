import type { Server, Socket } from 'socket.io';

import { get, set } from '@utils/cache';
import sendSystemMessage from '@utils/systemMessage';

import { Participant } from './login';

export default class MakeModeratorOrTakeModerator {
    async handle({ socket, io, data }: { socket: Socket; io: Server; data: any }) {
        const targetUserId = data?.target;

        if (!targetUserId) return;

        const rooms = Array.from(socket.rooms);

        const room = rooms[1];

        if (!room) return;

        const socketId = socket.id;

        const socketRoomParticipants = (await get(`room:${room}:users`)) as Participant[];

        if (socketRoomParticipants) {
            const requestedBy = socketRoomParticipants.find((user) => user.sid == socketId);
            const targetUser = socketRoomParticipants.find((user) => user.id == targetUserId);

            if (requestedBy.owner) {
                const isTargetAlreadyMod = socketRoomParticipants.find(
                    (user) => user.id == targetUserId,
                )?.moderator;

                let newParticipants = [];

                if (isTargetAlreadyMod) {
                    //take mod
                    newParticipants = socketRoomParticipants.map((participant) => {
                        if (participant.id == targetUserId) {
                            return {
                                ...participant,
                                moderator: false,
                            };
                        }
                        return participant;
                    });

                    sendSystemMessage(
                        room,
                        `${requestedBy.username}, ${targetUser.username} kullanıcısının moderatör yetkisini aldı.`,
                    );
                } else {
                    //make mod
                    newParticipants = socketRoomParticipants.map((participant) => {
                        if (participant.id == targetUserId) {
                            return {
                                ...participant,
                                moderator: true,
                            };
                        }
                        return participant;
                    });

                    sendSystemMessage(
                        room,
                        `${requestedBy.username}, ${targetUser.username} kullanıcısını moderatör olarak atadı.`,
                    );
                }

                io.in(room).emit('participants', {
                    participants: newParticipants,
                });

                await set(`room:${room}:users`, newParticipants);
            }
        }
    }
}

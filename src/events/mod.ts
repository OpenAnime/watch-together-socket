import type { Socket } from 'socket.io';

import sendSystemMessage from '@utils/systemMessage';
import useSocket from '@utils/useSocket';

import { Participant } from './login';

export default class MakeModeratorOrTakeModerator {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const targetUserId = data?.target;
        if (!targetUserId) return;

        const hook = useSocket(socket);
        if (hook?.error) return;

        const currentUser = await hook.getCurrentUser();
        if (!currentUser.owner) return;

        const targetUser = await hook.getUserFromId(targetUserId);
        if (!targetUser) return;

        const participants = await hook.getParticipants();

        let newParticipants: Participant[] = [];

        if (targetUser.moderator) {
            // take mod

            newParticipants = participants.map((participant) => {
                if (participant.id == targetUserId) {
                    return {
                        ...participant,
                        moderator: false,
                    };
                }
                return participant;
            });

            sendSystemMessage(
                hook.getRoomPtr(),
                `${currentUser.username}, ${targetUser.username} kullanıcısının moderatör yetkisini aldı.`,
            );
        } else {
            // make mod

            newParticipants = participants.map((participant) => {
                if (participant.id == targetUserId) {
                    return {
                        ...participant,
                        moderator: true,
                    };
                }
                return participant;
            });

            sendSystemMessage(
                hook.getRoomPtr(),
                `${currentUser.username}, ${targetUser.username} kullanıcısını moderatör olarak atadı.`,
            );
        }

        hook.broadcastToEveryone('participants', {
            participants: newParticipants,
        });

        await hook.setRoomKey('users', newParticipants);
    }
}

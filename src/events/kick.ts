import type { Server, Socket } from 'socket.io';

import canDoModerationOperationOnTarget from '@utils/canDoModerationOperationOnTarget';
import sendSystemMessage from '@utils/systemMessage';
import useSocket from '@utils/useSocket';

export default class KickParticipant {
    async handle({ socket, io, data }: { socket: Socket; io: Server; data: any }) {
        const targetUserId = data?.target;
        if (!targetUserId) return;

        const hook = useSocket(socket);
        if (hook?.error) return;

        const room = hook.getRoomPtr();
        const mod = await hook.getCurrentUser();
        const targetUser = await hook.getUserFromId(targetUserId);

        if (canDoModerationOperationOnTarget(mod, targetUser)) {
            const getTargetSocket = io.sockets.sockets.get(targetUser.sid);
            getTargetSocket?.disconnect();

            sendSystemMessage(room, `${mod.username}, ${targetUser.username} kullanıcısını attı..`);
        }
    }
}

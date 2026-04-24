import type { Socket } from 'socket.io';

import useSocket from '@utils/useSocket';

export default class CreateMessage {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        if (
            'message' in data &&
            typeof data.message == 'string' &&
            data.message.trim().length > 0 &&
            data.message.trim().length <= 250
        ) {
            const hook = useSocket(socket);

            if (hook?.error) return;

            const currentUser = await hook.getCurrentUser();
            if (!currentUser) return;

            const muted = await hook.isMuted();
            if (muted) return;

            delete currentUser.sid;

            hook.broadcastToEveryone('message', {
                author: currentUser,
                content: data.message.trim(),
            });
        }
    }
}

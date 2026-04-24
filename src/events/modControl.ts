import type { Socket } from 'socket.io';

import useSocket from '@utils/useSocket';

export default class ChangeModeratorControl {
    async handle({ socket, data }: { socket: Socket; data: any }) {
        const controlledByMods = data?.controlledByMods;
        if (typeof controlledByMods !== 'boolean') return;

        const hook = useSocket(socket);

        if (hook?.error) return;

        const isOwner = await hook.isOwner();

        if (isOwner) {
            await hook.setRoomKey('controlledByMods', controlledByMods);

            hook.broadcastToEveryone('modControl', {
                controlledByMods,
            });
        }
    }
}

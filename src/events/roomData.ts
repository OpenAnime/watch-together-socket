import { Socket } from 'socket.io';
import { z } from 'zod';

import { addTurkishPossessiveSuffix } from '@utils/turkishPossessiveSuffix';
import useSocket from '@utils/useSocket';

const validation = z.object({
    name: z
        .string()
        .trim()
        .max(32, { message: 'Oda adı en fazla 32 karakter olabilir' })
        .optional(),
    password: z
        .string()
        .trim()
        .max(32, {
            message: 'Oda şifresi en fazla 32 karakter olabilir',
        })
        .optional(),
    controlledByMods: z.boolean().optional(),
    resend: z.boolean().optional(),
});

export default class UpdateRoomData {
    async handle({ socket, callback, data }: { socket: Socket; callback: any; data: any }) {
        const val = validation.safeParse(data);

        if ('error' in val) {
            let err = val.error.issues[0].message;

            if (err == 'Required') err = 'Invalid body';
            return callback({ error: err });
        }

        const { name, password, controlledByMods, resend } = val.data;

        const hook = useSocket(socket);

        const isOwner = await hook?.isOwner();

        if (!isOwner) {
            return callback({ error: 'Unauthorized' });
        }

        if (typeof controlledByMods === 'boolean') {
            hook.setRoomKey('controlledByMods', controlledByMods);

            hook.broadcastToEveryone('modControl', {
                controlledByMods,
            });
        }

        if (typeof name === 'string' && !name.length) {
            const currentUser = await hook.getCurrentUser();
            if (currentUser) {
                const newName = `${addTurkishPossessiveSuffix(currentUser.username)} odası`;
                hook.setRoomKey('name', newName);

                // we use resend when the menu flyout is closing to not interfere with the reactivity of the room name input on frontend
                if (resend) {
                    hook?.broadcastToEveryone('roomNameUpdated', {
                        name: newName,
                    });
                } else {
                    hook?.broadcastToEveryoneExceptAuthor('roomNameUpdated', {
                        name: newName,
                    });
                }
            }
        } else if (name) {
            hook?.setRoomKey('name', name);

            hook?.broadcastToEveryoneExceptAuthor('roomNameUpdated', {
                name,
            });
        }

        if (typeof password === 'string') {
            hook?.setRoomKey('password', !password.length ? null : password);
        }
    }
}

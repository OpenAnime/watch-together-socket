import { promises as fs } from 'fs';
import { Server, Socket } from 'socket.io';

const functions = [];

export default async function traverseEvents() {
    const files = await fs.readdir('./dist/events');

    for (const file of files) {
        const filePath = './events/' + file.replace('.ts', '.js');

        const { default: defaultFn } = await import(filePath);

        /* functions.push((socket: Socket, io: Server) => {
            socket.on(file.replace('.ts', ''), (data = {}, callback) => {
                defaultFn({ socket, callback, io, data });
            });
        });*/

        functions.push((socket: Socket, io: Server) => {
            const instance = new defaultFn();

            if (instance.handle.constructor.name == 'AsyncFunction') {
                socket.on(file.replace('.js', ''), (data = {}, callback) => {
                    instance.handle({ socket, callback, io, data }).catch((err) => {
                        if (callback) {
                            callback({ error: err.message });
                        }
                    });
                });
            } else {
                socket.on(file.replace('.js', ''), (data = {}, callback) => {
                    try {
                        instance.handle({ socket, callback, io, data });
                    } catch (err) {
                        if (callback) {
                            callback({ error: err.message });
                        }
                    }
                });
            }
        });
    }

    return functions;
}

import Redis from 'ioredis';
import { Server } from 'socket.io';
import { App } from 'uWebSockets.js';

import RapidEnv from 'rapidenv';

RapidEnv().load();

import { delWithPattern } from '@utils/cache';

import traverseEvents from './router';
import { info, success, warn } from './utils/logger';

const app = App();
const io = new Server();

const PORT = +process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const redis = new Redis({
    port: +process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: +process.env.REDIS_DB,
});

info('Connecting to Redis...');
await new Promise((resolve) => redis.on('connect', resolve));

// remove existing keys
info('Removing existing keys...');
await delWithPattern('room:*');
await delWithPattern('sid:*');

const chatBotProps = {
    id: '81',
    system: true,
    avatar: process.env.CHATBOT_AVATAR,
    username: process.env.CHATBOT_NAME,
};

(async () => {
    const events = await traverseEvents();

    io.attachApp(app, {
        cors: {
            origin: process.env.CORS_ORIGIN,
        },
    });

    io.on('connection', (socket) => {
        for (const event of events) {
            event(socket, io);
        }
    });

    app.listen(HOST, PORT, (token) => {
        if (!token) {
            return warn(`Port ${PORT} is already in use.`);
        }

        success(`Server is running on http://${HOST}:${PORT}`);
    });
})();

export { chatBotProps, io, redis };

import { io, chatBotProps } from '@index';

export default function sendSystemMessage(roomName: string, message: string) {
    io.in(roomName).emit('systemMessage', {
        content: message,
        author: chatBotProps,
    });
}

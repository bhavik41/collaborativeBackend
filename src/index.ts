import app from './app';
import http from 'http';
import dotenv from 'dotenv';
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { generateResult } from './services/ai.service';

const prisma = new PrismaClient();
dotenv.config();

interface AuthenticatedSocket extends Socket {
    // roomId: string;
    project: { id: string; name: string, users: string[], version?: number };
    user?: any;
}
const server = http.createServer(app);

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

io.use(async (socket: AuthenticatedSocket, next: (err?: any) => void) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId as string;

        if (!projectId) return next(new Error('Project ID is required'));
        if (!token) return next(new Error('Authorization failed'));

        const isValidProjectId = await prisma.project.findUnique({
            where: {
                id: projectId
            }
        })

        if (!isValidProjectId) return next(new Error('Project ID is invalid'));

        socket.project = isValidProjectId;

        const secretKey = process.env.SECRET_KEY;

        if (!secretKey) {
            return next(new Error('SECRET_KEY is not defined in environment variables')); // Internal Server Error
        }

        const decoded = jwt.verify(token, secretKey);

        if (!decoded) return next(new Error('Authorization failed'));

        socket.user = decoded;
        next()

    } catch (error) {
        next(error)
    }

})

io.on('connection', (socket: AuthenticatedSocket) => {
    // socket.roomId = socket.project.id

    console.log("a user connected");
    console.log(socket.project.id)

    socket.join(socket.project.id);

    socket.on('project-message', async data => {

        const message = data.message;

        const aiISPresentInMessage = message.includes('@AI') || message.includes('@ai');

        if (aiISPresentInMessage) {

            const prompt = message.replace('@AI', '').replace('@ai', '').trim();
            console.log(prompt)

            const result = await generateResult(prompt);
            console.log(result);

            io.to(socket.project.id).emit('project-message', {
                message: result,
                sender: 'AI'

            });

            return;
        }

        console.log(data);
        socket.broadcast.to(socket.project.id).emit('project-message', data);
    })

    socket.on('project-code', async data => {
        console.log(data)
        socket.broadcast.to(socket.project.id).emit('project-code', data);
    })

    socket.on('event', data => { /* … */ });
    socket.on('disconnect', () => {
        console.log('a user disconnected');
        socket.leave(socket.project.id);
    });
});

server.listen(8080, () => {
    console.log('server runnig on port 3006')
})



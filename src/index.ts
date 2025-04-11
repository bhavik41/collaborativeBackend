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
    project: {
        id: string;
        name: string;
        creator: string;
        language: string;
        description: string;
        collaborators: Array<{
            id: string;
            accessLevel: string;
            addedAt: Date;
        }>;
        fileTree: any;
        version: number;
    }
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

    socket.on('fileTree-update', async data => {
        socket.broadcast.to(socket.project.id).emit('fileTree-update', data);
    })

    socket.on('file-renamed', async data => {
        socket.broadcast.to(socket.project.id).emit('file-renamed', {
            oldPath: data.oldPath,
            newPath: data.newPath,
            username: socket.user.email
        });
    });

    socket.on('file-created', async data => {
        socket.broadcast.to(socket.project.id).emit('file-created', {
            path: data.path,
            type: data.type,
            username: socket.user.email
        });
    });

    socket.on('files-imported', async (data) => {
        // Broadcast the files-imported event to all clients in the project
        socket.broadcast.to(socket.project.id).emit('files-imported', {
            importedItems: data.importedItems,
            username: socket.user.email
        });
    });

    socket.on('file-deleted', async data => {
        socket.broadcast.to(socket.project.id).emit('file-deleted', {
            path: data.path,
            username: socket.user.email
        });
    });

    socket.on('user-cursor-move', (data) => {
        if (!data || !data.position) {
            console.warn("⚠️ Invalid cursor data received:", data);
            return;
        }

        console.log(`📌 Cursor moved by ${socket.user.email || "Unknown User"}:`, data.position);

        // Broadcast cursor position to others
        socket.broadcast.to(socket.project.id).emit('update-cursor', {
            userId: socket.user?.id || socket.id, // Fallback to socket ID
            username: socket.user?.email,
            position: data.position,
        });
    });

    // Capture text highlighting
    socket.on('user-highlight', (data) => {
        if (!data || !data.range) {
            console.warn("⚠️ Invalid highlight data received:", data);
            return;
        }

        console.log(`🖍️ Highlight by ${socket.user?.email || "Unknown User"}:`, data.range);

        // Broadcast highlight event to others
        socket.broadcast.to(socket.project.id).emit('update-highlight', {
            userId: socket.user?.id || socket.id,
            username: socket.user?.email,
            range: data.range,
        });
    });



    socket.on('event', data => { /* … */ });
    socket.on('disconnect', () => {
        console.log('a user disconnected');

        socket.broadcast.to(socket.project.id).emit('remove-cursor', {
            userId: socket.user.id,
            username: socket.user?.email,
        });


        socket.leave(socket.project.id);
    });
});

server.listen(8080, () => {
    console.log('server runnig on port 3006')
})



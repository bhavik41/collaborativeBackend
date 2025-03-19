import express, { Request, Response } from 'express';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import userRoutes from './routes/user.routes'
import projectRoutes from './routes/project.routes'
import aiRoutes from './routes/ai.routes'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const prisma = new PrismaClient();

const app = express();

app.use(morgan('dev'))
app.use(cors())

app.use(express.json())

app.use(cookieParser())

app.use(express.urlencoded({ extended: true }))

app.use('/users', userRoutes);

app.use('/project', projectRoutes)

app.use('/ai', aiRoutes)

// In your backend (e.g., Express.js)
app.post('/project/add-collaborator', async (req: Request, res: Response): Promise<any> => {
    const { projectId, userId } = req.body;
    console.log(projectId, userId)

    try {
        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            }
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.users.includes(userId)) {
            return res.status(400).json({ message: 'User is already a collaborator' });
        }

        // prisma.project.create({
        //     data: {
        //         id: userId
        //     }
        // })

        await prisma.project.update({
            where: { id: projectId },
            data: {
                users: {
                    push: userId
                }
            }
        });

        // project.users.push(userId);
        // await project.save();

        res.status(200).json({ message: 'Collaborator added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



app.get('/', (req: Request, res: Response) => {
    res.send('hello')
});

export default app;

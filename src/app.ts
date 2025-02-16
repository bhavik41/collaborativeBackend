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


app.get('/', (req: Request, res: Response) => {
    res.send('hello')
});

export default app;

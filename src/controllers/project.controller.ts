import * as projectSevice from '../services/project.service'
import { PrismaClient } from '@prisma/client'
import { validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { error } from 'console'


const prisma = new PrismaClient()

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const createProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }


    try {

        const { name, language, description } = req.body;


        const LoggedInUser = await prisma.user.findUnique({
            where: {
                email: req.user.email,
            }
        })

        if (!LoggedInUser) throw new Error('User not found')

        const userId = LoggedInUser.id

        const newProject = await projectSevice.createProject({ name, userId, language, description })

        res.status(201).json({ newProject: newProject })



    } catch (err) {
        if (err instanceof Error) {
            res.status(400).send(err.message);
        } else {
            res.status(400).send('An unknown error occurred');
        }
    }

}

export const getAllProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const loggedInUser = await prisma.user.findUnique({
            where: { email: req.user.email }
        })
        if (!loggedInUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(loggedInUser.id)
        const allUserProjects = await projectSevice.getAllProjectByUserId({ userId: loggedInUser.id })

        return res.status(200).json({ Projects: allUserProjects })
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).send(err.message);
        } else {
            res.status(400).send('An unknown error occurred');
        }
    }
}

export const addUserToProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    try {

        const { projectId, users } = req.body;


        const loggedInUser = await prisma.user.findUnique({
            where: {
                email: req.user.email
            }

        })

        if (!loggedInUser) {
            throw new Error('User not found');
        }

        const project = await projectSevice.addUserToProject({ projectId, users, userId: loggedInUser.id })

        return res.status(200).json({ project })

    } catch (err) {

        if (err instanceof Error) {
            res.status(400).json({
                error: err.message
            })
        }

    }
}

export const getProjetctByIdController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { projectId } = req.params;

    try {

        const project = await projectSevice.getProjectById({ projectId });
        return res.status(200).json({ project });


    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json({
                error: err.message
            });
        } else {
            res.status(400).json({
                error: 'An unknown error occurred'
            });
        }
    }

}

export const renameProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    try {
        const { projectId } = req.params;
        const { name } = req.body;
        const userId = req.user.userId;

        const project = await projectSevice.renameProject({ projectId, name, userId })
        return res.status(200).json({ project })
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json({
                error: err.message
            });
        } else {
            res.status(400).json({
                error: 'An unknown error occurred'
            })
        }
    }
}

export const deleteProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;
        const project = await projectSevice.deleteProject({ projectId, userId })
        return res.status(200).json({ project })
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json({
                error: err.message
            });
        } else {
            res.status(400).json({
                error: 'An unknown error occurred'
            });
        }
    }
}

export const updateFileTree = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }
    try {
        console.log("hello")
        const { projectId, fileTree } = req.body;
        console.log(projectId, fileTree)

        const project = await projectSevice.updateFileTree({ projectId, fileTree })
        console.log(project)
        return res.status(200).json({ project })

    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json({
                error: err.message
            });
        } else {
            res.status(400).json({
                error: 'An unknown error occurred'
            });
        }
    }

}
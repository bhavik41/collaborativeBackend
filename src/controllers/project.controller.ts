import * as projectSevice from '../services/project.service'
import { PrismaClient } from '@prisma/client'
import { validationResult } from 'express-validator'
import { Request, Response } from 'express'
import { error } from 'console'
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient()

interface AuthenticatedRequest extends Request {
    user?: any;
}

interface ShareLinkData {
    projectId: string;
    expiresAt: Date;
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

export const generateShareLink = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { projectId } = req.body;
        console.log(req.body)
        const userId = req.user.userId;
        // console.log(userId)
        // console.log('user of the middleware', req.user) // Assuming req.user is set by authentication middleware

        // Find the project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if the user is the creator or already a collaborator
        if (project.creator !== userId && !project.users.includes(userId)) {
            return res.status(403).json({ message: 'Not authorized to generate share link' });
        }

        // Generate a unique token
        const token = uuidv4();

        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create a share link record
        const shareLink = await prisma.shareLink.create({
            data: {
                token,
                projectId,
                expiresAt,
            },
        });

        // Generate the full share link URL
        const shareUrl = `${process.env.FRONTEND_URL}/join/${token}`;

        return res.status(201).json({ shareUrl, expiresAt });
    } catch (error) {
        console.error('Error generating share link:', error);
        return res.status(500).json({ message: 'Failed to generate share link' });
    }
};

export const joinProjectViaLink = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { token } = req.params;
        const userId = req.user.userId; // Assuming req.user is set by authentication middleware

        // Find the share link
        const shareLink = await prisma.shareLink.findUnique({
            where: { token },
        });

        if (!shareLink) {
            return res.status(404).json({ message: 'Invalid or expired share link' });
        }

        // Check if the link has expired
        if (new Date() > shareLink.expiresAt) {
            // Clean up expired link
            await prisma.shareLink.delete({
                where: { id: shareLink.id },
            });
            return res.status(410).json({ message: 'Share link has expired' });
        }

        // Find the project
        const project = await prisma.project.findUnique({
            where: { id: shareLink.projectId },
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is already a collaborator
        if (project.users.includes(userId)) {
            return res.status(200).json({ message: 'You are already a collaborator on this project', project });
        }

        // Add user to project collaborators
        const updatedProject = await prisma.project.update({
            where: { id: project.id },
            data: {
                users: {
                    push: userId,
                },
            },
        });

        // Also add the project to the user's projects list
        await prisma.user.update({
            where: { id: userId },
            data: {
                projects: {
                    push: project.id,
                },
            },
        });

        return res.status(200).json({
            message: 'Successfully joined project',
            project: updatedProject
        });
    } catch (error) {
        console.error('Error joining project via link:', error);
        return res.status(500).json({ message: 'Failed to join project' });
    }
};


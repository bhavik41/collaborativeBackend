

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as projectService from '../services/project.service';
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();
interface AuthenticatedRequest extends Request {
    user?: any;
}

export const createProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, language, description, scheduledTime, expiryTime } = req.body;
        const userId = req.user.userId;

        const project = await projectService.createProject({
            name,
            userId,
            language,
            description,
            scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
            expiryTime: expiryTime ? new Date(expiryTime) : undefined,
        });

        return res.status(201).json({ project });
    } catch (error) {
        console.error('Error creating project:', error);
        return res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

export const getAllProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user.userId;

        const projects = await projectService.getAllProjectsByUserId({
            userId
        });

        return res.status(200).json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        return res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

export const addUserToProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, users, accessLevel = 'readonly' } = req.body;
        const userId = req.user.userId;

        const updatedProject = await projectService.addUserToProject({
            projectId,
            userId,
            users,
            accessLevel
        });

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error adding users to project:', error);
        if (error instanceof Error) {
            if (error.message.includes('Only admins can add users')) {
                return res.status(403).json({ message: error.message });
            }
            if (error.message.includes('You need at least write access')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const leaveProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId } = req.body;
        const userId = req.user.userId;

        const updatedProject = await projectService.leaveProject({
            projectId,
            userId
        });

        return res.status(200).json({ message: "Successfully left the project", project: updatedProject });
    } catch (error) {
        console.error('Error leaving project:', error);
        if (error instanceof Error) {
            if (error.message.includes('only admin')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const updateCollaboratorAccessController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, collaboratorId, accessLevel } = req.body;
        console.log(collaboratorId)
        const userId = req.user.userId;

        const updatedProject = await projectService.updateCollaboratorAccess({
            projectId,
            userId,
            collaboratorId,
            accessLevel
        });
        console.log('updated project', updatedProject)

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error updating collaborator access:', error);
        if (error instanceof Error) {
            if (error.message.includes('Only admins can modify')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const removeCollaboratorController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, collaboratorId } = req.body;
        const userId = req.user.userId;

        const updatedProject = await projectService.removeCollaborator({
            projectId,
            userId,
            collaboratorId
        });

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error removing collaborator:', error);
        if (error instanceof Error) {
            if (error.message.includes('Only admins can remove')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getProjetctByIdController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;

        const result = await projectService.getProjectById({
            projectId,
            userId
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching project:', error);
        if (error instanceof Error) {
            if (error.message === 'Access denied') {
                return res.status(403).json({ message: error.message });
            }
            if (error.message === 'Project not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const updateFileTree = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, fileTree } = req.body;
        const userId = req.user.userId;

        const updatedProject = await projectService.updateFileTree({
            projectId,
            fileTree,
            userId
        });

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error updating file tree:', error);
        if (error instanceof Error) {
            if (error.message.includes('write access')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const deleteProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;

        await projectService.deleteProject({
            projectId,
            userId
        });

        return res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        if (error instanceof Error) {
            if (error.message.includes('Only project admins')) {
                return res.status(403).json({ message: error.message });
            }
            if (error.message === 'Project not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const renameProjectController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId } = req.params;
        const { name, language, description, scheduledTime, expiryTime, adminOnlyEdit } = req.body;
        const userId = req.user.userId;

        const updatedProject = await projectService.updateProject({
            projectId,
            name,
            language,
            description,
            scheduledTime,
            expiryTime,
            adminOnlyEdit,
            userId
        });

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error updating project:', error);
        if (error instanceof Error) {
            if (error.message.includes('write access')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const generateShareLinkController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { projectId, accessLevel = 'readonly', expirationDays = 7 } = req.body;
        const userId = req.user.userId;

        const shareLink = await projectService.generateShareLink({
            projectId,
            userId,
            accessLevel,
            expirationDays
        });

        return res.status(201).json(shareLink);
    } catch (error) {
        console.error('Error generating share link:', error);
        if (error instanceof Error) {
            if (error.message.includes('Only admins can generate')) {
                return res.status(403).json({ message: error.message });
            }
            if (error.message.includes('You need at least write access')) {
                return res.status(403).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const joinProjectViaLinkController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { token } = req.params;
        const userId = req.user.userId;

        const project = await projectService.joinProjectViaLink({
            token,
            userId
        });

        return res.status(200).json({
            project,
            message: 'You have successfully joined the project'
        });
    } catch (error) {
        console.error('Error joining project via link:', error);
        if (error instanceof Error) {
            if (error.message.includes('Invalid or expired')) {
                return res.status(404).json({ message: error.message });
            }
            if (error.message.includes('Share link has expired')) {
                return res.status(400).json({ message: error.message });
            }
            if (error.message.includes('already a collaborator')) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};


export const getProjectCollaboratorsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;

        const result = await projectService.getProjectById({
            projectId,
            userId
        });

        const project = result.project;
        const collaborators = [];

        // Add creator as admin
        const creator = await prisma.user.findUnique({
            where: { id: project.creator },
            select: { id: true, email: true }
        });

        if (creator) {
            collaborators.push({
                ...creator,
                accessLevel: 'admin',
                isCreator: true
            });
        }

        // Add other collaborators
        for (const collab of project.collaborators) {
            const user = await prisma.user.findUnique({
                where: { id: collab.userId },
                select: { id: true, email: true }
            });

            if (user) {
                collaborators.push({
                    ...user,
                    accessLevel: collab.accessLevel,
                    isCreator: false
                });
            }
        }

        return res.status(200).json({
            collaborators,
            userAccess: result.userAccess
        });
    } catch (error) {
        console.error('Error fetching project collaborators:', error);
        if (error instanceof Error) {
            if (error.message === 'Access denied') {
                return res.status(403).json({ message: error.message });
            }
            if (error.message === 'Project not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

export const toggleAdminOnlyEditController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId } = req.params;
        const userId = req.user.userId;

        const updatedProject = await projectService.toggleAdminOnlyEdit({
            projectId,
            userId
        });

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error toggling adminOnlyEdit setting:', error);
        return res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

export interface Message {
    sender: string;
    message: string;
    createdAt: string; // ISO date string
}
export const addMessageController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, message } = req.body;
        const sender = req.user.email;


        const newMessage: Message = {
            sender,
            message,
            createdAt: new Date().toISOString(),
        };

        const updatedProject = await projectService.addMessageToProject({
            projectId,
            newMessage,
        });

        return res.status(200).json({ project: updatedProject });
    } catch (error) {
        console.error('Error adding message:', error);
        return res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};
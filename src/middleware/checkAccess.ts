import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
    user?: any;
    project?: any;
}

export const checkAccess = () => {
    return async (req: AuthenticatedRequest, res: Response, next: Function) => {
        const { projectId } = req.params;
        const userId = req.user.userId;

        try {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: { collaborators: true },
            });

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const now = new Date();
            const isAdmin = project.collaborators.some(collab => collab.id === userId && collab.accessLevel === 'admin');
            const isCreator = project.creator === userId;

            // Admins and creators can always access the project
            if (isCreator || isAdmin) {
                req.project = project;
                return next();
            }

            // Non-admins can access only if within the scheduled and expiry times
            if (project.scheduledTime && project.expiryTime) {
                if (now >= new Date(project.scheduledTime) && now <= new Date(project.expiryTime)) {
                    req.project = project;
                    return next();
                } else {
                    return res.status(403).json({ error: 'Access denied: Project is not available at this time' });
                }
            } else if (project.scheduledTime && !project.expiryTime) {
                if (now >= new Date(project.scheduledTime)) {
                    req.project = project;
                    return next();
                } else {
                    return res.status(403).json({ error: 'Access denied: Project is not available yet' });
                }
            } else if (!project.scheduledTime && project.expiryTime) {
                if (now <= new Date(project.expiryTime)) {
                    req.project = project;
                    return next();
                } else {
                    return res.status(403).json({ error: 'Access denied: Project has expired' });
                }
            } else {
                // No scheduled or expiry time set
                req.project = project;
                return next();
            }
        } catch (error) {
            res.status(500).json({ error: 'Failed to check access' });
        }
    };
};

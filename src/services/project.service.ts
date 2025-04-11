
import { PrismaClient } from "@prisma/client";
import { ChildProcess } from "child_process";
import { v4 as uuidv4 } from 'uuid';
import { Message } from "../controllers/project.controller";

const prisma = new PrismaClient();

// Access level types
export type AccessLevel = 'admin' | 'readwrite' | 'readonly';

// Helper function to check if user has admin privileges
export async function isAdmin(userId: string, projectId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) return false;

    // Project creator is always admin
    if (project.creator === userId) return true;

    // Check if user is in collaborators with admin access
    const collaborator = project.collaborators.find(
        (collab: any) => collab.id === userId && collab.accessLevel === 'admin'
    );

    return !!collaborator;
}

// Helper function to check user's access level
export async function getUserAccessLevel(userId: string, projectId: string): Promise<AccessLevel | null> {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) return null;

    // Project creator is always admin
    if (project.creator === userId) return 'admin';

    // Check collaborator access level
    const collaborator = project.collaborators.find(
        (collab: any) => collab.id === userId
    );

    if (!collaborator) return null;

    return collaborator.accessLevel as AccessLevel;
}

// Helper function to check if user has write access
// export async function hasWriteAccess(userId: string, projectId: string): Promise<boolean> {
//     const project = await prisma.project.findUnique({
//         where: { id: projectId }
//     });

//     if (!project) return false;

//     // Project creator has write access
//     if (project.creator === userId) return true;

//     // Check collaborator access level
//     const collaborator = project.collaborators.find(
//         (collab: any) => collab.userId === userId
//     );

//     if (!collaborator) return false;

//     return ['admin', 'readwrite'].includes(collaborator.accessLevel);
// }

export async function hasWriteAccess(userId: string, projectId: string): Promise<any> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { collaborators: true }
    });

    if (!project) return false;

    // Project creator has write access
    if (project.creator === userId) return true;

    // Check collaborator access level
    const collaborator = project.collaborators.find(
        (collab) => collab.id === userId  // This is correct now - using just 'id'
    );

    if (!collaborator) return false;

    // Check if access level allows writing
    return ['admin', 'readwrite'].includes(collaborator.accessLevel);
}

interface CreateProjectParams {
    name: string;
    userId: string;
    language: string;
    description: string;
    scheduledTime?: Date;
    expiryTime?: Date;
}

export const createProject = async ({
    name,
    userId,
    language,
    description,
    scheduledTime,
    expiryTime
}: CreateProjectParams): Promise<any> => {
    if (!name) throw new Error("Project name is required");
    if (!userId) throw new Error("User ID is required");

    // Check for existing project with the same name
    const existingProject = await prisma.project.findFirst({
        where: {
            name: name,
        },
    });

    if (existingProject) {
        throw new Error("You have already created a project with this name");
    }

    try {

        // Create project with the creator as an admin collaborator
        const project = await prisma.project.create({
            data: {
                name,
                language,
                description,
                creator: userId,
                collaborators: [{
                    id: userId,
                    accessLevel: 'admin', // Creator has admin access
                    addedAt: new Date()
                }],
                scheduledTime,
                expiryTime
            }
        });

        // Add project to user's projects
        await prisma.user.update({
            where: { id: userId },
            data: {
                projects: {
                    push: project.id
                }
            }
        });

        return project;
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
            throw new Error("Project already exists");
        }
        throw error;
    }
};


interface GetAllProjectsByUserIdParams {
    userId: string;
}

export const getAllProjectsByUserId = async ({ userId }: GetAllProjectsByUserIdParams): Promise<any> => {
    if (!userId) throw new Error("User ID is required");

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error("User not found");
    }

    const projects = await prisma.project.findMany({
        where: {
            OR: [
                { creator: userId },
                {
                    collaborators: {
                        some: {
                            id: userId
                        }
                    }
                }
            ]
        }
    });

    // Fetch user details for each collaborator
    for (const project of projects) {
        for (const collaborator of project.collaborators) {
            const userDetails = await prisma.user.findUnique({
                where: { id: collaborator.id }
            });
            // Attach user details to the collaborator object
            (collaborator as any).id = userDetails?.id;
            (collaborator as any).email = userDetails?.email;
            (collaborator as any).accessLevel = collaborator.accessLevel;
            // Remove the userId field if you don't need it
            delete (collaborator as any).userId;
        }
    }

    const projectsWithAccessLevel = projects.map(project => {
        // Find the current user's collaborator entry
        const currentUserCollaborator = project.collaborators.find(
            collaborator => collaborator.id === userId
        );

        return {
            ...project,
            accessLevel: currentUserCollaborator?.accessLevel || null, // Attach accessLevel of the current user
            expiryTime: project.expiryTime, // Include expiryTime
        };
    });




    return projectsWithAccessLevel;
}




interface AddUserToProjectParams {
    projectId: string;
    userId: string; // User adding others
    users: string[]; // Email addresses of users to add
    accessLevel: AccessLevel;
}

export const addUserToProject = async ({
    projectId,
    userId,
    users,
    accessLevel = 'readonly'
}: AddUserToProjectParams): Promise<any> => {
    if (!projectId) throw new Error("Project ID is required");
    if (!users || users.length === 0) throw new Error("Users are required");

    // Get user's access level
    const userAccessLevel = await getUserAccessLevel(userId, projectId);

    // Only admins can add users with admin or readwrite access
    if (accessLevel !== 'readonly' && userAccessLevel !== 'admin') {
        throw new Error("Only admins can add users with elevated permissions");
    }

    // For non-admins, check if they at least have write access to add readonly collaborators
    if (userAccessLevel !== 'admin' && !(await hasWriteAccess(userId, projectId))) {
        throw new Error("You need at least write access to add collaborators");
    }

    // Validate access level
    if (!['admin', 'readwrite', 'readonly'].includes(accessLevel)) {
        throw new Error("Invalid access level");
    }


    // Get existing project
    // const project = await prisma.project.findUnique({
    //     where: { id: projectId }
    // });

    // if (!project) {
    //     throw new Error("Project not found");
    // }

    // // Find users by email
    // const existingUsers = await prisma.user.findMany({
    //     where: {
    //         email: {
    //             in: users
    //         }
    //     }
    // });

    // if (existingUsers.length === 0) {
    //     throw new Error("No valid users found");
    // }

    const validProjectId = await prisma.project.findUnique({
        where: { id: projectId }
    });
    if (!validProjectId) {
        throw new Error("Invalid Project Id");
    }

    const validUserID = await prisma.user.findUnique({
        where: { id: userId }
    })
    if (!validUserID) throw new Error(`Invalid user ID: ${userId}`)


    //////check all the userId of users array correct(exists)

    // Fetch all users at once
    const validUsers = await prisma.user.findMany({
        where: {
            id: { in: users }
        }
    });

    // Check if all provided user IDs are valid
    const validUserIds = validUsers.map(user => user.id);
    const invalidUserIds = users.filter(userId => !validUserIds.includes(userId));

    if (invalidUserIds.length > 0) {
        throw new Error(`Invalid user IDs: ${invalidUserIds.join(', ')}`);
    }

    const existingUserIds = validProjectId.collaborators.map(collab => collab.id); // This should be an array of user IDs

    const alreadyAddedUsers = users.filter(userId => existingUserIds.includes(userId));

    if (alreadyAddedUsers.length > 0) {
        throw new Error(`Users already added to project: ${alreadyAddedUsers.join(', ')}`);
    }

    const project = await prisma.project.findUnique({
        where: {
            id: projectId
        }
    })

    if (!project) throw new Error(`User not Belong to this project `)

    if (project.adminOnlyEdit && !(await isAdmin(userId, projectId))) {
        throw new Error("Only admins can add collaborators when adminOnlyEdit is enabled");
    }

    // Create new collaborator objects
    const newCollaborators = validUsers.map(user => ({
        id: user.id,
        accessLevel,
        addedAt: new Date()
    }));

    // Update project collaborators
    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            collaborators: {
                push: newCollaborators
            }
        }
    });

    for (const collaborator of updatedProject.collaborators) {
        const userDetails = await prisma.user.findUnique({
            where: { id: collaborator.id }
        });
        // Attach user details to the collaborator object
        (collaborator as any).id = userDetails?.id;
        (collaborator as any).email = userDetails?.email;
        // Remove the userId field if you don't need it
        delete (collaborator as any).userId;
    }

    // Add project to each user's projects
    for (const user of validUsers) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                projects: {
                    push: projectId
                }
            }
        });
    }

    return updatedProject;
}

interface LeaveProjectParams {
    projectId: string;
    userId: string; // The user who is leaving the project
}

export const leaveProject = async ({
    projectId,
    userId,
}: LeaveProjectParams): Promise<any> => {
    if (!projectId) throw new Error("Project ID is required");
    if (!userId) throw new Error("User ID is required");

    // Check if project exists
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error("Project not found");
    }

    // Check if user is part of the project
    const userCollaborator = project.collaborators.find(c => c.id === userId);

    if (!userCollaborator) {
        throw new Error("User is not a collaborator on this project");
    }

    // Cannot leave if you're the only admin
    if (userCollaborator.accessLevel === 'admin') {
        const adminCount = project.collaborators.filter(c => c.accessLevel === 'admin').length;
        if (adminCount <= 1) {
            throw new Error("Cannot leave the project as you are the only admin. Transfer admin rights first.");
        }
    }

    // Remove user from project's collaborators
    const updatedCollaborators = project.collaborators.filter(c => c.id !== userId);

    // Update project
    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            collaborators: updatedCollaborators
        }
    });

    // Remove project from user's projects list
    await prisma.user.update({
        where: { id: userId },
        data: {
            projects: {
                set: (await prisma.user.findUnique({
                    where: { id: userId },
                    select: { projects: true }
                }))?.projects.filter(p => p !== projectId) || []
            }
        }
    });

    return updatedProject;
};

interface UpdateCollaboratorAccessParams {
    projectId: string;
    userId: string;
    collaboratorId: string;
    accessLevel: AccessLevel;
}
export const updateCollaboratorAccess = async ({
    projectId,
    userId,
    collaboratorId,
    accessLevel
}: UpdateCollaboratorAccessParams): Promise<any> => {
    // Only admins can modify access levels
    if (!(await isAdmin(userId, projectId))) {
        throw new Error("Only admins can modify access levels");
    }

    // Validate access level
    if (!['admin', 'readwrite', 'readonly'].includes(accessLevel)) {
        throw new Error("Invalid access level");
    }

    // Get existing project
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });


    if (!project) {
        throw new Error("Project not found");
    }

    if (project.adminOnlyEdit && !(await isAdmin(userId, projectId))) {
        throw new Error("Only admins can modify collaborator access when adminOnlyEdit is enabled");
    }

    // Cannot change access of the project creator
    if (project.creator === collaboratorId) {
        throw new Error("Cannot modify the project creator's access level");
    }

    // Check if collaborators is an array
    if (!Array.isArray(project.collaborators)) {
        throw new Error("Collaborators is not an array");
    }

    // Log collaborators and collaboratorId
    console.log("Collaborators array:", project.collaborators);
    console.log("Collaborator ID to update:", collaboratorId);

    // Check if collaboratorId exists in collaborators
    const collaboratorExists = project.collaborators.some((collab: any) => {
        console.log("Checking collaborator:", collab.collaboratorId);
        return collab.id === collaboratorId;
    });

    if (!collaboratorExists) {
        throw new Error("Collaborator not found in the project");
    }

    // Update collaborator access level
    const updatedCollaborators = project.collaborators.map((collab: any) => {
        if (collab.id === collaboratorId) {
            return { ...collab, accessLevel };
        }
        return collab;
    });

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            collaborators: updatedCollaborators
        }
    });

    for (const collaborator of updatedProject.collaborators) {
        const userDetails = await prisma.user.findUnique({
            where: { id: collaborator.id }
        });
        // Attach user details to the collaborator object
        (collaborator as any).id = userDetails?.id;
        (collaborator as any).email = userDetails?.email;
        // Remove the userId field if you don't need it
        delete (collaborator as any).userId;
    }

    return updatedProject;
}


// export const updateCollaboratorAccess = async ({
//     projectId,
//     userId,
//     collaboratorId,
//     accessLevel
// }: UpdateCollaboratorAccessParams): Promise<any> => {
//     // Only admins can modify access levels
//     if (!(await isAdmin(userId, projectId))) {
//         throw new Error("Only admins can modify access levels");
//     }

//     // Validate access level
//     if (!['admin', 'readwrite', 'readonly'].includes(accessLevel)) {
//         throw new Error("Invalid access level");
//     }

//     // Get existing project
//     const project = await prisma.project.findUnique({
//         where: { id: projectId }
//     });

//     if (!project) {
//         throw new Error("Project not found");
//     }

//     // Cannot change access of the project creator
//     if (project.creator === collaboratorId) {
//         throw new Error("Cannot modify the project creator's access level");
//     }

//     // Update collaborator access level
//     const updatedCollaborators = project.collaborators.map((collab: any) => {
//         if (collab.userId === collaboratorId) {
//             return { ...collab, accessLevel };
//         }
//         return collab;
//     });

//     const updatedProject = await prisma.project.update({
//         where: { id: projectId },
//         data: {
//             collaborators: updatedCollaborators
//         }
//     });

//     for (const collaborator of updatedProject.collaborators) {
//         const userDetails = await prisma.user.findUnique({
//             where: { id: collaborator.id }
//         });
//         // Attach user details to the collaborator object
//         (collaborator as any).id = userDetails?.id;
//         (collaborator as any).email = userDetails?.email;
//         // Remove the userId field if you don't need it
//         delete (collaborator as any).userId;
//     }

//     return updatedProject;
// }

interface RemoveCollaboratorParams {
    projectId: string;
    userId: string; // Admin removing someone
    collaboratorId: string; // User being removed
}

export const removeCollaborator = async ({
    projectId,
    userId,
    collaboratorId
}: RemoveCollaboratorParams): Promise<any> => {
    if (!projectId) throw new Error("Project ID is required");
    if (!collaboratorId) throw new Error("Collaborator ID is required");

    // Only admins can remove collaborators
    if (!(await isAdmin(userId, projectId))) {
        throw new Error("Only admins can remove collaborators");
    }

    // Get existing project
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error("Project not found");
    }

    if (project.adminOnlyEdit && !(await isAdmin(userId, projectId))) {
        throw new Error("Only admins can remove collaborators when adminOnlyEdit is enabled");
    }

    // Cannot remove project creator
    if (project.creator === collaboratorId) {
        throw new Error("Cannot remove project creator");
    }

    // Filter out the collaborator
    const updatedCollaborators = project.collaborators.filter(
        (collab: any) => collab.id !== collaboratorId
    );

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            collaborators: updatedCollaborators
        }
    });

    for (const collaborator of updatedProject.collaborators) {
        const userDetails = await prisma.user.findUnique({
            where: { id: collaborator.id }
        });
        // Attach user details to the collaborator object
        (collaborator as any).id = userDetails?.id;
        (collaborator as any).email = userDetails?.email;
        // Remove the userId field if you don't need it
        delete (collaborator as any).userId;
    }

    // Remove project from user's projects
    await prisma.user.update({
        where: { id: collaboratorId },
        data: {
            projects: {
                set: (await prisma.user.findUnique({ where: { id: collaboratorId } }))?.projects.filter(id => id !== projectId)
            }
        }
    });

    return updatedProject;
}

interface GetProjectByIdParams {
    projectId: string;
    userId: string;
}

export const getProjectById = async ({
    projectId,
    userId
}: GetProjectByIdParams): Promise<any> => {
    if (!projectId) throw new Error('Project ID is required');

    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error('Project not found');
    }

    for (const collaborator of project.collaborators) {
        const userDetails = await prisma.user.findUnique({
            where: { id: collaborator.id }
        });
        // Attach user details to the collaborator object
        (collaborator as any).id = userDetails?.id;
        (collaborator as any).email = userDetails?.email;
        // Remove the userId field if you don't need it
        delete (collaborator as any).userId;
    }

    if (!project) {
        throw new Error('Project not found');
    }

    // Check if user has access to the project
    const isCreator = project.creator === userId;
    const isCollaborator = project.collaborators.some(
        (collab: any) => collab.id === userId
    );

    if (!isCreator && !isCollaborator) {
        throw new Error('Access denied');
    }

    // Get user's access level
    let accessLevel: AccessLevel = 'readonly';
    if (isCreator) {
        accessLevel = 'admin';
    } else {
        const collaborator = project.collaborators.find(
            (collab: any) => collab.id === userId
        );
        if (collaborator) {
            accessLevel = collaborator.accessLevel as AccessLevel;
        }
    }


    return {
        project,
        userAccess: {
            accessLevel,
            isAdmin: accessLevel === 'admin',
            canWrite: ['admin', 'readwrite'].includes(accessLevel)
        }
    };
}

interface UpdateFileTreeParams {
    projectId: string;
    fileTree: any;
    userId: string;
}

export const updateFileTree = async ({
    projectId,
    fileTree,
    userId
}: UpdateFileTreeParams): Promise<any> => {
    if (!projectId) throw new Error('Project ID is required');
    if (!fileTree) throw new Error('File tree is required');

    // Check if user has write access
    if (!(await hasWriteAccess(userId, projectId))) {
        throw new Error('You do not have write access to this project');
    }

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            fileTree,
            version: {
                increment: 1
            }
        }
    });

    return updatedProject;
}

// interface RenameProjectParams {
//     projectId: string;
//     name: string;
//     userId: string;
// }

// export const renameProject = async ({
//     projectId,
//     name,
//     userId
// }: RenameProjectParams): Promise<any> => {
//     if (!projectId) throw new Error('Project ID is required');
//     if (!name) throw new Error('Project name is required');

//     // Check if user has write access
//     if (!(await hasWriteAccess(userId, projectId))) {
//         throw new Error('You do not have write access to this project');
//     }

//     const updatedProject = await prisma.project.update({
//         where: { id: projectId },
//         data: { name }
//     });

//     return updatedProject;
// }

interface UpdateProjectParams {
    projectId: string;
    name?: string;
    language?: string;
    description?: string;
    scheduledTime?: string | null;
    expiryTime?: string | null;
    adminOnlyEdit?: boolean;
    userId: string;
}

export const updateProject = async ({
    projectId,
    name,
    language,
    description,
    scheduledTime,
    expiryTime,
    adminOnlyEdit,
    userId
}: UpdateProjectParams): Promise<any> => {
    if (!projectId) throw new Error('Project ID is required');

    console.log("updated name :", name, language, description, scheduledTime, expiryTime, adminOnlyEdit);

    // Check if user has write access
    if (!(await hasWriteAccess(userId, projectId))) {
        throw new Error('You do not have write access to this project');
    }

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            name,
            language,
            description,
            scheduledTime: scheduledTime === undefined ? null : scheduledTime,
            expiryTime: expiryTime === undefined ? null : expiryTime,
            adminOnlyEdit: adminOnlyEdit === undefined ? false : adminOnlyEdit
        },
    });

    return updatedProject;
};


interface DeleteProjectParams {
    projectId: string;
    userId: string;
}


export const deleteProject = async ({
    projectId,
    userId
}: DeleteProjectParams): Promise<any> => {
    if (!projectId) throw new Error('Project ID is required');

    // Check if project exists
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // Only creator or admin can delete project
    if (!(await isAdmin(userId, projectId))) {
        throw new Error('Only project admins can delete projects');
    }

    // Delete project
    const deletedProject = await prisma.project.delete({
        where: { id: projectId }
    });

    // Remove project from all users' projects
    const users = await prisma.user.findMany({
        where: {
            projects: {
                has: projectId
            }
        }
    });

    for (const user of users) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                projects: {
                    set: user.projects.filter(id => id !== projectId)
                }
            }
        });
    }

    return deletedProject;
}

interface GenerateShareLinkParams {
    projectId: string;
    userId: string;
    accessLevel?: AccessLevel;
    expirationDays?: number;
}

export const generateShareLink = async ({
    projectId,
    userId,
    accessLevel = 'readonly',
    expirationDays = 7
}: GenerateShareLinkParams): Promise<any> => {
    if (!projectId) throw new Error('Project ID is required');

    // Get user's access level
    const userAccessLevel = await getUserAccessLevel(userId, projectId);

    if (!userAccessLevel) {
        throw new Error('You do not have access to this project');
    }

    // Only admins can generate share links with readwrite access
    if (accessLevel !== 'readonly' && userAccessLevel !== 'admin') {
        throw new Error('Only admins can generate share links with elevated permissions');
    }

    // All users with at least readwrite access can generate readonly share links
    if (accessLevel === 'readonly' && !['admin', 'readwrite'].includes(userAccessLevel)) {
        throw new Error('You need at least write access to generate share links');
    }

    // Validate access level (only readonly and readwrite allowed for share links)
    if (!['readwrite', 'readonly'].includes(accessLevel)) {
        throw new Error('Invalid access level for share link');
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const shareLink = await prisma.shareLink.create({
        data: {
            token,
            projectId,
            accessLevel,
            expiresAt
        }
    });

    return {
        ...shareLink,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${shareLink.token}`
    };
}

interface JoinProjectViaLinkParams {
    token: string;
    userId: string;
}

export const joinProjectViaLink = async ({
    token,
    userId
}: JoinProjectViaLinkParams): Promise<any> => {
    if (!token) throw new Error('Token is required');
    if (!userId) throw new Error('User ID is required');

    const shareLink = await prisma.shareLink.findUnique({
        where: { token }
    });

    if (!shareLink) {
        throw new Error('Invalid or expired share link');
    }

    if (shareLink.expiresAt < new Date()) {
        throw new Error('Share link has expired');
    }

    const project = await prisma.project.findUnique({
        where: { id: shareLink.projectId }
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // Check if user is already a collaborator
    const isCollaborator = project.collaborators.some(
        (collab: any) => collab.userId === userId
    );

    if (project.creator === userId || isCollaborator) {
        throw new Error('You are already a collaborator on this project');
    }

    // Add user as collaborator with access level from share link
    const updatedProject = await prisma.project.update({
        where: { id: shareLink.projectId },
        data: {
            collaborators: {
                push: {
                    id: userId,
                    accessLevel: shareLink.accessLevel,
                    addedAt: new Date()
                }
            }
        }
    });

    // Add project to user's projects
    await prisma.user.update({
        where: { id: userId },
        data: {
            projects: {
                push: shareLink.projectId
            }
        }
    });

    return updatedProject;
}

interface ToggleAdminOnlyEditParams {
    projectId: string;
    userId: string;
}

export const toggleAdminOnlyEdit = async ({
    projectId,
    userId
}: ToggleAdminOnlyEditParams): Promise<any> => {
    // Check if the user is an admin
    if (!(await isAdmin(userId, projectId))) {
        throw new Error("Only admins can toggle this setting");
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error("Project not found");
    }

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { adminOnlyEdit: !project.adminOnlyEdit }
    });

    return updatedProject;
};


interface AddMessageParams {
    projectId: string;
    newMessage: Message; // Use the Message type here
}

export const addMessageToProject = async ({ projectId, newMessage }: AddMessageParams): Promise<any> => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            messages: [...project.messages, newMessage],
        },
    });

    return updatedProject;
};
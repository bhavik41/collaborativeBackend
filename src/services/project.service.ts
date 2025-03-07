import { PrismaClient } from "@prisma/client";
import { userInfo } from "os";

const prisma = new PrismaClient();

interface createProjectParams {
    name: string;
    userId: string;
    language: string;
    description: string;
    creator: string
}

interface getAllProjectByUserIdParams {
    userId: string
}

interface addUserToProjectParams {
    projectId: string;
    userId: string;
    users: string[];
}

interface getProjrectByIdParams {
    projectId: string
}

interface updateFileTreeParams {
    projectId: string;
    fileTree: any;
}
interface updateProjectParams {
    projectId: string;
    name: string;
    userId: string;
}

interface deleteProjectParams {
    projectId: string;
    userId: string
}

export const createProject = async ({
    name,
    userId,
    language,
    description
}: createProjectParams) => {

    if (!name) throw new Error("Project name is required");

    if (!userId) throw new Error("User ID is required");

    // const existingProject = await prisma.project.findFirst({
    //     where: {
    //         name: name,
    //         users: {
    //             // has: userId,  // Check if the user is already part of the project
    //         }
    //     },
    // });

    const existingProject = await prisma.project.findFirst({
        where: {
            name: name, // Ensure the project name is unique
        },
    });

    if (existingProject) {
        throw new Error("You have already created a project with this name");
    }

    let project
    try {

        project = await prisma.project.create({
            data: {
                name,
                users: [userId],
                creator: userId,
                language,
                description
            },
            select: {
                id: true,
                name: true,
                users: true
            }
        })
        return project
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
            throw new Error("Project already exists")
        } throw error
    }

}

export const getAllProjectByUserId = async ({ userId }: getAllProjectByUserIdParams) => {
    console.log(userId)

    if (!userId) throw new Error("User ID is required");

    const allUserProjects = await prisma.project.findMany({
        where: {
            users: {
                has: userId  // Checks if userId exists in the users array
            }
        }

    })


    return allUserProjects
}

export const addUserToProject = async ({ projectId, users, userId }: addUserToProjectParams) => {

    if (!projectId) throw new Error("Project ID is required");

    if (!users) throw new Error("Users are required");


    //check weather projectId is valid or not (exist or not)
    const validProjectId = await prisma.project.findUnique({
        where: { id: projectId }
    });
    if (!validProjectId) {
        throw new Error("Invalid Project Id");
    }

    // for (const userId of users) {
    //     const user = await prisma.user.findUnique({
    //         where: { id: userId }
    //     });

    //     if (!user) {
    //         throw new Error(`Invalid user ID: ${userId}`);
    //     }
    // }


    // check weather userID is correct(exists) or not 
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

    const existingUserIds = validProjectId.users; // This should be an array of user IDs

    const alreadyAddedUsers = users.filter(userId => existingUserIds.includes(userId));

    if (alreadyAddedUsers.length > 0) {
        throw new Error(`Users already added to project: ${alreadyAddedUsers.join(', ')}`);
    }

    const project = await prisma.project.findUnique({
        where: {
            id: projectId,
            users: {
                has: userId
            }
        }
    })

    if (!project) throw new Error(`User not Belong to this project `)

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            users: {
                push: users
            }
        }
    });

    console.log('updatedProject', updatedProject)

    return updatedProject;
}


// export const getProjectById = async ({ projectId }: getProjrectByIdParams) => {

//     if (!projectId) throw new Error('Project ID is required');

//     const project = await prisma.project.findUnique({
//         where: {
//             id: projectId
//         },
//         // select: {
//         //     users: true
//         // }

//     })

//     if (!project) throw new Error(`Project not found`);

//     return project;
// }

export const getProjectById = async ({ projectId }: getProjrectByIdParams) => {
    if (!projectId) throw new Error('Project ID is required');

    // Find the project
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) throw new Error(`Project not found`);

    // Fetch user details manually
    const users = await prisma.user.findMany({
        where: {
            id: { in: project.users } // Fetch users whose IDs match those in the project
        },
        // select: {
        //     id: true,
        //     email: true,
        // }
    });

    // Return project with user details
    return { ...project, users };
};


export const updateFileTree = async ({ projectId, fileTree }: updateFileTreeParams) => {

    const isproject = await prisma.project.findUnique({
        where: {
            id: projectId
        }
    })
    if (!isproject) throw new Error(`Project not found`);


    if (!fileTree) throw new Error('File tree is required');

    const project = await prisma.project.update({
        where: {
            id: projectId
        },
        data: {
            fileTree: fileTree
        }
    })

    return project
}

export const renameProject = async ({ projectId, name, userId }: updateProjectParams) => {
    const isproject = await prisma.project.findUnique({
        where: {
            id: projectId
        }
    })

    if (isproject?.creator !== userId) throw new Error(`anuthorized to update this project`);
    if (!isproject) throw new Error(`Project not found`);

    const project = await prisma.project.update({
        where: {
            id: projectId
        },
        data: {
            name: name
        }
    })

    return project
}

export const deleteProject = async ({ projectId, userId }: deleteProjectParams) => {
    const isproject = await prisma.project.findUnique({
        where: {
            id: projectId
        }
    })
    if (isproject?.creator !== userId) throw new Error(`anuthorized to update this project`);
    if (!isproject) throw new Error(`Project not found`);
    const deleteProject = await prisma.project.delete({
        where: {
            id: projectId
        }
    })

    return deleteProject
}

// import { Router } from 'express';
// import { PrismaClient } from '@prisma/client';
// import * as authMiddleware from '../middleware/auth.middleware'
// import simpleGit from 'simple-git';
// import fs from 'fs-extra';
// import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import { Request, Response } from 'express';
// const prisma = new PrismaClient();
// const router = Router();

// // Project base directory for Git repositories
// const PROJECT_BASE_DIR = path.join(process.cwd(), 'projects');

// interface GitCommitData {
//     message: string;
//     files: string[];
// }

// interface AuthenticatedRequest extends Request {
//     user?: any;
// }

// // Ensure project directory exists
// const ensureProjectDirectory = (projectId: string) => {
//     const projectDir = path.join(PROJECT_BASE_DIR, projectId);
//     fs.ensureDirSync(projectDir);
//     return projectDir;
// };

// // Initialize Git repository for a project
// router.post('/initialize-git/:projectId', authMiddleware.authUser, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
//     try {
//         const { projectId } = req.params;
//         const projectDir = ensureProjectDirectory(projectId);

//         // Initialize Git repository
//         const git = simpleGit(projectDir);
//         await git.init();

//         // Update project in database to mark Git initialized
//         await prisma.project.update({
//             where: { id: projectId },
//             data: { gitInitialized: true }
//         });

//         res.json({ success: true, message: 'Git repository initialized' });
//     } catch (error) {
//         console.error('Git initialization error:', error);
//         res.status(500).json({ error: 'Failed to initialize Git repository' });
//     }
// });

// // Commit changes
// router.post('/commit/:projectId', authMiddleware.authUser, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
//     try {
//         const { projectId } = req.params;
//         const { message, files }: GitCommitData = req.body;
//         const projectDir = ensureProjectDirectory(projectId);
//         const git = simpleGit(projectDir);

//         // Stage specified files or all files
//         if (files && files.length > 0) {
//             await git.add(files);
//         } else {
//             await git.add('.');
//         }

//         // Commit changes
//         const commitResult = await git.commit(message || 'Automatic commit');

//         // Create a version record in the database
//         const version = await prisma.projectVersion.create({
//             data: {
//                 projectId,
//                 commitHash: commitResult.commit,
//                 message: message || 'Automatic commit',
//                 createdAt: new Date(),
//                 userId: req.user.id // Assuming authenticated user
//             }
//         });

//         res.json({
//             success: true,
//             commitHash: commitResult.commit,
//             version: version
//         });
//     } catch (error) {
//         console.error('Git commit error:', error);
//         res.status(500).json({ error: 'Failed to commit changes' });
//     }
// });

// // Get project version history
// router.get('/versions/:projectId', authMiddleware.authUser, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
//     try {
//         const { projectId } = req.params;
//         const projectDir = ensureProjectDirectory(projectId);
//         const git = simpleGit(projectDir);

//         // Fetch version history from database
//         const versions = await prisma.projectVersion.findMany({
//             where: { projectId },
//             orderBy: { createdAt: 'desc' },
//             include: { user: { select: { id: true, email: true } } }
//         });

//         // Optionally fetch additional Git log information
//         const logOptions = {
//             from: versions[0]?.commitHash || 'HEAD',
//             maxCount: 50
//         };
//         const gitLog = await git.log(logOptions);

//         res.json({
//             versions,
//             gitLog: gitLog.all
//         });
//     } catch (error) {
//         console.error('Version history error:', error);
//         res.status(500).json({ error: 'Failed to retrieve version history' });
//     }
// });

// // Revert to a specific version
// router.post('/revert/:projectId', authMiddleware.authUser, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
//     try {
//         const { projectId } = req.params;
//         const { commitHash } = req.body;
//         const projectDir = ensureProjectDirectory(projectId);
//         const git = simpleGit(projectDir);

//         // Reset to specific commit
//         await git.reset(['--hard', commitHash]);

//         // Create a revert version record
//         const version = await prisma.projectVersion.create({
//             data: {
//                 projectId,
//                 commitHash,
//                 message: `Reverted to commit ${commitHash}`,
//                 createdAt: new Date(),
//                 userId: req.user.id,
//                 isRevert: true
//             }
//         });

//         res.json({
//             success: true,
//             message: 'Project reverted successfully',
//             version
//         });
//     } catch (error) {
//         console.error('Git revert error:', error);
//         res.status(500).json({ error: 'Failed to revert project' });
//     }
// });

// // Compare two versions
// router.get('/compare/:projectId', authMiddleware.authUser, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
//     try {
//         const { projectId } = req.params;
//         const { baseCommit, targetCommit } = req.query;
//         const projectDir = ensureProjectDirectory(projectId);
//         const git = simpleGit(projectDir);

//         // Get diff between two commits
//         const diff = await git.diff([baseCommit as string, targetCommit as string]);

//         res.json({
//             success: true,
//             diff
//         });
//     } catch (error) {
//         console.error('Git compare error:', error);
//         res.status(500).json({ error: 'Failed to compare versions' });
//     }
// });


// export default router
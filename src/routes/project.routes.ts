import Router from 'express'
import { body } from 'express-validator'
import * as projectController from '../controllers/project.controller'
import * as authMiddleware from '../middleware/auth.middleware'
const router = Router()

router.post('/create',
    authMiddleware.authUser,
    body('name').isString().withMessage('Name is required'),
    body('language').isString().withMessage('Language is required'),
    body('description').isString().withMessage('Description is required'),
    projectController.createProjectController
)

router.get('/all',
    authMiddleware.authUser,
    projectController.getAllProjectController
)

router.put('/add-user',
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail().custom((users) => users.every((user: any) => typeof user === 'string')).withMessage('Each user must be a string'),
    authMiddleware.authUser,
    projectController.addUserToProjectController
)

router.get('/get-project/:projectId',
    authMiddleware.authUser,
    projectController.getProjetctByIdController
)

router.put('/update-file-tree',
    authMiddleware.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('fileTree').isObject().withMessage('File tree must be an object'),
    projectController.updateFileTree
)

router.delete('/delete/:projectId',
    authMiddleware.authUser,
    projectController.deleteProjectController
)

router.patch('/rename/:projectId',
    authMiddleware.authUser,
    body('name').isString().withMessage('projectName is required'),
    projectController.renameProjectController
)

export default router;
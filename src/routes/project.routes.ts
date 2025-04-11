import Router from 'express'
import { body } from 'express-validator'
import * as projectController from '../controllers/project.controller'
import * as authMiddleware from '../middleware/auth.middleware'
import { checkAccess } from '../middleware/checkAccess'

const router = Router()

// router.post('/create',
//     authMiddleware.authUser,
//     body('name').isString().withMessage('Name is required'),
//     body('language').isString().withMessage('Language is required'),
//     body('description').isString().withMessage('Description is required'),
//     projectController.createProjectController
// )

router.get('/all',
    authMiddleware.authUser,
    projectController.getAllProjectController
)

router.put('/add-user',
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail().custom((users) => users.every((user: any) => typeof user === 'string')).withMessage('Each user must be a string'),
    body('accessLevel').isString().withMessage('Access level is required').isIn(['admin', 'readwrite', 'readonly']).withMessage('Access level must be admin, readwrite, or readonly'),
    authMiddleware.authUser,
    projectController.addUserToProjectController
)

router.put('/leave-project',
    body('projectId').isString().withMessage('Project ID is required'),
    authMiddleware.authUser,
    projectController.leaveProjectController
);

router.patch('/update-collaborator-access',
    authMiddleware.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('collaboratorId').isString().withMessage('Collaborator ID is required'),
    body('accessLevel').isString().withMessage('Access level is required').isIn(['admin', 'readwrite', 'readonly']).withMessage('Access level must be admin, readwrite, or readonly'),
    projectController.updateCollaboratorAccessController
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

// router.patch('/rename/:projectId',
//     authMiddleware.authUser,
//     body('name').isString().withMessage('projectName is required'),
//     projectController.renameProjectController
// )

router.patch('/update/:projectId',
    authMiddleware.authUser,
    body('name').optional().isString().withMessage('Project name is required if provided'),
    body('language').optional().isString().withMessage('Language is required if provided'),
    body('description').optional().isString().withMessage('Description is required if provided'),
    body('scheduledTime').optional().isISO8601().withMessage('Scheduled time must be a valid ISO 8601 date if provided'),
    body('expiryTime').optional().isISO8601().withMessage('Expiry time must be a valid ISO 8601 date if provided'),
    body('adminOnlyEdit').optional().isBoolean().withMessage('Admin-only edit must be a boolean if provided'),
    projectController.renameProjectController
);

router.post('/share-link',
    authMiddleware.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('accessLevel').optional().isString().isIn(['readwrite', 'readonly']).withMessage('Access level must be readwrite or readonly'),
    body('expirationDays').optional().isInt({ min: 1, max: 30 }).withMessage('Expiration days must be between 1 and 30'),
    projectController.generateShareLinkController
)

// Join a project using a share link
router.get('/join/:token',
    authMiddleware.authUser,
    projectController.joinProjectViaLinkController
)

router.post('/remove-collaborator',
    authMiddleware.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('collaboratorId').isString().withMessage('collaboratorId is required'),
    projectController.removeCollaboratorController
)

router.patch('/toggle-admin-only-edit/:projectId',
    authMiddleware.authUser,
    projectController.toggleAdminOnlyEditController
);

router.post(
    '/add-message',
    authMiddleware.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('message').isString().withMessage('message is required'),
    projectController.addMessageController
);


router.post('/create',
    authMiddleware.authUser,
    body('name').isString().withMessage('Name is required'),
    body('language').isString().withMessage('Language is required'),
    body('description').isString().withMessage('Description is required'),
    body('scheduledTime')
        .optional()
        .isISO8601().withMessage('Scheduled time must be a valid ISO 8601 date'),
    body('expiryTime')
        .optional()
        .isISO8601().withMessage('Expiry time must be a valid ISO 8601 date'),
    projectController.createProjectController
);



export default router
import { Router } from 'express'
import * as aiController from '../controllers/ai.controller'
import { authUser } from '../middleware/auth.middleware'

const router = Router()
router.get('/get-result', authUser, aiController.getResult)

export default router;
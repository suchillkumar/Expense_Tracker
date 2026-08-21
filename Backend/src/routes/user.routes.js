import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'
import * as authController from '../controllers/authController.js'
import * as dataController from '../controllers/dataController.js'

const router = Router()
router.use(authenticate)

router.get('/profile', asyncHandler(authController.getCurrentUser))
router.put('/profile', asyncHandler(authController.updateProfile))
router.patch('/profile', asyncHandler(authController.updateProfile))
router.put('/password', asyncHandler(authController.changePassword))
router.patch('/password', asyncHandler(authController.changePassword))
router.delete('/account', asyncHandler(dataController.deleteAccount))

export default router

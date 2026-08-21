import { Router } from 'express'
import { verifyJWT } from '../middlewares/verifyJWT'
import { authorize } from '../middlewares/verifyRole'
import * as superAdminController from "../controller/super-admin.controller"
import { isRunning } from '../middlewares/verifyStartStatus'

const router: Router = Router()

router.get('/pendingAdmin', verifyJWT, authorize('super-admin'), superAdminController.getPendingAdmins)

router.patch("/manage/:adminId", verifyJWT, authorize('super-admin'), superAdminController.manageApproval)

router.get("/admins", verifyJWT, authorize('super-admin', 'admin'), superAdminController.getApprovedAdmins)       // list of all approved admins

router.delete("/admin/:adminId", verifyJWT, authorize("super-admin"), superAdminController.deleteAdmin)

router.patch("/startGame", verifyJWT, authorize('super-admin'), superAdminController.startGame)

// finish the game (we have options for both auto-finish (using BullMQ worker) and explicit finish by the super-admin before the game duration ends. In this route, we are only handling the explicit finish by super-admin)
router.patch("/endGame", verifyJWT, authorize('super-admin'), isRunning, superAdminController.endGame)

router.patch("/extraPoints", verifyJWT, authorize('super-admin'), isRunning, superAdminController.allocateExtraPoints)

router.patch("/disqualify/:groupId", verifyJWT, authorize('super-admin'), superAdminController.disqualifyGroup)

router.post("/specialGroup", verifyJWT, authorize('super-admin'), superAdminController.createSpecialGroup)

router.get("/results", verifyJWT, authorize('super-admin'), superAdminController.getResults)


export default router
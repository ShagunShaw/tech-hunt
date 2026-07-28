import { Router } from 'express'
import { verifyJWT } from '../middlewares/verifyJWT'
import { authorize } from '../middlewares/verifyRole'
import * as superAdminController from "../controller/super-admin.controller"

const router: Router = Router()

router.get('/pendingAdmin', verifyJWT, authorize('super-admin'), superAdminController.getPendingAdmins)

router.patch("/:adminId/manage", verifyJWT, authorize('super-admin'), superAdminController.manageApproval)

router.get("/admins", verifyJWT, authorize('super-admin', 'admin'), superAdminController.getApprovedAdmins)       // list of all approved admins

router.delete("/admin/:adminId", verifyJWT, authorize("super-admin"), superAdminController.deleteAdmin)

router.patch("/startGame", verifyJWT, authorize('super-admin'), superAdminController.startGame)

finish the game (we have options for both auto-finish and explicit finish by the super-admin before the game duration ends, in this route we are only handling the explicit finish by super-admin)
For auto-finish, we will use Bull Queue . Will Schedule it to run at startTime + duration, set isStarted = false automatically in the db, to auto-finish our game
router.patch("/endGame", verifyJWT, authorize('super-admin'), superAdminController.endGame)

allocate extra points to each team depending upon the level reached

Add a feature to disqualify a group (If a group is disqualified, its records and its members records still remains in the Database, only the status is updated from 'active' to 'disqualified')

Add a special case group (by super-admin only). Like when participant form group -> the group should have members of four unique genres. now there can be cases where there are 3, 2 or 5 members, in that case a special group is formed not by participant but by super-admin, where he can create group of any number of members, and give them their initial points accordingly


export default router
import { Router } from 'express'
import { verifyJWT } from '../middlewares/verifyJWT'
import { authorize } from '../middlewares/verifyRole'
import { isRunning } from '../middlewares/verifyStartStatus'
import * as gameController from "../controller/game.controller"

const router: Router= Router()


router.get("/startQR/:groupId", isRunning, verifyJWT, authorize('participant'), gameController.scanStartQR)

router.get("/QR/:groupId", isRunning, verifyJWT, authorize('participant'), gameController.scanQR)

router.get("/hints/:groupId", isRunning, verifyJWT, authorize('participant'), gameController.useHints)

// (FRONTEND PART) Solve the question and match its answer from the given array of answers, if succeded, then only navigate it to the 'points_assigning' route ins backend, else not; there is no limit in attempting to answers, but there is a limit to access to hints

router.patch("/points/:groupId", isRunning, verifyJWT, authorize('participant'), gameController.updatePoints)


export default router;
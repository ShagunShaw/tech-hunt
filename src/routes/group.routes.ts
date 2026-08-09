import { Router } from 'express'
import * as group from '../controller/group.controller'
import { verifyJWT } from '../middlewares/verifyJWT';
import { authorize } from '../middlewares/verifyRole'
import { isRunning } from '../middlewares/verifyStartStatus';

const router: Router= Router()

// See 'notes.txt' on why we are allowing group/genre creation even after my game has started running

// abort the game
router.patch('/abort/:groupId', verifyJWT, authorize('participant'), isRunning, group.abort)

Scan QR and solve given question (can have two different routes or can be done in one route only, check accordingly). Also check yh game routes mei hoga ya group routes mei hi

// participant genre register
router.post('/genre', verifyJWT, authorize('participant'), group.registerGenre)

// create groups when game starts (to be handled in detail)
router.post('/create', verifyJWT, authorize('participant'), group.createGroup)

// join group by other members
router.post('/join', verifyJWT, authorize('participant'), group.joinGroup)

export default router;
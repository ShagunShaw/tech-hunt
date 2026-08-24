import { Router } from 'express'
import * as group from '../controller/group.controller'
import { verifyJWT } from '../middlewares/verifyJWT';
import { authorize } from '../middlewares/verifyRole'
import { isRunning } from '../middlewares/verifyStartStatus';
import { moderateLimiter, relaxedLimiter } from '../rateLimiting/rateLimits';

const router: Router= Router()

// See 'notes.txt' on why we are allowing group/genre creation even after my game has started running

router.patch('/abort/:groupId', moderateLimiter, verifyJWT, authorize('participant'), isRunning, group.abort)

// participant genre register
router.post('/genre', relaxedLimiter, verifyJWT, authorize('participant'), group.registerGenre)

// create groups when game starts
router.post('/create', moderateLimiter, verifyJWT, authorize('participant'), group.createGroup)

// join group by other members
router.post('/join', relaxedLimiter, verifyJWT, authorize('participant'), group.joinGroup)

// For this, our route will be: http://localhost:3000/api/v1/group/?page=<page_value>&limit=<limit_value>
router.get('/', verifyJWT, authorize('super-admin'), group.getAllGroups)

export default router;
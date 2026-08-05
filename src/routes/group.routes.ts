import { Router } from 'express'
import * as group from '../controller/group.controller'
import { verifyJWT } from '../middlewares/verifyJWT';
import { authorize } from '../middlewares/verifyRole'
import client from '../redis.config';
import type { Response, NextFunction } from 'express';
import { apiError } from '../utils/ApiError';
import { isRunning } from '../middlewares/verifyStartStatus';

const router: Router= Router()

// abort the game
router.patch('/abort/:groupId', verifyJWT, authorize('participant'), isRunning, group.abort)

Scan QR and solve given question (can have two different routes or can be done in one route only, check accordingly). Also check yh game routes mei hoga ya group routes mei hi



const isNotRunning = async (req: any, res: Response, next: NextFunction) => {
    const running = await client.get('game:isRunning')
    if(running === 'true') return res.status(403).json(new apiError(403, "Game Running", "Cannot create/join groups/genres once game has started"))
    return next()
}

router.use(isNotRunning)

// participant genre register
router.post('/genre', verifyJWT, authorize('participant'), group.registerGenre)

// create groups when game starts (to be handled in detail)
router.post('/create', verifyJWT, authorize('participant'), group.createGroup)

// join group by other members
router.post('/join', verifyJWT, authorize('participant'), group.joinGroup)

export default router;
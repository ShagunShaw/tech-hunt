Koi team agr time se phle game khtm krta h, ya phir uska time duration end ho jata h (i.e. game ended before team could finish its game) toh bhi, last mei uska 'timeTaken' field add krna mtt bhulna



before accessing any game route check whether the groupId is aborted/disqualified or not (check it from redis, we had stored there)


Q) how do you know which group is making the request to your game routes?
Ans) Dont trust frontend for groupId as anyone can send any groupId.

Instead fetch groupId from DB using req.user.id:

""" req.user.id → query GroupMember table → get their groupId """

or/also ,

Store this in Redis against participantId at group creation time:

"""   "participant:groupId:userId" → groupId   """

Then middleware reads from Redis — fast, no DB call, trustworthy. ✅



Also ensure that once a team had scanned a QR and successfully passed that particular level, they cannot scan/access that same QR twice. Also If Possible, try to maintain QR order for each group, like if a grouo had passed level 2 and somehow gets the QR for level 4 and tries to scan it, we should prevent it from happening. they can only access level 4 after accessing level 3.


import { Router } from 'express'
import { verifyJWT } from '../middlewares/verifyJWT'
import { authorize } from '../middlewares/verifyRole'
import { isRunning } from '../middlewares/verifyStartStatus'
import * as gameController from "../controller/game.controller"
import { aliasedRelation } from 'drizzle-orm'

const router: Router= Router()


router.get("/startQR/:groupId", isRunning, verifyJWT, authorize('participant'), gameController.scanStartQR)

router.get("/QR/:groupId", isRunning, verifyJWT, authorize('participant'), gameController.scanQR)


(I think this part is purely frontend) Solve the question and match its answer from the given array of answers, if succeded, show the message, else show "Wrong Answer"; there is no limit in attempting to answers, but there is a limit to access to hints


give points to a group (student can attempt multiple answer for the given question, there is no limit to that. When the answer matches with any of the value of the answer array, we will call this backend route and update the points, maxlevelReached, etc.(if any other field/s also need to be updated, check that) of that team. After updating the values, we will return the message of the next level as response). Add all three midllwares here also


Use hints (of course limited, depending upon the points they had)
router.get("/hints", isRunning, verifyJWT, authorize('participant'), gameController.useHints)

export default router;
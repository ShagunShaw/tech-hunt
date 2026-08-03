import { Router } from "express";
import { verifyJWT } from "../middlewares/verifyJWT";
import { authorize } from "../middlewares/verifyRole";
import * as question from "../controller/question.controller"

const router: Router= Router()

// The six tech domains we have are: DSA, Web, AI/ML, Cybersecurity, Cloud & Devops, BlockChain (we'll hardcode this)

router.post("/", verifyJWT, authorize('admin', 'super-admin'), question.addQuestion)


// Updating the 'hints' is not included in this route, we have a separate route for that
router.patch("/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.updateQuestion)

router.delete("/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.deleteQuestion)

/**
 * Here, we will have two types of routes:
 * a) http://localhost:3000/api/v1/question/?domain=<domain_name>&page=<page_value>&limit=<limit_value>
 * b) http://localhost:3000/api/v1/question/?page=<page_value>&limit=<limit_value>
 */
router.get("/", verifyJWT, authorize('admin', 'super-admin'), question.getAllQuestion)         // New concept learnt here

router.post("/hints/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.addMoreHints)

router.get("/hints/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.getAllHints)

router.delete("/hints/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.deleteHints)

router.patch("/hints/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.updateHints)

Assign questions at the time of game start, I think iska sirf service hi banana hoga jo ki startGame service mei call hoga, so check it once

export default router;
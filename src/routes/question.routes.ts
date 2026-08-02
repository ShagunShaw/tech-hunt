import { Router } from "express";
import { verifyJWT } from "../middlewares/verifyJWT";
import { authorize } from "../middlewares/verifyRole";
import * as question from "../controller/question.controller"

const router: Router= Router()

// The six tech domains we have are: DSA, Web, AI/ML, Cybersecurity, Cloud & Devops, BlockChain (we'll hardcode this)

router.post("/", verifyJWT, authorize('admin', 'super-admin'), question.addQuestion)

router.patch("/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.updateQuestion)

router.delete("/:questionId", verifyJWT, authorize('admin', 'super-admin'), question.deleteQuestion)

/**
 * Here, we will have two types of routes:
 * a) http://localhost:3000/api/v1/question/?domain=<domain_name>&page=<page_value>&limit=<limit_value>
 * b) http://localhost:3000/api/v1/question/?page=<page_value>&limit=<limit_value>
 */
router.get("/", verifyJWT, authorize('admin', 'super-admin'), question.getQuestion)         // New concept learnt here

Add the 'Hints' part also after updating the schema. Decide whether 'hints' should be made compulsory or optional for a question, whether it should be a hint only or array of hints (at max 3), whether there should be a separate routes for managing hints (CRUD operations) or they will be implemented in the CRUD operations of 'Questions' only

Assign questions at the time of game start, I think iska sirf service hi banana hoga jo ki startGame service mei call hoga, so check it once

export default router;
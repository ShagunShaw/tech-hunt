import { Router } from 'express'
import { verifyJWT } from '../middlewares/verifyJWT'
import { authorize } from '../middlewares/verifyRole'
import * as theme from "../controller/theme.controller"

const router: Router= Router()

router.post("/", verifyJWT, authorize('admin', 'super-admin'), theme.createTheme)

router.patch("/", verifyJWT, authorize('admin', 'super-admin'), theme.updateTheme)

router.delete("/", verifyJWT, authorize('admin', 'super-admin'), theme.deleteTheme)

router.post("/message/:theme", verifyJWT, authorize('admin', 'super-admin'), theme.addThemeMessage)

router.patch("/message/:theme", verifyJWT, authorize('admin', 'super-admin'), theme.updateThemeMessage)

router.delete("/message/:theme", verifyJWT, authorize('admin', 'super-admin'), theme.deleteThemeMessage)

router.post("/reorder/:theme", verifyJWT, authorize('admin', 'super-admin'), theme.reorderThemeMessage)


export default router;
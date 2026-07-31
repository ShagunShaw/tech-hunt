import { Router } from 'express'
import { verifyJWT } from '../middlewares/verifyJWT'
import { authorize } from '../middlewares/verifyRole'
import * as theme from "../controller/theme.controller"

const router: Router= Router()

router.get("/", verifyJWT, authorize('admin', 'super-admin'), theme.getAllThemes) 

router.post("/", verifyJWT, authorize('admin', 'super-admin'), theme.createTheme)

router.patch("/:themeId", verifyJWT, authorize('admin', 'super-admin'), theme.updateTheme)

router.delete("/:themeId", verifyJWT, authorize('admin', 'super-admin'), theme.deleteTheme)

router.get("/:themeId", verifyJWT, authorize('admin', 'super-admin'), theme.getAllThemeMessages)

router.post("/message/:themeId", verifyJWT, authorize('admin', 'super-admin'), theme.addThemeMessage)

router.patch("/message/:messageId", verifyJWT, authorize('admin', 'super-admin'), theme.updateThemeMessage)

router.delete("/message/:messageId", verifyJWT, authorize('admin', 'super-admin'), theme.deleteThemeMessage)

router.post("/reorder/:themeId", verifyJWT, authorize('admin', 'super-admin'), theme.reorderThemeMessage)


export default router;

last mei ek ya do routes aur banana h (dont know in which file), jha pe you can fetch the message and question of a particular theme at a particular stage. Yha toh themes and uska messages 'getAll' krre h, but for a particular theme, we need to fetch the message and question also for a given stage; and make sure to make these two routes public and not protected
import { Router } from 'express'
import * as user from '../controller/user.controller'
import { verifyJWT } from '../middlewares/verifyJWT';

const router: Router= Router()


router.get("/health", (req, res) => res.json({message: "Server is healthy"}))

router.get('/auth/google/register', user.googleParticipantRedirect);         

router.get('/auth/google/register/callback', user.googleParticipantCallback)

router.post('/register', user.partcipantRegister)

router.get('/auth/google/login', user.googleParticipantLoginRedirect);         

router.get('/auth/google/login/callback', user.googleParticipantLoginCallback)


router.get('/auth/google/admin/register', user.googleAdminRedirect);         

router.get('/auth/google/admin/register/callback', user.googleAdminCallback)

router.post('/admin/register', user.adminRegister)

router.get('/auth/google/admin/login', user.googleAdminLoginRedirect);         

router.get('/auth/google/admin/login/callback', user.googleAdminLoginCallback)


router.get('/auth/google/superAdmin/login', user.googleSuperadminLoginRedirect);         

router.get('/auth/google/superAdmin/login/callback', user.googleSuperadminLoginCallback)

router.post("/logout", verifyJWT, user.logoutUser)     // logout for every role


export default router;
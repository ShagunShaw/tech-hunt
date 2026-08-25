import type { Request, Response } from 'express'
import * as userService from '../service/user.service'
import { apiError } from '../utils/ApiError'
import { apiResponse } from '../utils/ApiResponse'

google console mei jaake last mei select kro, what all info you want from person google account like email, username, and googleId

export const googleParticipantRedirect = (req: Request, res: Response) => {
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/register/callback';
    const url = userService.googleRedirect(redirectUri)

    return res.redirect(url);
}

export const googleParticipantCallback = async (req: Request, res: Response) => {
    try {
        const redirectUri = 'http://localhost:3000/api/v1/auth/google/register/callback';
        const code = req.query.code;
        if (!code) return res.status(400).json(new apiError(400, "Bad Request", "No code recieved from this google account"))

        const token = await userService.googleRegisterCallback(code, redirectUri, 'participant')

        return res.cookie('googleTempData', token, { httpOnly: true, secure: true })
            .redirect('http://localhost:5500/registerPage2.html')
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

// For now, we will let all candidates to register and play the game (on the day of the game), no filtering among them on basis of First-Come-First-Serve; i.e. if 500 candidates registered for the game, we will let all 500 play the game
export const partcipantRegister = async (req: Request, res: Response) => {
    try {
        const { phone, college, department, year } = req.body

        const token = req.cookies?.googleTempData
        if (!token) return res.status(500).json(new apiError(500, "Token Not Found", "googleTempData token not found"))

        const data = await userService.register(token, phone, college, department, year)

        return res.status(201)
            .clearCookie('googleTempData')
            .json(new apiResponse(201, data, "Participant registered successfully"))
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const googleAdminRedirect = (req: Request, res: Response) => {
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/admin/register/callback';
    const url = userService.googleRedirect(redirectUri)

    return res.redirect(url);
}

export const googleAdminCallback = async (req: Request, res: Response) => {
    try {
        const redirectUri = 'http://localhost:3000/api/v1/auth/google/admin/register/callback';
        const code = req.query.code;
        if (!code) return res.status(400).json(new apiError(400, "Bad Request", "No code recieved from this google account"))

        const token = await userService.googleRegisterCallback(code, redirectUri, 'admin')

        return res.cookie('googleTempData', token, { httpOnly: true, secure: true })
            .redirect('http://localhost:5500/adminRegisterPage2.html')
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const adminRegister = async (req: Request, res: Response) => {
    try {
        const { phone, description } = req.body

        const token = req.cookies?.googleTempData
        if (!token) return res.status(500).json(new apiError(500, "Token Not Found", "googleTempData token not found"))

        const data = await userService.registerAdmin(token, phone, description)

        // After displaying the success message(along with the message "waiting for super-admin to approve your request"), navigate admin to the home page only, no login after registartion

        return res.status(201)
            .clearCookie('googleTempData')
            .json(new apiResponse(201, data, "Admin registered successfully, waiting for super-admin to approve your request"))
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const googleParticipantLoginRedirect = (req: Request, res: Response) => {
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/login/callback';
    const url = userService.googleRedirect(redirectUri)

    return res.redirect(url);
}

export const googleParticipantLoginCallback = async (req: Request, res: Response) => {
    try {
        const redirectUri = 'http://localhost:3000/api/v1/auth/google/login/callback';
        const code = req.query.code;
        if (!code) return res.status(400).json(new apiError(400, "Bad Request", "No code recieved from this google account"))

        const { accessToken, refreshToken, result } = await userService.googleLoginCallback(code, redirectUri, 'participant')

        // (FRONTEND PART) Now that the participant had logged in, we have to decide what contents we want to display them. If game is not running, then display them only the static 'Rules Page', else display the contents of the game. For that, we had added an extra field 'isGameRunning' in our 'result' so that the frontend can know whether the game is running or not   

        return res.status(200)
            .cookie('accessToken', accessToken, { httpOnly: true, secure: true })
            .cookie('refreshToken', refreshToken, { httpOnly: true, secure: true })
            .json(new apiResponse(200, result, "User logged in successfully"))

    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const googleAdminLoginRedirect = (req: Request, res: Response) => {
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/admin/login/callback';
    const url = userService.googleRedirect(redirectUri)

    return res.redirect(url);
}

export const googleAdminLoginCallback = async (req: Request, res: Response) => {
    try {
        const redirectUri = 'http://localhost:3000/api/v1/auth/google/admin/login/callback';
        const code = req.query.code;
        if (!code) return res.status(400).json(new apiError(400, "Bad Request", "No code recieved from this google account"))

        // (FRONTEND PART) Now that the admin had logged in, we have to decide what contents we want to display them. If game is not running, then display them the contents accordingly. For that, we had added an extra field 'isGameRunning' in our 'result' so that the frontend can know whether the game is running or not  
        const { accessToken, refreshToken, result } = await userService.googleLoginCallback(code, redirectUri, 'admin')

        return res.status(200)
            .cookie('accessToken', accessToken, { httpOnly: true, secure: true })
            .cookie('refreshToken', refreshToken, { httpOnly: true, secure: true })
            .json(new apiResponse(200, result, "Admin logged in successfully"))

    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const googleSuperadminLoginRedirect = (req: Request, res: Response) => {
    const redirectUri = 'http://localhost:3000/api/v1/auth/google/superAdmin/login/callback';
    const url = userService.googleRedirect(redirectUri)

    return res.redirect(url);
}

export const googleSuperadminLoginCallback = async (req: Request, res: Response) => {
    try {
        const redirectUri = 'http://localhost:3000/api/v1/auth/google/superAdmin/login/callback';
        const code = req.query.code;
        if (!code) return res.status(400).json(new apiError(400, "Bad Request", "No code recieved from this google account"))

        // (FRONTEND PART) Now that the super-admin had logged in, we have to decide what contents we want to display them. If game is not running, then display them the contents accordingly and if it's running then display the contents accordingly. For that, we had added an extra field 'isGameRunning' in our 'result' so that the frontend can know whether the game is running or not  
        const { accessToken, refreshToken, result } = await userService.googleLoginCallback(code, redirectUri, 'super-admin')

        return res.status(200)
            .cookie('accessToken', accessToken, { httpOnly: true, secure: true })
            .cookie('refreshToken', refreshToken, { httpOnly: true, secure: true })
            .json(new apiResponse(200, result, "Super-Admin logged in successfully"))

    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const logoutUser = async (req: any, res: Response) => {
    try {
        const user = req.user

        await userService.logout(user)

        return res.status(200)
                  .clearCookie('accessToken')
                  .clearCookie('refreshToken')
                  .json(new apiResponse(200, [], "User logged out successfully"))
    } catch (error: any) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}
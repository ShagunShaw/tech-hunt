import type { Request, Response } from 'express'
import { apiError } from '../utils/ApiError';
import * as themeService from "../service/theme.service"
import { apiResponse } from '../utils/ApiResponse';


export const getAllThemes = async (req: Request, res: Response) => {
    try {
        const result = await themeService.getAllTheme();

        return res.status(200)
            .json(new apiResponse(200, result, "Themes fetched successfully!"))
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

export const createTheme = async (req: Request, res: Response) => {
    try {
        const { theme } = req.body

        const result = await themeService.createTheme(theme)

        return res.status(201)
            .json(new apiResponse(201, result, "Theme registered successfully"))
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json(
                new apiError(409, "Conflict Error", "Cannot have duplicate themes in the db")
            );
        }

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

export const updateTheme = async (req: Request, res: Response) => {
    try {
        const { themeId } = req.params
        const { newThemeName } = req.body

        const result = await themeService.updateTheme(themeId, newThemeName)

        return res.status(200)
            .json(new apiResponse(200, result, "Theme updated successfully!"))

    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json(
                new apiError(409, "Conflict Error", "Cannot have duplicate themes in the db")
            );
        }

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

export const deleteTheme = async (req: Request, res: Response) => {
    try {
        const { themeId } = req.params

        const result = themeService.deleteTheme(themeId)

        return res.status(200)
            .json(new apiResponse(200, result, "Theme deleted Successfully!"))
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

export const getAllThemeMessages = async (req: Request, res: Response) => {
    try {
        const { themeId } = req.params
        
        const result = themeService.gettAllMessage(themeId)

        return res.status(200)
                  .json(new apiResponse(200, result, "Theme Messages fetched successfully!"))
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

export const addThemeMessage = async (req: Request, res: Response) => {
    try {
        const { themeId } = req.params
        const { message } = req.body

        const result = themeService.addMessage(themeId, message)

        return res.status(201)
            .json(new apiResponse(201, result, "Theme message added successfully"))
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

export const updateThemeMessage = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params
        const { updatedMessage } = req.body

        const result = themeService.updateMessage(messageId, updatedMessage)

        return res.status(200)
            .json(new apiResponse(200, result, "Message updated successfully!"))
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

export const deleteThemeMessage = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params

        const result = themeService.deleteMessage(messageId)

        return res.status(200)
            .json(new apiResponse(200, result, "Message Deleted Successfully"))
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

export const reorderThemeMessage = async (req: any, res: Response) => {
    try {
        const { themeId } = req.params
        const { newOrder } = req.body       // The updated order of the array will be sent from frontend, coz only it can keep record of the order that user had changed via frontend

        const result = themeService.reorderMessage(themeId, newOrder)

        return res.status(200)
            .json(new apiResponse(200, result, "Messages re-ordered successfully!"))
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
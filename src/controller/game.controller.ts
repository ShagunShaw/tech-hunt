import { apiError } from "../utils/ApiError";
import type { Request, Response } from 'express'
import { apiResponse } from "../utils/ApiResponse";
import * as gameService from "../service/game.service"

export const scanStartQR = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params
        
        const result = await gameService.scanStartQR(groupId);

        return res.status(200).json(new apiResponse(200, result, "Start message fetched successfully!"))
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

export const scanQR = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params
        const { themeId, level } = req.body    // frontend will send this after scanning the QR

        const { finalResult, parsedLevel } = await gameService.scanQR(groupId, themeId, level);

        return res.status(200).json(new apiResponse(200, finalResult, `Question for level ${parsedLevel} fetched successfully`))

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

export const useHints = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params
        const { level } = req.body          // will provide the level value for which the hint is being requested

        const finalResult = await gameService.useHints(groupId, level)

        return res.status(200)
            .json(new apiResponse(200, finalResult, "Hint fetched successfully!"))
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

export const updatePoints = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params

        const finalResult = gameService.updatePoints(groupId)

        return res.status(200).json(new apiResponse(200, finalResult, "Points updated successfully. Take the next message provided and move ahead"))
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
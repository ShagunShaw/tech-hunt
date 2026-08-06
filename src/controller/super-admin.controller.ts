import type { Request, Response } from "express";
import { apiError } from "../utils/ApiError";
import * as superAdminService from "../service/super-admin.service"
import { apiResponse } from "../utils/ApiResponse";
import { statusSchema } from "../validations/tokenUser.type"
import { db } from "../drizzle/db";

export const getPendingAdmins = async (req: Request, res: Response) => {
    try {
        const data = await superAdminService.getAdmins("pending");

        return res.status(200).json(new apiResponse(200, data, "Pending Admins fetched successfully"))
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

export const manageApproval = async (req: Request, res: Response) => {
    try {
        Wait, instead of approving each admin one by one, which would lead to multiple db calls, replace this now and use 'Batch Processing', to approve multiple admins at once.
            const { adminId } = req.params

        if (!adminId) return res.status(400).json(new apiError(400, "Admin Id missing", "Admin id is missing in params"))

        const { status } = req.body
        if (!status || !statusSchema.safeParse(status).success) return res.status(400).json(new apiError(400, "Error with status field", "status field is either missing or is not in the required format"))

        const data = await superAdminService.manageApprovalService(parseInt(adminId as string), status)

        return res.status(200).json(new apiResponse(200, data, "Admin approved successfully"))
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

export const getApprovedAdmins = async (req: Request, res: Response) => {
    try {
        const data = await superAdminService.getAdmins("approved");

        return res.status(200).json(new apiResponse(200, data, "Approved Admins fetched successfully"))
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

export const deleteAdmin = async (req: Request, res: Response) => {
    try {
        Instead of deleting each admin one by one, which would lead to multiple db calls, replace this now and use 'Batch Processing', to delete multiple admins at once.
            const { adminId } = req.params

        if (!adminId) return res.status(400).json(new apiError(400, "Admin Id missing", "Admin id not found in params"))

        const data = superAdminService.deleteAdminService(parseInt(adminId as string))

        return res.status(200).json(new apiResponse(200, data, "Admin deleted successfully"))
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

export const startGame = async (req: any, res: Response) => {
    try {
        const result = await superAdminService.startGame();

        return res.status(200).json(new apiResponse(200, result, "Game Started!"))

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

export const endGame = async (req: any, res: Response) => {
    try {
        const result = await superAdminService.endGame();

        return res.status(200).json(new apiResponse(200, result, "Game Ended!"))
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

export const disqualifyGroup = async (req: any, res: Response) => {
    try {
        const { groupId } = req.body

        const result = await superAdminService.disqualifyGroup(groupId);

        return res.status(200)
            .json(new apiResponse(200, result, "Group has been disqualified successfully"))
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

export const createSpecialGroup = async (req: any, res: Response) => {
    try {
        const { groupId, groupName } = req.body        // any of them can be 'undefined' if more than 1 members are left to form the group or not, accordingly
        
        const result = await superAdminService.createSpecialGroup(groupId, groupName);

        return res.status(201)
            .json(new apiResponse(201, result, "Left Member/s added successfully to a group"))
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
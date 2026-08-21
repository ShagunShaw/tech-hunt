import type { Request, Response } from "express";
import { apiError } from "../utils/ApiError";
import * as superAdminService from "../service/super-admin.service"
import { apiResponse } from "../utils/ApiResponse";
import { statusSchema } from "../validations/tokenUser.type"

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
        const { adminId, status } = req.body;

        if (!adminId || isNaN(Number(adminId))) {
            return res.status(400).json(
                new apiError(400, "Admin Id missing", "adminId must be a valid number in req.body")
            );
        }

        if (!status || !statusSchema.safeParse(status).success) {
            return res.status(400).json(
                new apiError(400, "Error with status field", "status field is either missing or invalid")
            );
        }

        const data = await superAdminService.manageApprovalService(Number(adminId), status);

        return res.status(202).json(
            new apiResponse(202, data, "Admin status updated successfully")
        );
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
        const { adminId } = req.params;

        if (!adminId || isNaN(Number(adminId))) {
            return res.status(400).json(
                new apiError(400, "Admin Id missing", "Admin id not found in params")
            );
        }

        const data = await superAdminService.deleteAdminService(parseInt(adminId as string));

        return res.status(202).json(
            new apiResponse(202, data, "Admin deleted successfully")
        );
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
};

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

export const allocateExtraPoints = async (req: any, res: Response) => {
    try {
        // no need to pass anything in req.body or req.param here as the Super-Admin will simply click the "Allocate Extra Points" button in the frontend, then it will be navigated to the backend route (after re-confirming using windows.confirm() in frontend) and then allocate extra points to all groups depending upon their max level reached.

        const result = await superAdminService.allocateExtraPointsByLevel();

        return res.status(200).json(new apiResponse(200, result, "Extra Points allocated successfully to all groups depending on the levels they had reached"))
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

export const getResults = async (req: any, res: Response) => {
    try {
        const groups = await superAdminService.getResults();

        return res.status(200)
                  .json(new apiResponse(200, groups, "Results fetched successfully!"))
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
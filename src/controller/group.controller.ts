import type { Request, Response } from 'express'
import * as groupService from '../service/group.service'
import { apiError } from '../utils/ApiError'
import { apiResponse } from '../utils/ApiResponse'
import { genreSchema } from '../validations/tokenUser.type'


export const registerGenre = async (req: any, res: Response) => {
    try {
        const { genre } = req.body
        const user = req.user

        if (!genre) return res.status(400).json(new apiError(400, "Invalid Body Structure", "Genre is missing in request's body"))

        const parsed = genreSchema.safeParse(genre)
        if (!parsed.success) return res.status(400).json(new apiError(400, "Invalid Genre", "Genre must be sky, sun, earth or moon"))

        await groupService.registerGenre(parsed.data, user.id)

        return res.status(201).json(new apiResponse(201, {}, "Genre Registered"))
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

export const createGroup = async (req: any, res: Response) => {
    try {
        const { groupName } = req.body
        const user = req.user

        const { uniqueId } = await groupService.createGroup(groupName, user.id)

        return res.status(201).json(new apiResponse(201, { uniqueId }, "Group created successfully in redis"))
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

export const joinGroup = async (req: any, res: Response) => {
    try {
        const user = req.user
        const { groupId } = req.body

        const { status, responseData } = await groupService.joinGroup(groupId, user.id)

        if (status === 201) return res.status(201).json(new apiResponse(201, responseData, "Group Successfully created to the db"));

        return res.status(200).json(new apiResponse(200, {}, "User added to group in redis"))
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

export const abort = async (req: any, res: Response) => {
    try {
        const user = req.user
        const { groupId } = req.params

        const { success } = await groupService.abortGroup(user.id, groupId)

        if (!success) return res.status(400).json(new apiError(400, "Cannot Abort", "Either you are not allowed to abort this group as you are not a part of it or the provided groupId does not exists"))

        return res.status(204).json(new apiResponse(204, {}, "Group aborted successfully"))
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

export const getAllGroups = async (req: any, res: Response) => {
    try {
        const { page, limit } = req.query

        const finalResult= await groupService.getAllGroups(page, limit)

        return res.status(200)
                  .json(new apiResponse(200, finalResult, "Group details fetched successfully!"))
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
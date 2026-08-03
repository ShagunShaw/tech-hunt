import type { Request, Response } from "express";
import { apiError } from "../utils/ApiError";
import { apiResponse } from "../utils/ApiResponse";
import * as questionService from "../service/question.service"


export const addQuestion = async (req: Request, res: Response) => {
    try {
        const { question, answer, hints, domain } = req.body

        const result = await questionService.addQuestion(question, domain, answer, hints)

        return res.status(201)
            .json(new apiResponse(201, result, "Question inserted successfully"))
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

export const updateQuestion = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params
        const { question, domain, answer } = req.body       // Frontend can pass any of the values here, not necessarily has to pass all the values. Also, whenever there is a change in the 'answer' : only field value update or the entire array change, always the whole array is sent from the frontend, else it will be hard to detect, which one has actually changed.

        const result = await questionService.updateQuestion(question, domain, answer, questionId)

        return res.status(200)
            .json(new apiResponse(200, result, "Values updated successfully!"))

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

export const deleteQuestion = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params

        const result = await questionService.deleteQuestion(questionId)

        return res.status(200)
            .json(new apiResponse(200, result, "Question deleted successfully!"))
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

export const getAllQuestion = async (req: Request, res: Response) => {
    try {
        const { domain, page, limit } = req.query

        const finalResult = await questionService.getAllQuestion(page, domain, limit)

        return res.status(200)
            .json(new apiResponse(200, finalResult, "Questions fetched successfully"))
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

export const addMoreHints = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params
        const { hints } = req.body

        const result = await questionService.addMoreHints(hints, questionId)

        return res.status(200)
            .json(new apiResponse(200, result, "More hints added successfully"))
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

export const updateHints = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params
        const { index, updatedText } = req.body

        const result = await questionService.updateHints(index, updatedText, questionId)

        return res.status(200)
            .json(new apiResponse(200, result, "Hint updated successfully"))
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

export const deleteHints = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params
        const { index } = req.body

        const result = await questionService.deleteHints(index, questionId)

        return res.status(200).json(
            new apiResponse(200, result, "Hint element removed successfully")
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

export const getAllHints = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params

        const result = await questionService.getAllHints(questionId)

        return res.status(200)
                  .json(new apiResponse(200, result, "Hints fetched successfully"))
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
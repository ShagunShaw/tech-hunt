import { eq } from "drizzle-orm";
import { db } from "../drizzle/db";
import { Question } from "../drizzle/schema";
import { apiError } from "../utils/ApiError";
import { domainSchema } from "../validations/tokenUser.type";
import client from "../redis.config";
import * as z from "zod";

interface UpdatePayload {
    question?: string;
    domain?: z.infer<typeof domainSchema>;
    answer?: string[];
}

export const addQuestion = async (question: string, domain: any, answer: any) => {
    try {
        if (!question || !domain || !answer) throw new apiError(422, "Missing Values", "Either question or domain or answer field is missing")

        // Redis Check
        const exist = await client.exists(`questionCount:domain:${domain}`)
        let val = 0;
        if(exist) {
            val = Number(await client.get(`questionCount:domain:${domain}`))
            if(val >= 6)    throw new apiError(400, "Can't exceed 6", "There can be at max 6 questions for each domain")
        }

        if (!Array.isArray(answer)) throw new apiError(422, "Invalid Format", "'answer' field should be an array even if it has only 1 value")

        const validate = domainSchema.safeParse(domain)
        if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

        const result = await db.insert(Question)
            .values({ question, answer, domain })
            .returning({ id: Question.id })

        if (result.length === 0) throw new apiError(500, "Could not insert", "Something went wrong while inserting the data")

        await client.set(`questionCount:domain:${domain}`, val+1)       // will override if already exists

        return result;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }
        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const updateQuestion = async (question: string, domain: string, answer: any, questionId: any) => {
    try {
        if (!question && !domain && !answer) throw new apiError(422, "Invalid Format", "At least one the question, answer or domain field is required!")

        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        let updatePayload: UpdatePayload = {};

        if (question !== undefined) updatePayload.question = question

        if (domain !== undefined) {
            const validate = domainSchema.safeParse(domain)
            if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

            updatePayload.domain = validate.data
        }

        if (answer !== undefined) {
            if (!Array.isArray(answer) || answer.length === 0) throw new apiError(422, "Invalid Format", "'answer' field should be a non-empty array, even if it has only one changed value")
            updatePayload.answer = answer
        }

        const result = await db.update(Question)
            .set(updatePayload)
            .where(eq(Question.id, parsedQuestionId))
            .returning({ question: Question.question, answer: Question.answer, domain: Question.domain })

        if (result.length === 0) throw new apiError(404, "Not Found", "No such question of this id is found")

        return result;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }
        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const deleteQuestion = async (questionId: any) => {
    try {
        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        const result = await db.delete(Question)
            .where(eq(Question.id, parsedQuestionId))
            .returning({ id: Question.id })

        if (result.length === 0) throw new apiError(404, "Not Found", "No such question of this id is found")

        return result;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }
        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const getQuestion = async (page: any, domain: any, limit: any) => {
    try {
        if(!page || !limit)     throw new apiError(422, "Invalid URL format", "'domain' is optional, but 'page' and 'limit' is compulsory")

        const page_value = Number(page) || 1
        const limit_value = Number(limit) || 10
        const offset = (page_value - 1) * limit_value       // offset tells PostgreSQL — "skip (page_value - 1) records, then give me limit_value records"
        // If still not understood how pagination works, ask claude to explain with an Example, how frontend and backend make/receive the requests respectively, and uses these query params for pagination

        let result;
        if (domain) {        // if 'domain' exists
            const validate = domainSchema.safeParse(domain)
            if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

            result = await db.select()
                .from(Question)
                .where(eq(Question.domain, validate.data))
                .limit(limit_value)
                .offset(offset)
        } else {

            result = await db.select()
                .from(Question)
                .limit(limit_value)
                .offset(offset)
        }

        const finalResult = { data: result, domain: (domain)?domain:"All", pagination: { page: page_value, limit: limit_value, total: result.length } }

        return finalResult;
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }
        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}
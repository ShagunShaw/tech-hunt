import { and, eq, sql } from "drizzle-orm";
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

Question Allocation to different themes will be done on 'themeId' and not 'themeName'

export const addQuestion = async (question: string, domain: any, answer: any, hints: any) => {
    try {
        if (!question || !domain || !answer || !hints) throw new apiError(422, "Missing Values", "Either question or domain or hints or answer field is missing")

        // Redis Check
        const exist = await client.exists(`questionCount:domain:${domain}`)
        let val = 0;
        if (exist) {
            val = Number(await client.get(`questionCount:domain:${domain}`))
            if (val >= 6) throw new apiError(400, "Can't exceed 6", "There can be at max 6 questions for each domain")
        }

        if (!Array.isArray(answer)) throw new apiError(422, "Invalid Format", "'answer' field should be an array even if it has only 1 value")

        if (!Array.isArray(hints)) throw new apiError(422, "Invalid Format", "'hints' field should be an array even if it has only one value")

        const validate = domainSchema.safeParse(domain)
        if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

        const result = await db.insert(Question)
            .values({ question, answer, domain, hints })
            .returning({ id: Question.id })

        if (result.length === 0) throw new apiError(500, "Could not insert", "Something went wrong while inserting the data")

        await client.set(`questionCount:domain:${domain}`, val + 1)       // will override if already exists

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

export const getAllQuestion = async (page: any, domain: any, limit: any) => {
    try {
        if (!page || !limit) throw new apiError(422, "Invalid URL format", "'domain' is optional, but 'page' and 'limit' is compulsory")

        // Applying Pagination
        const page_value = Number(page) || 1
        const limit_value = Number(limit) || 10
        const offset = (page_value - 1) * limit_value       // offset tells PostgreSQL — "skip (page_value - 1) records, then give me limit_value records"
        // If still not understood how pagination works, ask claude to explain with an Example, how frontend and backend make/receive the requests respectively, and uses these query params for pagination

        let result;
        if (domain) {        // if 'domain' exists
            const validate = domainSchema.safeParse(domain)
            if (!validate.success) throw new apiError(422, "Domain Enum Mismatch", "Domain should be of the specified enums only")

            result = await db.select({ id: Question.id, question: Question.question, answer: Question.answer, domain: Question.domain })
                .from(Question)
                .where(eq(Question.domain, validate.data))
                .limit(limit_value)
                .offset(offset)
        } else {

            result = await db.select({ id: Question.id, question: Question.question, answer: Question.answer, domain: Question.domain })
                .from(Question)
                .limit(limit_value)
                .offset(offset)
        }

        const finalResult = { data: result, domain: (domain) ? domain : "All", pagination: { page: page_value, limit: limit_value, total: result.length } }

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

export const addMoreHints = async (hints: any, questionId: any) => {
    try {
        if (!hints) throw new apiError(400, "Missing Field", "'hints' field is missing in request's body")

        if (!Array.isArray(hints)) throw new apiError(422, "Invalid Format", "'hints' field must be an array even if it has only one value")

        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        const result = await db
            .update(Question)
            .set({
                // array_cat(existing_array, new_array) concatenates the two arrays
                hints: sql`array_cat(${Question.hints}, ${hints})`,
            })
            .where(eq(Question.id, parsedQuestionId))
            .returning({ id: Question.id, hints: Question.hints });

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

export const updateHints = async (index: any, updatedText: string, questionId: any) => {
    try {
        if (!index || !updatedText) throw new apiError(400, "Bad Request", "Either index or upadtedText is missing")

        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        // Converting JS 0-indexed values to PostgreSQL 1-indexed values
        const postgresIndex = Number(index) + 1;
        if (isNaN(postgresIndex) || postgresIndex < 1) {
            throw new apiError(400, "Bad Request", "Index must be a valid non-negative number");
        }

        const result = await db.execute(sql`
                                  UPDATE ${Question} 
                                  SET hints[${sql.raw(postgresIndex.toString())}] = ${updatedText} 
                                  WHERE id = ${parsedQuestionId} 
                                  RETURNING id, hints
                                `);

        if (result.length === 0) throw new apiError(404, "Not Found", "No such Question of this id is found")

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

export const deleteHints = async (index: any, questionId: any) => {
    try {
        if (!index) throw new apiError(400, "Bad Request", "Hint index, which is to be deleted, is missing from request's body")

        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        // Converting JS 0-indexed values to PostgreSQL 1-indexed values
        const postgresIndex = Number(index) + 1;
        if (isNaN(postgresIndex) || postgresIndex < 1) {
            throw new apiError(400, "Bad Request", "Index must be a valid non-negative number");
        }

        const leftBound = postgresIndex - 1;
        const rightBound = postgresIndex + 1;

        const result = await db
            .update(Question)
            .set({
                hints: sql`
          CASE 
            WHEN cardinality(${Question.hints}) >= ${postgresIndex} THEN
              ${Question.hints}[:${sql.raw(leftBound.toString())}] || ${Question.hints}[${sql.raw(rightBound.toString())}:]
            ELSE ${Question.hints}
          END
        `
            })
            .where(
                and(
                    eq(Question.id, parsedQuestionId),
                    // CRITICAL RULE: Only allow the update if the array size is GREATER than 1
                    sql`cardinality(${Question.hints}) > 1`
                )
            )
            .returning({ id: Question.id, hints: Question.hints });

        if (result.length === 0) {
            // Let's check why it failed so we can send an accurate HTTP status code
            const existingQuestion = await db
                .select({ hints: Question.hints })
                .from(Question)
                .where(eq(Question.id, parsedQuestionId))
                .limit(1);

            if (existingQuestion.length === 0) {
                throw new apiError(404, "Not Found", "No such Question found with this ID");
            }

            // If the row exists but result was empty, it means the cardinality rule blocked it
            throw new apiError(
                400,
                "Bad Request",
                "Cannot delete hint. The hints array must contain at least 1 item at all times."
            );
        }

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

export const getAllHints = async (questionId: any) => {
    try {
        const parsedQuestionId = Number(questionId)
        if (isNaN(parsedQuestionId)) {
            throw new apiError(422, "Invalid question ID", "Question ID must be a valid number");
        }

        const result = await db.select({ id: Question.id, hints: Question.hints })
            .from(Question)
            .where(eq(Question.id, parsedQuestionId))

        if (result.length === 0) throw new apiError(404, "Not Found", "No such question of this Id is found")

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
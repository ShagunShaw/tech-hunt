import { count, eq, sql } from "drizzle-orm";
import { db } from "../drizzle/db";
import { Theme, ThemeMessage } from "../drizzle/schema";
import { apiError } from "../utils/ApiError";

export const getAllTheme = async () => {
    try {
        const result = await db.select({        // 'result' will be an array of JSON containing all the rows from the table, and each JSON will have two fields - id, name
            // If no theme is present in the database, it will return result = []
            id: Theme.id,
            name: Theme.name
        })
            .from(Theme)

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

export const createTheme = async (theme: string) => {
    try {
        const [totalThemeCount] = await db.select({ value: count() }).from(Theme);

        if (!totalThemeCount) throw new apiError(500, "Unable to fetch themes count", "Can't fetch total themes count in the db at this moment")

        if (totalThemeCount.value >= 6) {       // To ensure that at most 6 themes are there in the themes table, according to our plan
            throw new apiError(400, "Cannot insert", "Themes table is capped at max of 6 themes");
        }

        if (theme.trim().length > 50) throw new apiError(422, "Length Exceeded", "Theme length cannot be more than 50")

        const result = await db.insert(Theme)
            .values({ name: theme })
            .returning({ id: Theme.id });

        if (result.length === 0) throw new apiError(500, "Could not insert", "Something went wrong while inserting the theme in the db")

        return { id: result[0]?.id };
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

export const updateTheme = async (themeId: any, newThemeName: string) => {
    try {
        const parsedThemeId = Number(themeId)

        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        const result = await db.update(Theme)
            .set({ name: newThemeName })
            .where(eq(Theme.id, parsedThemeId))
            .returning({ id: Theme.id });

        if (result.length === 0) throw new apiError(404, "Not Found", "No such theme is found for this theme id")

        return { id: result[0]?.id }
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

export const deleteTheme = async (themeId: any) => {
    try {
        const parsedThemeId = Number(themeId)

        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        const result = await db.delete(Theme)
            .where(eq(Theme.id, parsedThemeId))
            .returning({ id: Theme.id });

        return { id: result[0]?.id }
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

export const gettAllMessage = async (themeId: any) => {
    try {
        const parsedThemeId = Number(themeId);
        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number");
        }

        const themeRows = await db.select({ 
            messagesOrder: Theme.messagesOrder 
        })
        .from(Theme)
        .where(eq(Theme.id, parsedThemeId));

        // ' !themeRows[0]?.messagesOrder '   returns true for both null AND empty array []
        if (themeRows.length === 0 || !themeRows[0]?.messagesOrder) {
            return [];
        }

        const orderArray = themeRows[0].messagesOrder; // e.g., [6, 2]

        const rawMessages = await db.select({ 
            id: ThemeMessage.id, 
            message: ThemeMessage.message 
        })
        .from(ThemeMessage)
        .where(eq(ThemeMessage.theme, parsedThemeId));

        if (rawMessages.length === 0) {
            return [];
        }

        const messageMap = new Map(rawMessages.map(msg => [msg.id, msg]));

        const sortedResult = orderArray
            .map(id => messageMap.get(id))
            .filter((msg): msg is { id: number; message: string } => msg !== undefined); 
            // The filter removes any IDs present in the order list but missing in database rows

        return sortedResult;

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
};

export const addMessage = async (themeId: any, message: string) => {
    try {
        const parsedThemeId = Number(themeId)

        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number")
        }

        if (!message) throw new apiError(400, "Empty message field", "Message field cannot be empty")

        // Transaction
        const result = await db.transaction(async (tx) => {
            const insertedMessage = await tx.insert(ThemeMessage)
                .values({ theme: parsedThemeId, message })
                .returning({ id: ThemeMessage.id })

            if (insertedMessage.length === 0) {
                throw new apiError(500, "Could not insert", "Something went wrong while inserting the theme message in the db")
            }

            const themeMessageArray = await tx.update(Theme)
                .set({
                    // Coalesce ensures it works smoothly even if messagesOrder starts as NULL
                    messagesOrder: sql`array_append(coalesce(${Theme.messagesOrder}, '{}'), ${insertedMessage[0]?.id})`
                })
                .where(eq(Theme.id, parsedThemeId))
                .returning({ messagesOrder: Theme.messagesOrder })

            if (themeMessageArray.length === 0) {
                throw new apiError(404, "Not Found", "No such theme of this theme id is found")
            }

            return { message: insertedMessage, themeMessageArray: themeMessageArray[0]?.messagesOrder }
        })

        return { themeId: parsedThemeId, themeMessageArray: result.themeMessageArray, themeMessage: result.message }
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

export const updateMessage = async (messageId: any, updatedMessage: string) => {
    try {
        const parsedMessageId = Number(messageId)

        if (isNaN(parsedMessageId)) {
            throw new apiError(400, "Invalid message ID", "Message ID must be a valid number")
        }

        const result = await db.update(ThemeMessage)
            .set({ message: updatedMessage })
            .where(eq(ThemeMessage.id, parsedMessageId))
            .returning({ id: ThemeMessage.id });

        if (result.length === 0) throw new apiError(404, "Not Found", "No such message of this id is found in the db")

        return { messageId: result[0]?.id }
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

export const deleteMessage = async (messageId: any) => {
    try {
        const parsedMessageId = Number(messageId)

        if (isNaN(parsedMessageId)) {
            throw new apiError(400, "Invalid message ID", "Message ID must be a valid number")
        }

        // Tansaction
        const result = await db.transaction(async (tx) => {
            const deletedData = await tx.delete(ThemeMessage)
                .where(eq(ThemeMessage.id, parsedMessageId))
                .returning({ themeMessageId: ThemeMessage.id, themeId: ThemeMessage.theme });

            if (deletedData.length === 0 || !deletedData[0]?.themeId || !deletedData[0]?.themeMessageId) throw new apiError(500, "Can't delete message", "Something went wrong while deleting the message")

            // remove that value from Theme array
            const updatedThemeArray = await tx.update(Theme)
                .set({
                    // array_remove(current_array, value_to_remove)
                    messagesOrder: sql`array_remove(${Theme.messagesOrder}, ${deletedData[0]?.themeMessageId})`
                })
                .where(eq(Theme.id, deletedData[0]?.themeId))
                .returning({ messagesOrder: Theme.messagesOrder });

            if (updatedThemeArray.length === 0) throw new apiError(500, "Can't update Theme table", "The message index cannot be removed from the Theme table")

            return { themeId: deletedData[0]?.themeId, messageId: deletedData[0]?.themeMessageId, newThemeMessageArray: updatedThemeArray[0]?.messagesOrder }
        })

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

export const reorderMessage = async (themeId: any, newOrder: any) => {
    try {
        const parsedThemeId = Number(themeId);

        if (isNaN(parsedThemeId)) {
            throw new apiError(400, "Invalid theme ID", "Theme ID must be a valid number");
        }

        // Checking whether its an array or not
        if (!Array.isArray(newOrder)) {
            throw new apiError(400, "Invalid payload", "newOrder must be an array of message IDs");
        }

        // Checking whether each element in the array is an integer or not
        const isValidArray = newOrder.every((id) => Number.isInteger(id));

        if (!isValidArray) {
            throw new apiError(400, "Invalid array elements", "All IDs in the reordered array must be valid integers");
        }

        const updatedTheme = await db.update(Theme)
            .set({
                messagesOrder: newOrder // Drizzle maps JS arrays directly to PG arrays natively here
            })
            .where(eq(Theme.id, parsedThemeId))
            .returning({ messagesOrder: Theme.messagesOrder });

        if (updatedTheme.length === 0) {
            throw new apiError(500, "Something went wrong", "Unable to reorder messages for this theme ");
        }

        return { themeId: parsedThemeId, messageArray: updatedTheme[0]?.messagesOrder }
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

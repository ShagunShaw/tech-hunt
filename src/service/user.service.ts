import jwt, { type JwtPayload } from 'jsonwebtoken'
import axios from 'axios'
import { apiError } from '../utils/ApiError'
import { db } from '../drizzle/db'
import { Participant, Admin } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import { generateAccessToken, generateRefreshToken } from '../middlewares/verifyJWT'
import { randomUUID } from 'crypto'
import client from '../redis.config'
import { sendEmail } from '../emailService/sendEmail'


type JwtExpiry = `${number}m`

export const googleRedirect = (redirectUri: string) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;

    return url
}

export const googleRegisterCallback = async (code: any, redirectUri: string, role: 'participant' | 'admin' | 'super-admin') => {
    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });

        const accessTokenByGoogle = tokenRes.data.access_token;

        const profileRes = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessTokenByGoogle}` },
            }
        );

        if (role === 'participant') {
            const data = await db.query.Participant.findFirst({
                where: eq(Participant.googleId, profileRes.data.sub)
            });

            if (data) throw new apiError(400, "User already exists", "User with this email is already registered")
        } else {
            const data = await db.query.Admin.findFirst({
                where: eq(Admin.googleId, profileRes.data.sub)
            });

            if (data) throw new apiError(400, "User already exists", "Admin with this email is already registered")
        }

        const payload: JwtPayload = {
            name: profileRes.data.name,
            email: profileRes.data.email,
            googleId: profileRes.data.sub
        }

        if (!process.env.GOOGLE_TOKEN_SECRET) throw new apiError(500, "Secret Key Not Found", "Google token secret key not found")

        const token = jwt.sign(payload, process.env.GOOGLE_TOKEN_SECRET, {
            expiresIn: process.env.GOOGLE_TOKEN_EXPIRY as JwtExpiry,
            algorithm: 'HS256'
        })

        return token;

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

export const register = async (token: string, phone: string, college: string, department: string, year: '1st' | '2nd' | '3rd' | '4th' | '5th') => {
    try {
        if (!process.env.GOOGLE_TOKEN_SECRET) throw new apiError(500, "Secret Key Not Found", "Google token secret key not found")

        const payload = jwt.verify(token, process.env.GOOGLE_TOKEN_SECRET) as JwtPayload
        if (!payload) throw new apiError(500, "Payload Not Found", "Payload not found from google token")

        const data = await db.insert(Participant)
            .values({
                name: payload.name,
                email: payload.email,
                googleId: payload.googleId,
                phone,
                college,
                department,
                year
            })
            .returning({ id: Participant.id, name: Participant.name, email: Participant.email, college: Participant.college, department: Participant.department, year: Participant.year });

            // Sending email upon successfull registration
            const template = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #15803d; margin-top: 0;">Registration Confirmed!</h2>
            <p style="color: #334155; font-size: 15px;">You have been successfully registered for the game. Get ready to compete!</p>
            <p style="color: #475569; font-size: 14px;">Keep an eye on your inbox—we will share a WhatsApp group link for further event schedules, game details, and platform instructions shortly.</p>
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Good luck, and see you on the leaderboards!</p>
          </div>
        </body>
        </html>
        `
        if (!data[0]?.email) throw new apiError(500, "Email Not Found", "Registered participant email not found")
        await sendEmail(data[0]?.email, "You have been registered successfully for the game", template)

        return data
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

export const registerAdmin = async (token: string, phone: string, description: string) => {
    try {
        if (!process.env.GOOGLE_TOKEN_SECRET) throw new apiError(500, "Secret Key Not Found", "Google token secret key not found")

        const payload = jwt.verify(token, process.env.GOOGLE_TOKEN_SECRET) as JwtPayload
        if (!payload) throw new apiError(500, "Payload Not Found", "Payload not found from google token")

        const data = await db.insert(Admin)
            .values({
                name: payload.name,
                email: payload.email,
                googleId: payload.googleId,
                phone,
                role: 'admin',
                description
            })
            .returning({ id: Admin.id, name: Admin.name, email: Admin.email, description: Admin.description });

        dont forget to add our 'super-admin' directly in our database

        return data
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

export const googleLoginCallback = async (code: any, redirectUri: string, role: 'participant' | 'admin' | 'super-admin') => {
    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });

        const accessTokenByGoogle = tokenRes.data.access_token;

        const profileRes = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${accessTokenByGoogle}` },
            }
        );

        let data;
        if (role === 'participant') {
            data = await db.query.Participant.findFirst({
                where: eq(Participant.googleId, profileRes.data.sub),
                columns: {
                    id: true,
                    email: true,
                    refreshTokens: true
                }
            });

            if (!data) throw new apiError(400, "User did not exists", "User with this email is not registered")
        } else {
            data = await db.query.Admin.findFirst({
                where: eq(Admin.googleId, profileRes.data.sub),
                columns: {
                    id: true,
                    email: true,
                    refreshTokens: true
                }
            });

            if (!data) throw new apiError(400, "User did not exists", "Admin with this email is not registered")
        }

        const sessionId = randomUUID();

        const accessToken = generateAccessToken(data.id, sessionId, role)
        const refreshToken = generateRefreshToken(data.id, role, sessionId)

        // Add this new session in our db
        const existingTokens = data.refreshTokens ?? []
        const newTokens = [...existingTokens, { sessionId, token: refreshToken }]

        let updatedData;
        if (role === 'participant') {
            updatedData = await db.update(Participant)
                .set({ refreshTokens: newTokens })
                .where(eq(Participant.id, data.id))
        } else {
            updatedData = await db.update(Admin)
                .set({ refreshTokens: newTokens })
                .where(eq(Admin.id, data.id))
        }

        const running = await client.get('game:isRunning')
        let isGameRunning;
        if(!running || running === 'false') isGameRunning= false;
        else            isGameRunning= true;

        const result = {
            updatedData,
            isGameRunning
        }

        return { accessToken, refreshToken, result }

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

export const logout = async (user: {
    id: number,
    sessionId: string,
    role: 'participant' | 'admin' | 'super-admin'
}) => {
    try {

        let data;
        if (user.role == 'participant') {
            data = await db.query.Participant.findFirst({
                where: eq(Participant.id, user.id),
                columns: {
                    refreshTokens: true
                }
            })

            if (!data) throw new apiError(404, "User not found", "User of this id not found")
        } else {
            data = await db.query.Admin.findFirst({
                where: eq(Admin.id, user.id),
                columns: {
                    refreshTokens: true
                }
            })

            if (!data) throw new apiError(404, "User not found", "User of this id not found")
        }

        const existingTokens = data.refreshTokens
        if (!existingTokens) throw new apiError(404, "Refresh Token Not Found", "Refresh Token for this session not found")

        const newTokens = existingTokens.filter((val) => val.sessionId !== user.sessionId)

        if (user.role === 'participant') {
            await db.update(Participant)
                .set({ refreshTokens: newTokens })
                .where(eq(Participant.id, user.id))
        } else {
            await db.update(Admin)
                .set({ refreshTokens: newTokens })
                .where(eq(Admin.id, user.id))
        }

        return;
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
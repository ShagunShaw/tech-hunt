/*  (While Deploying) Since sending emails via SMPT protocol is not supported on Render's free tier, so we will be using 'Maileroo' application to do so as Render's free tier supports it (that part is given below this code, check it out)  */


import nodemailer from 'nodemailer'
import { apiError } from '../utils/ApiError';

const transporter = nodemailer.createTransport({
    secure: false,
    host: "smtp.gmail.com",
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
})

async function sendEmail(to: string, subject: string, template: string) {
    try {
        await transporter.sendMail({
            to,
            subject,
            html: template
        })

        console.log(`Email sent successfully to ${to}`)
    } catch (error: any) {
        if (error instanceof apiError) {
            throw error;
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred while sending the email"
        );
    }
}

export { sendEmail }


/* 
import { existingUserTemplate } from "./existingUser.ts"
import { newUserTemplate } from "./newUser.ts"

// Helper function to handle the HTTP API request to Maileroo
async function sendMailerooRequest(to: string, subject: string, htmlContent: string) {
    try {
        // Updated URL to point to Maileroo's correct API v2 basic email endpoint
        const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": process.env.MAILEROO_API_KEY || ""
            },
            body: JSON.stringify({
                "from": {
                    "address": `quizblitz@${process.env.MAILEROO_DOMAIN_NAME}.maileroo.org`,
                    "display_name": "QuizBlitz"
                },
                "to": [
                    {
                        "address": to
                    }
                ],
                "subject": subject,
                "html": htmlContent
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`Email sent successfully to ${to}`);
        } else {
            console.error("Maileroo API Error:", data);
            throw new Error(data.message || "Failed to send email via Maileroo");
        }
    } catch (error) {
        console.error("Failed to connect to Maileroo API:", error);
        throw error;
    }
}

async function sendExistingUser(to: string, subject: string, hostName: string, quizTitle: string, acceptUrl: string) {
    const htmlContent = existingUserTemplate(hostName, quizTitle, acceptUrl);
    await sendMailerooRequest(to, subject, htmlContent);
}

async function sendNewUser(to: string, subject: string, hostName: string, quizTitle: string, acceptUrl: string) {
    const htmlContent = newUserTemplate(hostName, quizTitle, acceptUrl);
    await sendMailerooRequest(to, subject, htmlContent);
}

export { sendNewUser, sendExistingUser }
*/
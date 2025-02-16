import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// Custom Error class with a statusCode property
export class CustomError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'CustomError';
    }
}

export const createUser = async ({ email, password }: { email: string, password: string }) => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword
        },
        select: {
            id: true,
            email: true,
        }
    });

    return user;
}

export const loginUser = async ({ email, password }: { email: string, password: string }) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new CustomError('User does not exist', 404); // Not Found
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new CustomError('Invalid credentials', 401); // Unauthorized
    }

    const secretKey = process.env.SECRET_KEY;

    if (!secretKey) {
        throw new CustomError('SECRET_KEY is not defined in environment variables', 500); // Internal Server Error
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, secretKey, { expiresIn: '24h' });

    return { token, user };
};


export const getAllUsers = async ({ userId }: { userId: string }) => {

    const users = await prisma.user.findMany({
        where: {
            id: { not: userId }
        },
        select: {
            id: true,
            email: true,
        } // Excludes the user with the given ID
    }
    )

    return users;

}
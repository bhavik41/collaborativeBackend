import * as userService from '../services/user.service';
import { validationResult } from 'express-validator';
import { Request, Response } from 'express';
import { CustomError } from '../services/user.service'; // Import CustomError here
import redisClient from '../services/redis.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const createUserController = async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { email, password } = req.body;
        const user = await userService.createUser({ email, password });

        return res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const loginController = async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() }); // Bad Request
    }

    try {
        const { email, password } = req.body;
        const { token, user } = await userService.loginUser({ email, password });

        const { password: _, ...safeUser } = user;

        return res.status(200).json({ message: 'Login successful', user: safeUser, token });

    } catch (error) {

        // Ensure the error is a CustomError with a statusCode
        if (error instanceof CustomError) {
            return res.status(error.statusCode).json({ message: error.message });
        }

        // If it's a different error (non-CustomError), return a generic 500 error
        return res.status(500).json({ message: 'Login failed' });
    }
};

export const profileController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {

    try {
        console.log(req.user)
        return res.status(200).json({
            mess: 'success',
            user: req.user
        })

    } catch (error) {

        return res.status(404).json({ message: 'User not found' });

    }

};

export const logoutController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {

    try {

        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        redisClient.set(token, 'logged out', 'EX', 60 * 60 * 24);
        res.status(200).json({ message: 'Logged out' });

    } catch (error) {
        console.error(error);
    }

};

export const getAllUserController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {

        const loggedInUser = await prisma.user.findUnique({
            where: {
                email: req.user.email
            }
        })

        if (!loggedInUser) throw new CustomError('User not found', 404)

        const allUsers = await userService.getAllUsers({ userId: loggedInUser.id });
        // const safeUsers = allUsers.map(({ password, ...user }) => user);
        res.status(200).json(allUsers);
    } catch {

    }
};

// export const profileController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {

//     try {
//         const user = await prisma.user.findUnique({
//             where: {
//                 email: req.user.email
//             }
//         })
//         if (!user) throw new CustomError('User not found', 404)

//         return res.status(200).json({ user })

//     } catch (error) {
//         return res.status(404).json({ message: 'User not found' });
//     }

// }




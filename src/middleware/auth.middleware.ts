import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';
import redisClient from '../services/redis.service';

interface AuthenticatedRequest extends Request {
    user?: any;
}

dotenv.config();

export const authUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {

        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).send({ error: 'No token Unauthorized user' });
        }

        const isBlacklisted = await redisClient.get(token);

        if (isBlacklisted) {
            return res.status(401).send({ error: 'redis Unauthorized user' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY || '');
        console.log(decoded);
        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).send({ error: 'Please authenticate' });
    }
};

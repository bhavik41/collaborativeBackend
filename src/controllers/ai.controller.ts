import * as ai from '../services/ai.service';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
    query: { prompt: string; };
}

export const getResult = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { prompt } = req.query;
        console.log(prompt)
        const result = await ai.generateResult(prompt);
        return res.json({ result });
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).send(err.message);
        } else {
            res.status(400).send('An unknown error occurred');
        }
    }
};
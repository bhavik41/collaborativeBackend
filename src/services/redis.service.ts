import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();
console.log(process.env.REDIS_PORT)
const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '13754', 10),
    password: process.env.REDIS_PASSWORD,
});


redisClient.on('connect', () => {
    console.log('redis connected');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});


export default redisClient;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log(process.env.REDIS_PORT);
const redisClient = new ioredis_1.default({
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
exports.default = redisClient;

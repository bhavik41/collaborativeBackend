"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.createUser = exports.CustomError = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
// Custom Error class with a statusCode property
class CustomError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'CustomError';
    }
}
exports.CustomError = CustomError;
const createUser = (_a) => __awaiter(void 0, [_a], void 0, function* ({ email, password }) {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    const user = yield prisma.user.create({
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
});
exports.createUser = createUser;
const loginUser = (_a) => __awaiter(void 0, [_a], void 0, function* ({ email, password }) {
    const user = yield prisma.user.findUnique({
        where: { email }
    });
    if (!user) {
        throw new CustomError('User does not exist', 404); // Not Found
    }
    const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new CustomError('Invalid credentials', 401); // Unauthorized
    }
    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
        throw new CustomError('SECRET_KEY is not defined in environment variables', 500); // Internal Server Error
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, secretKey);
    return { token, user };
});
exports.loginUser = loginUser;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileController = exports.loginController = exports.createUserController = void 0;
const userService = __importStar(require("../services/user.service"));
const express_validator_1 = require("express-validator");
const user_service_1 = require("../services/user.service"); // Import CustomError here
const createUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { email, password } = req.body;
        const user = yield userService.createUser({ email, password });
        return res.status(200).json({ user });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user' });
    }
});
exports.createUserController = createUserController;
const loginController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() }); // Bad Request
    }
    try {
        const { email, password } = req.body;
        const { token, user } = yield userService.loginUser({ email, password });
        return res.status(200).json({ message: 'Login successful', user: user.email, token });
    }
    catch (error) {
        console.error(error);
        // Ensure the error is a CustomError with a statusCode
        if (error instanceof user_service_1.CustomError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        // If it's a different error (non-CustomError), return a generic 500 error
        return res.status(500).json({ message: 'Login failed' });
    }
});
exports.loginController = loginController;
const profileController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.user);
    res.status(200).json({
        mess: 'success',
        user: req.user
    });
});
exports.profileController = profileController;

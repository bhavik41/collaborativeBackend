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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController = __importStar(require("../controllers/user.controller"));
const express_validator_1 = require("express-validator");
const authMiddleware = __importStar(require("../middleware/auth.middleware"));
const router = (0, express_1.Router)();
router.post('/register', (0, express_validator_1.body)('email').isEmail().withMessage('Email must be valid email address'), (0, express_validator_1.body)('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'), userController.createUserController);
router.post('/login', (0, express_validator_1.body)('email').isEmail().withMessage('Email must be valid email address'), (0, express_validator_1.body)('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'), userController.loginController);
router.get('/profile', authMiddleware.authUser, userController.profileController);
exports.default = router; // Export the router to use it in other files.  */}*/}}}}

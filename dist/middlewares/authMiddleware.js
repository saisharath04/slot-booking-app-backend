"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(403).json({ message: "Token is required" });
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ message: "Invalid token" });
        req.user = user;
        next();
    });
};
exports.authenticateJWT = authenticateJWT;

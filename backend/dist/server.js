"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const api_1 = __importDefault(require("./routes/api"));
const errorHandler_1 = require("./middleware/errorHandler");
const socketService_1 = require("./services/socketService");
require("./services/gameEngine"); // Initialize BullMQ Worker
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Middleware
app.use((0, cors_1.default)({
    origin: [env_1.env.FRONTEND_URL],
    credentials: true
}));
app.use(express_1.default.json());
// Routes
app.use('/api', api_1.default);
// Error Handler
app.use(errorHandler_1.errorHandler);
// Initialize Socket.io
socketService_1.socketService.init(httpServer);
// For Vercel serverless deployment
if (process.env.VERCEL) {
    module.exports = app;
}
else {
    // Start server for local development
    httpServer.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`Server is running on port ${env_1.env.PORT}`);
    });
}
exports.default = app;

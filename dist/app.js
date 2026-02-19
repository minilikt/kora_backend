"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const error_middleware_1 = require("./middlewares/error.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const exercise_routes_1 = __importDefault(require("./routes/exercise.routes"));
const session_routes_1 = __importDefault(require("./routes/session.routes"));
const plan_routes_1 = __importDefault(require("./routes/plan.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const app = (0, express_1.default)();
// Global Middlewares
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            ...helmet_1.default.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
            "script-src-attr": ["'unsafe-inline'"],
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
            ],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "*"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:5000",
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static("public"));
// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
// Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/exercises", exercise_routes_1.default);
app.use("/api/sessions", session_routes_1.default);
app.use("/api/plans", plan_routes_1.default);
app.use("/api/analytics", analytics_routes_1.default);
// Error Handling Middleware (must be last)
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map
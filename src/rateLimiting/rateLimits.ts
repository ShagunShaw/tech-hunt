import rateLimit from 'express-rate-limit';

export const strictLimiter = rateLimit({           // (20 requests/minute)
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: { error: "Too many requests, please try again after sometime" },
    standardHeaders: true,
    legacyHeaders: false,
});

export const moderateLimiter = rateLimit({           // (30 requests/minute)
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: "Too many requests, please try again after sometime" },
    standardHeaders: true,
    legacyHeaders: false,
});

export const relaxedLimiter = rateLimit({           // (100 requests/minute)
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again after sometime" },
    standardHeaders: true,
    legacyHeaders: false,
});
import authMiddleware from './auth-middleware.js';
import moderatorMiddleware from './moderator-middleware.js';
import errorMiddleware from './error-middleware.js';
import activatedMiddleware from './activated-middleware.js';
import checkUserActive from './check-user-active-middleware.js';
import { csrfTokenGenerator, csrfProtection } from './csrf-middleware.js';
import {
    authLimiter,
    registrationLimiter,
    passwordResetLimiter,
    generalLimiter,
    authenticatedLimiter,
    createContentLimiter
} from './rate-limit-middleware.js';

export {
    authMiddleware,
    moderatorMiddleware,
    errorMiddleware,
    activatedMiddleware,
    checkUserActive,
    csrfTokenGenerator,
    csrfProtection,
    // Rate limiters
    authLimiter,
    registrationLimiter,
    passwordResetLimiter,
    generalLimiter,
    authenticatedLimiter,
    createContentLimiter,
};
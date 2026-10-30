class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = this.constructor.name;
    }
}

class IntegrationNotFoundError extends AppError {
    constructor(code) {
        super(`Integration '${code}' not found`, 404, 'INTEGRATION_NOT_FOUND');
    }
}

class IntegrationInactiveError extends AppError {
    constructor(code) {
        super(`Integration '${code}' is inactive`, 403, 'INTEGRATION_INACTIVE');
    }
}

class IntegrationExecutionError extends AppError {
    constructor(message, details = null) {
        super(message, 502, 'INTEGRATION_EXECUTION_ERROR');
        this.details = details;
    }
}

class CircuitOpenError extends AppError {
    constructor(code) {
        super(`Circuit breaker is OPEN for '${code}'. Service temporarily unavailable`, 503, 'CIRCUIT_OPEN');
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

module.exports = {
    AppError,
    IntegrationNotFoundError,
    IntegrationInactiveError,
    IntegrationExecutionError,
    CircuitOpenError,
    AuthenticationError,
};
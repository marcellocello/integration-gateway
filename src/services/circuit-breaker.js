const breakers = new Map();

const DEFAULT_OPTIONS = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenMaxCalls: 2,
};

function getBreaker(code, options = {}) {
    if (!breakers.has(code)) {
        breakers.set(code, {
            state: 'CLOSED',
            failureCount: 0,
            successCount: 0,
            lastFailureAt: null,
            nextRetryAt: null,
            halfOpenCalls: 0,
            options: { ...DEFAULT_OPTIONS, ...options },
        });
    }
    return breakers.get(code);
}

function canExecute(code, options = {}) {
    const breaker = getBreaker(code, options);

    if (breaker.state === 'CLOSED') return true;

    if (breaker.state === 'OPEN') {
        if (Date.now() >= breaker.nextRetryAt) {
            breaker.state = 'HALF_OPEN';
            breaker.halfOpenCalls = 0;
            return true;
        }
        return false;
    }

    if (breaker.state === 'HALF_OPEN') {
        return breaker.halfOpenCalls < breaker.options.halfOpenMaxCalls;
    }

    return true;
}

function recordSuccess(code) {
    const breaker = getBreaker(code);

    if (breaker.state === 'HALF_OPEN') {
        breaker.successCount++;
        if (breaker.successCount >= breaker.options.halfOpenMaxCalls) {
            breaker.state = 'CLOSED';
            breaker.failureCount = 0;
            breaker.successCount = 0;
        }
    } else {
        breaker.failureCount = 0;
    }
}

function recordFailure(code) {
    const breaker = getBreaker(code);
    breaker.failureCount++;
    breaker.lastFailureAt = Date.now();

    if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'OPEN';
        breaker.nextRetryAt = Date.now() + breaker.options.resetTimeoutMs;
    } else if (breaker.failureCount >= breaker.options.failureThreshold) {
        breaker.state = 'OPEN';
        breaker.nextRetryAt = Date.now() + breaker.options.resetTimeoutMs;
    }
}

function getState(code) {
    const breaker = breakers.get(code);
    if (!breaker) return { state: 'CLOSED', failureCount: 0 };
    return {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailureAt: breaker.lastFailureAt,
        nextRetryAt: breaker.nextRetryAt,
    };
}

function resetBreaker(code) {
    breakers.delete(code);
}

module.exports = { canExecute, recordSuccess, recordFailure, getState, resetBreaker };
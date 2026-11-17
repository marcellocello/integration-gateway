const BaseAdapter = require('./base-adapter');
const { httpRequest } = require('../utils/http-client');

class RestApiAdapter extends BaseAdapter {
    validateConfig() {
        const { base_url, method, path } = this.config;
        if (!base_url) return { valid: false, error: 'base_url is required' };
        if (!method) return { valid: false, error: 'method is required' };
        if (!path) return { valid: false, error: 'path is required' };
        return { valid: true };
    }

    async execute(payload) {
        const { base_url, method, path, headers, body_template, query_template, timeout_ms, force_body } = this.config;

        const { _files: files = [], ...cleanPayload } = payload;

        const resolvedPath = this.resolveTemplate(path, cleanPayload);
        const resolvedHeaders = this.resolveTemplate(headers || {}, cleanPayload);
        const resolvedBody = body_template
            ? this.resolveTemplate(body_template, cleanPayload)
            : cleanPayload.body || null;

        let url = `${base_url.replace(/\/+$/, '')}${resolvedPath}`;
        if (query_template) {
            const queryParams = this.resolveTemplate(query_template, cleanPayload);
            const qs = new URLSearchParams(queryParams).toString();
            if (qs) url += `?${qs}`;
        }

        const finalHeaders = this.buildAuthHeaders(resolvedHeaders, cleanPayload);
        const result = await httpRequest({
            url,
            method: method.toUpperCase(),
            headers: finalHeaders,
            body: resolvedBody,
            timeout: timeout_ms || 30000,
            forceBody: force_body === true,
            files,
            formFields: resolvedBody || {},
        });

        return {
            success: result.success,
            statusCode: result.statusCode,
            data: result.body,
            headers: result.headers,
            duration: result.duration,
            error: result.error || null,
            _raw: {
                request: { url, method, headers: finalHeaders, body: resolvedBody },
                response: { statusCode: result.statusCode, headers: result.headers, body: result.body },
            },
        };
    }
}

module.exports = RestApiAdapter;
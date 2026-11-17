const { request, FormData } = require('undici');

async function httpRequest(options) {
    const {
        url,
        method = 'GET',
        headers = {},
        body = null,
        timeout = 30000,
        forceBody = false,
        files = [],
        formFields = {},
    } = options;

    const startTime = Date.now();

    try {
        const requestOptions = {
            method,
            headersTimeout: timeout,
            bodyTimeout: timeout,
        };

        if (files && files.length > 0) {
            const form = new FormData();
            for (const f of files) {
                const blob = new Blob([f.buffer], { type: f.mimetype || 'application/octet-stream' });
                form.append(f.fieldname, blob, f.filename);
            }

            for (const [key, value] of Object.entries(formFields)) {
                form.append(key, String(value));
            }

            const { 'Content-Type': _, ...headersWithoutCT } = headers;
            requestOptions.headers = headersWithoutCT;
            requestOptions.body = form;
        } else {
            requestOptions.headers = {
                'Content-Type': 'application/json',
                ...headers,
            };
            const methodAllowsBody = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
            if (body && (methodAllowsBody || forceBody)) {
                requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
            }
        }

        const response = await request(url, requestOptions);
        const responseBody = await response.body.text();
        const duration = Date.now() - startTime;
        let parsedBody;

        try {
            parsedBody = JSON.parse(responseBody);
        } catch {
            parsedBody = responseBody;
        }

        return {
            success: response.statusCode >= 200 && response.statusCode < 300,
            statusCode: response.statusCode,
            headers: Object.fromEntries(
                Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), v])
            ),
            body: parsedBody,
            rawBody: responseBody,
            duration,
        };
    } catch (err) {
        const duration = Date.now() - startTime;
        const isTimeout =
            err.code === 'UND_ERR_HEADERS_TIMEOUT' ||
            err.code === 'UND_ERR_BODY_TIMEOUT' ||
            err.code === 'UND_ERR_CONNECT_TIMEOUT';

        return {
            success: false,
            statusCode: null,
            headers: null,
            body: null,
            rawBody: null,
            duration,
            error: { message: err.message, code: err.code, isTimeout },
        };
    }
}

module.exports = { httpRequest };
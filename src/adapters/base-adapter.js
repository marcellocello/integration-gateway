class BaseAdapter {
    constructor(integration, credentials) {
        this.integration = integration;
        this.credentials = credentials;
        this.config = integration.config;
    }

    async execute(payload) {
        throw new Error('execute() must be implemented by subclass');
    }

    validateConfig() {
        throw new Error('validateConfig() must be implemented by subclass');
    }

    buildAuthHeaders(headers = {}) {
        if (!this.credentials) return headers;

        const cred = this.credentials;
        const merged = { ...headers };

        switch (cred.auth_type) {
            case 'BEARER': merged['Authorization'] = `Bearer ${cred.data.token}`;
                break;
            case 'API_KEY':
                if (cred.data.header_name) {
                    merged[cred.data.header_name] = cred.data.api_key;
                } else {
                    merged['X-API-Key'] = cred.data.api_key;
                }
                break;
            case 'BASIC':
                const basic = Buffer.from(`${cred.data.username}:${cred.data.password}`).toString('base64');
                merged['Authorization'] = `Basic ${basic}`;
                break;
            case 'CUSTOM':
                if (cred.data.headers) {
                    Object.assign(merged, cred.data.headers);
                }
                break;
            case 'NONE':
            default:
                break;
        }

        return merged;
    }

    resolveTemplate(template, payload) {
        if (!template) return template;

        if (typeof template === 'string') {
            return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                return payload[key] !== undefined ? payload[key] : `{{${key}}}`;
            });
        }

        if (typeof template === 'object') {
            const resolved = Array.isArray(template) ? [] : {};
            for (const [key, value] of Object.entries(template)) {
                resolved[key] = this.resolveTemplate(value, payload);
            }
            return resolved;
        }

        return template;
    }
}

module.exports = BaseAdapter;
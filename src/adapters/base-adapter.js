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

    buildAuthHeaders(headers = {}, payload = {}) {
        if (!this.credentials) return headers;

        const cred = this.credentials;
        const merged = { ...headers };

        switch (cred.auth_type) {
            case 'BEARER': {
                const token = this.resolveTemplate(cred.data.token, payload);
                merged['Authorization'] = `Bearer ${token}`;
                break;
            }
            case 'API_KEY': {
                const apiKey = this.resolveTemplate(cred.data.api_key, payload);
                if (cred.data.header_name) {
                    merged[cred.data.header_name] = apiKey;
                } else {
                    merged['X-API-Key'] = apiKey;
                }
                break;
            }
            case 'BASIC': {
                const username = this.resolveTemplate(cred.data.username, payload);
                const password = this.resolveTemplate(cred.data.password, payload);
                const basic = Buffer.from(`${username}:${password}`).toString('base64');
                merged['Authorization'] = `Basic ${basic}`;
                break;
            }
            case 'CUSTOM': {
                if (cred.data.headers) {
                    const resolvedCustomHeaders = this.resolveTemplate(cred.data.headers, payload);
                    Object.assign(merged, resolvedCustomHeaders);
                }
                break;
            }
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
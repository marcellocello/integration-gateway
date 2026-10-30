const BaseAdapter = require('./base-adapter');
const crypto = require('crypto');

class WebviewAdapter extends BaseAdapter {
    validateConfig() {
        const { base_url } = this.config;
        if (!base_url) return { valid: false, error: 'base_url is required' };
        return { valid: true };
    }

    async execute(payload) {
        const { base_url, url_template, params, token_generation, iframe_options } = this.config;

        let url;

        if (url_template) {
            const templateData = { base_url, ...payload };

            if (token_generation) {
                templateData.generated_token = this.generateToken(payload);
            }

            url = this.resolveTemplate(url_template, templateData);
        } else {
            const queryParams = { ...params };
            Object.assign(queryParams, this.resolveTemplate(params || {}, payload));

            const qs = new URLSearchParams(queryParams).toString();
            url = qs ? `${base_url}?${qs}` : base_url;
        }

        return {
            success: true,
            data: {
                url,
                iframe_options: iframe_options || null,
            },
            duration: 0,
            error: null,
            _raw: {
                request: { payload },
                response: { url },
            },
        };
    }

    generateToken(payload) {
        if (!this.config.token_generation) return null;

        const { type, secret_field, expiry_seconds, payload_fields } = this.config.token_generation;

        const secret = this.credentials?.data?.[secret_field || 'secret'] || '';

        if (type === 'HMAC') {
            const data = {};
            (payload_fields || []).forEach((field) => {
                if (payload[field] !== undefined) data[field] = payload[field];
            });
            data._exp = Math.floor(Date.now() / 1000) + (expiry_seconds || 3600);

            const dataStr = JSON.stringify(data);
            const dataB64 = Buffer.from(dataStr).toString('base64url');
            const sig = crypto.createHmac('sha256', secret).update(dataB64).digest('base64url');

            return `${dataB64}.${sig}`;
        }

        if (type === 'SIMPLE') {
            const timestamp = Math.floor(Date.now() / 1000);
            const raw = `${JSON.stringify(payload)}:${timestamp}:${secret}`;
            return crypto.createHash('sha256').update(raw).digest('hex');
        }

        return null;
    }
}

module.exports = WebviewAdapter;
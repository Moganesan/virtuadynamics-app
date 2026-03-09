const BASE_URL = 'https://virtuagrid.com';

/**
 * Executes standard API calls to the backend using 'application/x-www-form-urlencoded' format.
 */
export const apiClient = {
    async post(endpoint: string, data: Record<string, string>) {
        const url = `${BASE_URL}${endpoint}`;

        const formBody = new URLSearchParams();
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                formBody.append(key, data[key]);
            }
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody.toString(),
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || 'Something went wrong during the request.');
            }

            return responseData;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

export const authService = {
    signup: async (data: {
        email: string;
        password: string;
        confirm_password: string;
        username: string;
    }) => {
        return apiClient.post('/api/user/signup', {
            email: data.email,
            password: data.password,
            confirm_password: data.confirm_password,
            login_type: 'Email',
            username: data.username,
            app_id: 'CRI4VNCFF4K6X2',
            profile_image_id: '14'
        });
    },
    signin: async (data: {
        email: string;
        password: string;
    }) => {
        return apiClient.post('/api/user/signin', {
            email: data.email,
            password: data.password,
            app_id: 'CRI4VNCFF4K6X2'
        });
    },
    verifyOtp: async (data: {
        email: string;
        auth_otp: string;
    }) => {
        return apiClient.post('/api/user/otp/verify', {
            email: data.email,
            auth_otp: data.auth_otp,
            app_id: 'CRI4VNCFF4K6X2'
        });
    },
    requestOtp: async (email: string) => {
        return apiClient.post('/api/user/otp', {
            email: email,
        });
    },
    logout: async () => {
        return apiClient.post('/api/user/logout', {
            app_id: 'CRI4VNCFF4K6X2',
        });
    },
};

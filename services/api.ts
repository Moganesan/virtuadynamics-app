import { Platform } from 'react-native';

const BASE_URL = 'https://virtuagrid.com';
const APP_ID = 'CRI4VNCFF4K6X2';

// Local backend — Android emulator uses 10.0.2.2 to reach the host machine
const LOCAL_BASE_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

/**
 * Unauthenticated client — uses application/x-www-form-urlencoded.
 * Used for auth endpoints (signup, signin, otp).
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

/**
 * Authenticated client — attaches the user's api_token as a Bearer token.
 * Use this for all endpoints that require a logged-in session.
 */
export const authenticatedClient = {
    async post(endpoint: string, data: Record<string, string>, token: string) {
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
                    'Authorization': `Bearer ${token}`,
                },
                body: formBody.toString(),
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || 'Something went wrong during the request.');
            }

            return responseData;
        } catch (error) {
            console.error('Authenticated API Error:', error);
            throw error;
        }
    },

    async get(endpoint: string, token: string) {
        const url = `${BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || 'Something went wrong during the request.');
            }

            return responseData;
        } catch (error) {
            console.error('Authenticated API Error:', error);
            throw error;
        }
    },
};

// ─── Local Server — Unauthenticated Client ────────────────────────────────────

export const localClient = {
    async post(endpoint: string, data: Record<string, any>) {
        const url = `${LOCAL_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error('Local API Error:', error);
            throw error;
        }
    },
};

// ─── Local Server — Authenticated Client ─────────────────────────────────────

export const localAuthClient = {
    async get(endpoint: string, token: string) {
        const url = `${LOCAL_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error('Local Auth API Error:', error);
            throw error;
        }
    },

    async post(endpoint: string, data: Record<string, any>, token: string) {
        const url = `${LOCAL_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error('Local Auth API Error:', error);
            throw error;
        }
    },

    async put(endpoint: string, data: Record<string, any>, token: string) {
        const url = `${LOCAL_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error('Local Auth API Error:', error);
            throw error;
        }
    },

    async patch(endpoint: string, data: Record<string, any>, token: string) {
        const url = `${LOCAL_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error('Local Auth API Error:', error);
            throw error;
        }
    },

    async delete(endpoint: string, token: string) {
        const url = `${LOCAL_BASE_URL}${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error('Local Auth API Error:', error);
            throw error;
        }
    },
};

// ─── Settings Service ─────────────────────────────────────────────────────────

export const settingsService = {
    // Called after external login to register/find the user on our local backend
    createSession: (data: { externalUserId: string; email: string; username?: string }) =>
        localClient.post('/api/auth/session', data),

    // Profile
    getProfile: (token: string) =>
        localAuthClient.get('/api/users/me', token),

    updateProfile: (data: { age?: string; height?: string; weight?: string; address?: string }, token: string) =>
        localAuthClient.put('/api/users/me', data, token),

    // Emergency contacts
    getContacts: (token: string) =>
        localAuthClient.get('/api/contacts', token),

    addContact: (data: { name: string; phone: string; role: string }, token: string) =>
        localAuthClient.post('/api/contacts', data, token),

    deleteContact: (id: string, token: string) =>
        localAuthClient.delete(`/api/contacts/${id}`, token),

    // Notifications
    getNotifications: (token: string) =>
        localAuthClient.get('/api/notifications', token),

    updateNotificationSetting: (key: string, value: boolean, token: string) =>
        localAuthClient.patch(`/api/notifications/${key}`, { value }, token),

    // Devices
    getDevices: (token: string) =>
        localAuthClient.get('/api/devices', token),
};

// ─── Auth Service ─────────────────────────────────────────────────────────────

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
            app_id: APP_ID,
            profile_image_id: '14',
        });
    },

    signin: async (data: {
        email: string;
        password: string;
    }) => {
        return apiClient.post('/api/user/signin', {
            email: data.email,
            password: data.password,
            app_id: APP_ID,
        });
    },

    verifyOtp: async (data: {
        email: string;
        auth_otp: string;
    }) => {
        return apiClient.post('/api/user/otp/verify', {
            email: data.email,
            auth_otp: data.auth_otp,
            app_id: APP_ID,
        });
    },

    requestOtp: async (email: string) => {
        return apiClient.post('/api/user/otp', {
            email,
        });
    },

    // token is the api_token received after login
    logout: async (token: string) => {
        return authenticatedClient.post('/api/user/logout', { app_id: APP_ID }, token);
    },
};

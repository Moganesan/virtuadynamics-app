import * as Crypto from 'expo-crypto';
import md5 from 'md5';
import { Platform } from 'react-native';

const BASE_URL = 'https://virtuagrid.com';
const APP_ID = 'CRI4VNCFF4K6X2';

export const LOCAL_BASE_URL = 'http://192.168.0.39:3000/';

// ─── VirtuaLogin Auth Types & Helpers ────────────────────────────────────────

export interface VirtuaLoginAuth {
    api_token: string;
    user_id: number;
    account_id: number;
    seed_verifier: string;
    auth_id?: number;
}

/** Build a VirtuaLoginAuth object from the user stored in AuthContext */
export function getVirtuaLoginAuth(user: {
    api_token: string;
    user_id: number;
    account_id: number;
    seed_verifier: string;
    auth_id?: number;
}): VirtuaLoginAuth {
    return {
        api_token: user.api_token,
        user_id: user.user_id,
        account_id: user.account_id,
        seed_verifier: user.seed_verifier,
        auth_id: user.auth_id,
    };
}

function generateSalt(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let salt = '';
    for (let i = 0; i < 16; i++) {
        salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
}

async function buildAuthHeaders(auth: VirtuaLoginAuth): Promise<Record<string, string>> {
    const salt = generateSalt();
    const valueverifier = Platform.OS === 'web'
        ? md5(salt + auth.seed_verifier)
        : await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.MD5,
            salt + auth.seed_verifier,
        );
    return {
        'X-Authorization': auth.api_token,
        'salt': salt,
        'authid': String(auth.auth_id ?? auth.user_id),
        'mainid': String(auth.user_id),
        'accountid': String(auth.account_id),
        'valueverifier': valueverifier,
        'appid': APP_ID,
    };
}

// ─── Unauthenticated External Client ─────────────────────────────────────────

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
            console.debug(`[DEBUG][apiClient] POST ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody.toString(),
            });

            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][apiClient] POST ${endpoint} → status=${response.status}`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || 'Something went wrong during the request.');
            }

            return responseData;
        } catch (error) {
            console.error(`[DEBUG][apiClient] POST ${endpoint} FAILED:`, error);
            throw error;
        }
    }
};

// ─── Authenticated External Client (Bearer token — used for logout) ──────────

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
            console.debug(`[DEBUG][authenticatedClient] POST ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${token}`,
                },
                body: formBody.toString(),
            });

            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][authenticatedClient] POST ${endpoint} → status=${response.status}`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || 'Something went wrong during the request.');
            }

            return responseData;
        } catch (error) {
            console.error(`[DEBUG][authenticatedClient] POST ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    async get(endpoint: string, token: string) {
        const url = `${BASE_URL}${endpoint}`;

        try {
            console.debug(`[DEBUG][authenticatedClient] GET ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][authenticatedClient] GET ${endpoint} → status=${response.status}`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || 'Something went wrong during the request.');
            }

            return responseData;
        } catch (error) {
            console.error(`[DEBUG][authenticatedClient] GET ${endpoint} FAILED:`, error);
            throw error;
        }
    },
};

// ─── Authenticated External Client (VirtuaLogin security headers) ────────────

export const virtuaLoginClient = {
    /** POST with FormData body (profile create, KYC, etc.) */
    async postForm(endpoint: string, data: Record<string, string>, auth: VirtuaLoginAuth) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = await buildAuthHeaders(auth);

        const formData = new FormData();
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                formData.append(key, data[key]);
            }
        }

        try {
            console.debug(`[DEBUG][virtuaLoginClient] POST ${url}`);
            const response = await fetch(url, { method: 'POST', headers, body: formData });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][virtuaLoginClient] POST ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][virtuaLoginClient] POST ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    /** POST with JSON body (change password, etc.) */
    async postJson(endpoint: string, data: Record<string, any>, auth: VirtuaLoginAuth) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = await buildAuthHeaders(auth);

        try {
            console.debug(`[DEBUG][virtuaLoginClient] POST(JSON) ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][virtuaLoginClient] POST(JSON) ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][virtuaLoginClient] POST(JSON) ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    /** PUT with FormData body (profile update) */
    async putForm(endpoint: string, data: Record<string, string>, auth: VirtuaLoginAuth) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = await buildAuthHeaders(auth);

        const formData = new FormData();
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                formData.append(key, data[key]);
            }
        }

        try {
            console.debug(`[DEBUG][virtuaLoginClient] PUT ${url}`);
            const response = await fetch(url, { method: 'PUT', headers, body: formData });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][virtuaLoginClient] PUT ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][virtuaLoginClient] PUT ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    /** DELETE with urlencoded body (profile delete) */
    async deleteForm(endpoint: string, data: Record<string, string>, auth: VirtuaLoginAuth) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = await buildAuthHeaders(auth);

        const formBody = new URLSearchParams();
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                formBody.append(key, data[key]);
            }
        }

        try {
            console.debug(`[DEBUG][virtuaLoginClient] DELETE ${url}`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody.toString(),
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][virtuaLoginClient] DELETE ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][virtuaLoginClient] DELETE ${endpoint} FAILED:`, error);
            throw error;
        }
    },
};

// ─── Local Server — Unauthenticated Client ───────────────────────────────────

export const localClient = {
    async post(endpoint: string, data: Record<string, any>) {
        const url = `${LOCAL_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        try {
            console.debug(`[DEBUG][localClient] POST ${url}`, data);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][localClient] POST ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][localClient] POST ${endpoint} FAILED:`, error);
            throw error;
        }
    },
};

// ─── Local Server — Authenticated Client ─────────────────────────────────────

export const localAuthClient = {
    async get(endpoint: string, token: string) {
        const url = `${LOCAL_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        try {
            console.debug(`[DEBUG][localAuthClient] GET ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][localAuthClient] GET ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][localAuthClient] GET ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    async post(endpoint: string, data: Record<string, any>, token: string) {
        const url = `${LOCAL_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        try {
            console.debug(`[DEBUG][localAuthClient] POST ${url}`, data);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][localAuthClient] POST ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][localAuthClient] POST ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    async put(endpoint: string, data: Record<string, any>, token: string) {
        const url = `${LOCAL_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        try {
            console.debug(`[DEBUG][localAuthClient] PUT ${url}`, data);
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][localAuthClient] PUT ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][localAuthClient] PUT ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    async patch(endpoint: string, data: Record<string, any>, token: string) {
        const url = `${LOCAL_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        try {
            console.debug(`[DEBUG][localAuthClient] PATCH ${url}`, data);
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][localAuthClient] PATCH ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][localAuthClient] PATCH ${endpoint} FAILED:`, error);
            throw error;
        }
    },

    async delete(endpoint: string, token: string) {
        const url = `${LOCAL_BASE_URL.replace(/\/$/, '')}${endpoint}`;
        try {
            console.debug(`[DEBUG][localAuthClient] DELETE ${url}`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const responseData = await response.json().catch(() => ({}));
            console.debug(`[DEBUG][localAuthClient] DELETE ${endpoint} → status=${response.status}`, responseData);
            if (!response.ok) throw new Error(responseData.message || 'Request failed');
            return responseData;
        } catch (error) {
            console.error(`[DEBUG][localAuthClient] DELETE ${endpoint} FAILED:`, error);
            throw error;
        }
    },
};

// ─── External Profile Service (VirtuaLogin) ──────────────────────────────────

export const externalProfileService = {
    createProfile: (
        data: {
            first_name: string;
            last_name: string;
            phone?: string;
            date_of_birth?: string;
            home_address?: string;
            nickname?: string;
            country?: string;
        },
        auth: VirtuaLoginAuth,
    ) => {
        const params: Record<string, string> = {
            first_name: data.first_name,
            last_name: data.last_name,
            default_profile: 'Yes',
        };
        if (data.phone) params.phone = data.phone;
        if (data.date_of_birth) params.date_of_birth = data.date_of_birth;
        if (data.home_address) params.home_address = data.home_address;
        if (data.nickname) params.nickname = data.nickname;
        if (data.country) params.country = data.country;
        return virtuaLoginClient.postForm('/api/user/profile/create', params, auth);
    },

    updateProfile: (
        data: {
            profile_id: string;
            first_name: string;
            last_name: string;
            phone?: string;
            date_of_birth?: string;
            home_address?: string;
            nickname?: string;
            country?: string;
        },
        auth: VirtuaLoginAuth,
    ) => {
        const params: Record<string, string> = {
            profile_id: data.profile_id,
            first_name: data.first_name,
            last_name: data.last_name,
        };
        if (data.phone !== undefined) params.phone = data.phone;
        if (data.date_of_birth !== undefined) params.date_of_birth = data.date_of_birth;
        if (data.home_address !== undefined) params.home_address = data.home_address;
        if (data.nickname !== undefined) params.nickname = data.nickname;
        if (data.country !== undefined) params.country = data.country;
        return virtuaLoginClient.putForm('/api/user/profile/update', params, auth);
    },

    changePassword: (
        data: { current_password: string; new_password: string; confirm_password: string },
        auth: VirtuaLoginAuth,
    ) => virtuaLoginClient.postJson('/api/user/change_password', data, auth),

    deleteProfile: (profileId: string, auth: VirtuaLoginAuth) =>
        virtuaLoginClient.deleteForm('/api/user/profile/delete', { profile_id: profileId }, auth),
};

// ─── Settings Service (Local Backend — health data, contacts, notifications) ─

export const settingsService = {
    // Called after external login to register/find the user on our local backend
    createSession: (data: { externalUserId: string; email: string }) =>
        localClient.post('/api/auth/session', data),

    // Local health data only (height, weight)
    getHealthData: (token: string) =>
        localAuthClient.get('/api/users/me', token),

    updateHealthData: (data: { height?: string; weight?: string }, token: string) =>
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

// ─── Vitals Service (Local Backend) ───────────────────────────────────────────

export const vitalsService = {
    getAll: (token: string) =>
        localAuthClient.get('/api/vitals', token),

    getLatest: (token: string) =>
        localAuthClient.get('/api/vitals/latest', token),

    getById: (id: string, token: string) =>
        localAuthClient.get(`/api/vitals/${id}`, token),

    create: (data: {
        heartRate?: number;
        bloodOxygen?: number;
        temperature?: number;
        bloodPressure?: string;
        trend?: string;
    }, token: string) =>
        localAuthClient.post('/api/vitals', data, token),
};

// ─── Drones Service (Local Backend) ──────────────────────────────────────────

export const dronesService = {
    getAll: (token: string) =>
        localAuthClient.get('/api/drones', token),

    getById: (id: string, token: string) =>
        localAuthClient.get(`/api/drones/${id}`, token),

    updateStatus: (id: string, status: string, token: string) =>
        localAuthClient.patch(`/api/drones/${id}/status`, { status }, token),
};

// ─── Drone Direct API (per-drone backend server) ──────────────────────────────

function droneUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, '')}${path}`;
}

// ngrok free-tier requires this header on non-browser requests to skip the interstitial page
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': '1' };

async function dronePost(baseUrl: string, path: string, body?: Record<string, any>) {
    const res = await fetch(droneUrl(baseUrl, path), {
        method: 'POST',
        headers: body
            ? { 'Content-Type': 'application/json', ...NGROK_HEADERS }
            : { ...NGROK_HEADERS },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `${path} failed`);
    return data;
}

// Direct access (only works when device can reach the drone server itself)
export const droneApiService = {
    getStatus: async (baseUrl: string) => {
        const res = await fetch(droneUrl(baseUrl, '/status'), { headers: NGROK_HEADERS });
        if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
        return res.json() as Promise<Record<string, any>>;
    },
    arm: (baseUrl: string) => dronePost(baseUrl, '/arm'),
    disarm: (baseUrl: string) => dronePost(baseUrl, '/disarm'),
    takeoff: (baseUrl: string, altitude = 3) => dronePost(baseUrl, '/takeoff', { altitude }),
    land: (baseUrl: string) => dronePost(baseUrl, '/land'),
    emergency: (baseUrl: string) => dronePost(baseUrl, '/emergency'),
};

// ─── Drone Proxy Service (routes through local backend — always reachable) ────
// Use this instead of droneApiService when the device can't reach the drone URL directly.

export const droneProxyService = {
    getStatus: (droneId: string, token: string) =>
        localAuthClient.get(`/api/drones/${droneId}/proxy/status`, token),

    arm: (droneId: string, token: string) =>
        localAuthClient.post(`/api/drones/${droneId}/proxy/arm`, {}, token),

    disarm: (droneId: string, token: string) =>
        localAuthClient.post(`/api/drones/${droneId}/proxy/disarm`, {}, token),

    takeoff: (droneId: string, altitude: number, token: string) =>
        localAuthClient.post(`/api/drones/${droneId}/proxy/takeoff`, { altitude }, token),

    land: (droneId: string, token: string) =>
        localAuthClient.post(`/api/drones/${droneId}/proxy/land`, {}, token),

    emergency: (droneId: string, token: string) =>
        localAuthClient.post(`/api/drones/${droneId}/proxy/emergency`, {}, token),

    setMode: (droneId: string, mode: string, token: string) =>
        localAuthClient.post(`/api/drones/${droneId}/proxy/mode`, { mode }, token),
};

// ─── Incidents Service (Local Backend) ───────────────────────────────────────

export const incidentsService = {
    getAll: (token: string) =>
        localAuthClient.get('/api/incidents', token),

    getById: (id: string, token: string) =>
        localAuthClient.get(`/api/incidents/${id}`, token),

    create: (data: Record<string, any>, token: string) =>
        localAuthClient.post('/api/incidents', data, token),
};

// ─── Auth Service (VirtuaLogin — signup, signin, OTP, token, password) ───────

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

    verifyToken: async (data: { token: string; user_id: string }) => {
        return apiClient.post('/api/user/token/verify', {
            token: data.token,
            app_id: APP_ID,
            user_id: data.user_id,
        });
    },

    resetPassword: async (data: {
        email: string;
        auth_otp: string;
        password: string;
        confirm_password: string;
    }) => {
        return apiClient.post('/api/user/password/reset', {
            email: data.email,
            auth_otp: data.auth_otp,
            password: data.password,
            confirm_password: data.confirm_password,
        });
    },

    // token is the api_token received after login
    logout: async (token: string) => {
        return authenticatedClient.post('/api/user/logout', { app_id: APP_ID }, token);
    },
};

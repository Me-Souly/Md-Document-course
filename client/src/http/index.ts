import axios from 'axios';
import { AuthResponse } from '@models/response/AuthResponse';
import { toastManager } from '@utils/toastManager';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const $api = axios.create({
    withCredentials: true, // чтобы к каждому запросу куки цеплялись автоматически
    baseURL: API_URL,
})

$api.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
    return config;
})

$api.interceptors.response.use((config) => {
    return config;
}, async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && error.config && !error.config._isRetry) {
        originalRequest._isRetry = true;
        try {
            const response = await axios.post<AuthResponse>(`${API_URL}/refresh`, {withCredentials: true}); 
            localStorage.setItem('token', response.data.accessToken);
            return $api.request(originalRequest);
        } catch (e) {
            console.log('Not authorized, refresh token failed');
            throw error;
        }
    }
    
    // Show error toast for server errors (except 401 which is handled above)
    // Only show toast if the request doesn't have skipErrorToast flag
    // This allows components to handle errors themselves if needed
    if (!error.config?.skipErrorToast) {
        if (error.response?.status && error.response.status >= 400 && error.response.status !== 401) {
            // Try multiple possible error message fields
            const errorMessage = 
                error.response?.data?.message || 
                error.response?.data?.error || 
                error.response?.data?.errorMessage ||
                error.message || 
                'Произошла ошибка';
            console.log('Showing error toast:', errorMessage, 'Status:', error.response.status);
            toastManager.error(errorMessage);
        } else if (!error.response) {
            // Network error
            console.log('Network error, showing toast');
            toastManager.error('Ошибка сети. Проверьте подключение к интернету.');
        }
    } else {
        console.log('Skipping error toast (skipErrorToast flag set)');
    }
    
    throw error;
})

export default $api;
import $api from "../http";
import type { AxiosResponse } from "axios";
import { AuthResponse } from "../models/response/AuthResponse";

export default class AuthService {
    static async login(identifier: string, password: string): Promise<AxiosResponse<AuthResponse>> {
        return $api.post<AuthResponse>('/login', {identifier, password});
    }

    static async registration(email: string, username: string, password: string): Promise<AxiosResponse<AuthResponse>> {
        return $api.post<AuthResponse>('/registration', {email, username, password});
    }

    static async logout(): Promise<void> {
        return $api.post('/logout');
    }

}
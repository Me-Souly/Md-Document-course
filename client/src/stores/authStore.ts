import { makeAutoObservable } from "mobx";
import { IUser } from "../models/IUser";
import AuthService from "../service/AuthService";
import PasswordService from "../service/PasswordService"
import axios from "axios";
import { AuthResponse } from "../models/response/AuthResponse";
import { API_URL } from "../http";

export default class authStore {
    user = {} as IUser;
    isAuth = false;
    isLoading = false;

    constructor() {
        makeAutoObservable(this);
    }

    setAuth(bool: boolean) {
        this.isAuth = bool;
    }

    setUser(user: IUser) {
        this.user = user;
    }

    setLoading(bool: boolean) {
        this.isLoading = bool;
    }

    async login(identifier: string, password: string) {
        try {
            const response = await AuthService.login(identifier, password);
            console.log(response);
            localStorage.setItem('token', response.data.accessToken);
            this.setAuth(true);
            this.setUser(response.data.user);
        } catch (e) {
            if (axios.isAxiosError(e))
                console.log(e.response?.data?.message);
            else
                console.log(e);
        }
    }

    async registration(email: string, username: string, password: string) {
        try {
            const response = await AuthService.registration(email, username, password);
            console.log(response);
            localStorage.setItem('token', response.data.accessToken);
            this.setAuth(true);
            this.setUser(response.data.user);
        } catch (e) {
            if (axios.isAxiosError(e))
                console.log(e.response?.data?.message);
            else
                console.log(e);
        }
    }

    async logout() {
        try {
            const response = await AuthService.logout();
            console.log(response);
            localStorage.removeItem('token');
            this.setAuth(false);
            this.setUser({} as IUser);
        } catch (e) {
            if (axios.isAxiosError(e))
                console.log(e.response?.data?.message);
            else
                console.log(e);
        }
    }

    async checkAuth() {
        this.setLoading(true);
        try {
            const response = await axios.post<AuthResponse>(`${API_URL}/refresh`, {}, {withCredentials: true});
            localStorage.setItem('token', response.data.accessToken);
            this.setAuth(true);
            this.setUser(response.data.user);
        } catch (e) {
            if (axios.isAxiosError(e))
                console.log(e.response?.data?.message);
            else
                console.log(e);
        } finally {
            this.setLoading(false);
        }
    }

    async requestReset(email: string) {
        try {
            const response = await PasswordService.requestReset(email);
            if(response.data.success === true)
                console.log(response.data);

        } catch (e) {
            if (axios.isAxiosError(e))
                console.log(e.response?.data?.message);
            else
                console.log(e);
        }
    }

    async changePassword(oldPassword: string, newPassword: string) {
        try {
            await PasswordService.changePassword(oldPassword, newPassword);
        } catch (e) {
            console.log(e);
        }
    }
}
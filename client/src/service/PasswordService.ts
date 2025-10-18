import $api from "../http";
import type { AxiosResponse } from "axios";
import { ResetResponse } from "../models/response/ResetResponse";

export default class PasswordService {
    static async requestReset(email: string): Promise<AxiosResponse<ResetResponse>> {
        return $api.post<ResetResponse>('/request-reset', { email });
    }
    
    static async changePassword(oldPassword: string, newPassword: string) {
        return $api.post("/change-password", { oldPassword, newPassword });
    }
}
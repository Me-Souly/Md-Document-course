import $api from "../http";
import type { AxiosResponse } from "axios";
import { ResetResponse } from "../models/response/ResetResponse";

export default class PasswordService {
    static async requestReset(email: string): Promise<AxiosResponse<ResetResponse>> {
        return $api.post<ResetResponse>('/password/request-reset', { email });
    }
    
    static async changePassword(oldPassword: string, newPassword: string) {
        return $api.post("/password/change", { oldPassword, newPassword });
    }
}
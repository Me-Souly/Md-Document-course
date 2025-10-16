import $api from "../http";
import type { AxiosResponse } from "axios";
import { ResetResponse } from "../models/response/ResetResponse";

export default class PasswordService {
    static async requestReset(email: string): Promise<AxiosResponse<ResetResponse>> {
        return $api.post<ResetResponse>('/requestReset', { email });
    }
}
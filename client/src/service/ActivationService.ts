import $api from "../http";
import type { AxiosResponse } from "axios";

export interface ActivationResponse {
    success: boolean;
    message: string;
}

export default class ActivationService {
    static async resendActivation(): Promise<AxiosResponse<ActivationResponse>> {
        return $api.post<ActivationResponse>('/activation/resend');
    }
}


import $api from "@http";
import type { AxiosResponse } from "axios";
import type { ActivationResponse } from "@models/response/ActivationResponse";

export default class ActivationService {
    static async resendActivation(): Promise<AxiosResponse<ActivationResponse>> {
        return $api.post<ActivationResponse>('/activation/resend');
    }
}



import type { RequestType } from "./employee";

export interface AccountantRequest {
    id: string;
    employee: string;
    dates: string;
    requestedHours?: number;
    status: string;
    submittedDate: string;
    type: RequestType;
}

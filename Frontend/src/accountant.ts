
import type { RequestType } from "./employee";

export interface AccountantRequest {
    id: string;
    employee: string;
    dates: string;
    status: string;
    submittedDate: string;
    type: RequestType;
}

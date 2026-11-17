export interface Employee {
    id: number;
    name: string;
    role: string;
}

export interface HolidayBalance {
    hours: number;
    days: number;
    dkk: number;
}

export interface HolidayAccount {
    id: number;
    name: string;
    accrued: HolidayBalance;
    used: HolidayBalance;
    remaining: HolidayBalance;
    eligibleDate: string;
}

export interface HolidayRequest {
    id: number;
    account: string;
    startDate: string;
    endDate: string;
    status: string;
    submittedDate: string;
    decisionDate: string;
}
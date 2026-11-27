
export interface Employee {
    id: string;
    name: string;
    role: string;
}

export interface HolidayBalance {
    hours: number;
    days: number;
}

export interface HolidayAccount {
    id: string;
    name: string;
    accrued: HolidayBalance;
    used: HolidayBalance;
    remaining: HolidayBalance;
    eligibleDate: string;
}

export interface HolidayRequest {
    id: string;
    account: string;
    startDate: string;
    endDate: string;
    status: string;
    submittedDate: string;
    decisionDate: string;
}

export type Weekday =
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday";

export type RequestType = "Holiday" | "Cancellation" | "Transfer";

export interface DailySchedule {
    from: string;
    to: string;
}

export type WeeklySchedule = Record<Weekday, DailySchedule>;

export interface ScheduleChange {
    id: string;
    date: string;
    previousSchedule: WeeklySchedule;
    newSchedule: WeeklySchedule;
}

export interface MockHolidayBalance {
    hours: number;
}

export interface MockHolidayAccount {
    id: string;
    employeeId: string;
    name: string;
    accrued: MockHolidayBalance;
    used: MockHolidayBalance;
    remaining: MockHolidayBalance;
    eligibleDate: string;
}

export interface MockRequest extends HolidayRequest {
    employeeId: string;
    employee: string;
    type: RequestType;
    originalRequestId?: string;
}

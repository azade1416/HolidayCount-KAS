
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

export type Weekday =
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday";

export type RequestType = "Holiday" | "Cancellation";

export interface DailySchedule {
    from: string;
    to: string;
}

export type WeeklySchedule = Record<Weekday, DailySchedule>;

export interface ScheduleChange {
    id: number;
    date: string;
    previousSchedule: WeeklySchedule;
    newSchedule: WeeklySchedule;
}

export interface MockHolidayBalance {
    hours: number;
}

export interface MockHolidayAccount {
    id: number;
    employeeId: number;
    name: string;
    accrued: MockHolidayBalance;
    used: MockHolidayBalance;
    remaining: MockHolidayBalance;
    eligibleDate: string;
}

export interface MockRequest extends HolidayRequest {
    employeeId: number;
    employee: string;
    type: RequestType;
    originalRequestId?: number;
}

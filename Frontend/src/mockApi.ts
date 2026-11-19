
import type { Employee, HolidayRequest } from "./employee";

export type SystemRole = "Employee" | "Accountant" | "Admin";
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
export type RequestType = "Holiday" | "Cancellation";

export const SYSTEM_ROLES: SystemRole[] = ["Employee", "Accountant", "Admin"];
export const WORKDAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const CALENDAR_WEEKDAYS = [...WORKDAYS, "Saturday", "Sunday"] as const;
export const EMPLOYMENT_TYPES = ["Full-time employee", "Part-time employee"] as const;
export const DEFAULT_EMPLOYMENT_TYPE = EMPLOYMENT_TYPES[0];

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

export interface MockUser {
    id: number;
    name: string;
    email: string;
    password: string;
    role: SystemRole;
    employmentType?: string;
    weeklySchedule?: WeeklySchedule;
}

export interface PublicUser {
    id: number;
    name: string;
    email: string;
    role: SystemRole;
    employmentType?: string;
    weeklySchedule?: WeeklySchedule;
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

export interface CreateEmployeeData {
    name: string;
    email: string;
    password: string;
    employmentType: string;
    weeklySchedule?: WeeklySchedule;
}

export interface AccountantRequest {
    id: string;
    employee: string;
    dates: string;
    status: string;
    submittedDate: string;
    type: RequestType;
}

export interface Announcement {
    id: number;
    message: string;
    date: string;
}

// Default data
export function createDefaultSchedule(): WeeklySchedule {
    return Object.fromEntries(
        WORKDAYS.map(day => [day, { from: "08:00", to: "16:00" }])
    ) as WeeklySchedule;
}

const defaultSchedule = createDefaultSchedule();

const accountTemplates = ["Weeks 1–5", "Week 6"];

const createHolidayAccounts = (employeeId: number): MockHolidayAccount[] =>
    accountTemplates.map((name, index) => ({
        id: employeeId * 10 + index + 1,
        employeeId,
        name,
        accrued: { hours: 0 },
        used: { hours: 0 },
        remaining: { hours: 0 },
        eligibleDate: ""
    }));

// Mock database
let users: MockUser[] = [
    {
        id: 1,
        name: "John Carter",
        email: "john@example.com",
        password: "123456",
        role: "Employee",
        employmentType: "Full-time employee",
        weeklySchedule: defaultSchedule
    },
    {
        id: 2,
        name: "Accountant",
        email: "accountant@example.com",
        password: "123456",
        role: "Accountant"
    },
    {
        id: 3,
        name: "Admin",
        email: "admin@example.com",
        password: "123456",
        role: "Admin"
    }
];

let loggedInUser: MockUser | null = null;

let employees: Employee[] = [
    { id: 1, name: "John Carter", role: "Full-time employee" }
];

let holidayAccounts: MockHolidayAccount[] = createHolidayAccounts(1);
let holidayRequests: MockRequest[] = [
    {
        id: 1, employeeId: 1, employee: "John Carter",
        account: "Weeks 1–5", startDate: "2026-12-01",
        endDate: "2026-12-05", type: "Holiday",
        status: "Approved", submittedDate: "2026-11-10",
        decisionDate: "2026-11-11"
    },
    {
        id: 2, employeeId: 1, employee: "John Carter",
        account: "Weeks 1–5", startDate: "2026-12-01",
        endDate: "2026-12-05", type: "Cancellation",
        originalRequestId: 1, status: "Pending",
        submittedDate: "2026-11-17", decisionDate: ""
    },
    {
        id: 3, employeeId: 1, employee: "John Carter",
        account: "Week 6", startDate: "2026-12-14",
        endDate: "2026-12-18", type: "Holiday",
        status: "Pending", submittedDate: "2026-11-18",
        decisionDate: ""
    },
    {
        id: 4, employeeId: 1, employee: "John Carter",
        account: "Weeks 1–5", startDate: "2026-10-05",
        endDate: "2026-10-09", type: "Holiday",
        status: "Rejected", submittedDate: "2026-09-20",
        decisionDate: "2026-09-22"
    }
];
let announcements: Announcement[] = [];
let scheduleHistory: Record<number, ScheduleChange[]> = {};

let nextUserId = 4;
let nextRequestId = 5;
let nextAnnouncementId = 1;
let nextScheduleChangeId = 1;

// Authentication
export async function login(
    email: string,
    password: string,
    role: SystemRole
): Promise<MockUser | null> {
    const user = users.find(u =>
        u.email === email && u.password === password && u.role === role
    );

    loggedInUser = user ?? null;
    return user ? { ...user } : null;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
    if (!loggedInUser) return null;

    const { password, ...user } = loggedInUser;
    return user;
}

export async function logout(): Promise<void> {
    loggedInUser = null;
}

// User management
export async function getUsers(): Promise<PublicUser[]> {
    return users.map(({ password, ...user }) => user);
}

export async function createEmployee(data: CreateEmployeeData): Promise<void> {
    if (users.some(u => u.email === data.email))
        throw new Error("An account with this email already exists.");

    const role: SystemRole =
        data.employmentType === "Admin" ? "Admin" :
            data.employmentType === "Accountant" ? "Accountant" : "Employee";

    const user: MockUser = {
        id: nextUserId++,
        name: data.name,
        email: data.email,
        password: data.password,
        role,
        employmentType: role === "Employee" ? data.employmentType : undefined,
        weeklySchedule: role === "Employee" ? data.weeklySchedule : undefined
    };

    users.push(user);

    if (role === "Employee") {
        employees.push({
            id: user.id,
            name: user.name,
            role: data.employmentType
        });

        holidayAccounts.push(...createHolidayAccounts(user.id));
    }
}

export async function updateUser(
    id: number,
    updates: Partial<Pick<MockUser,
        "name" | "email" | "password" | "role" | "employmentType" | "weeklySchedule"
    >>
): Promise<MockUser> {
    const user = users.find(u => u.id === id);
    if (!user) throw new Error("User not found.");

    if (updates.email && users.some(u => u.email === updates.email && u.id !== id))
        throw new Error("An account with this email already exists.");

    // Automatically save schedule changes
    if (
        updates.weeklySchedule &&
        user.weeklySchedule &&
        JSON.stringify(user.weeklySchedule) !== JSON.stringify(updates.weeklySchedule)
    ) {
        scheduleHistory[id] ??= [];

        scheduleHistory[id].push({
            id: nextScheduleChangeId++,
            date: new Date().toISOString().split("T")[0],
            previousSchedule: JSON.parse(JSON.stringify(user.weeklySchedule)),
            newSchedule: JSON.parse(JSON.stringify(updates.weeklySchedule))
        });
    }

    const role: SystemRole = updates.employmentType !== undefined
        ? updates.employmentType === "Admin" ? "Admin"
            : updates.employmentType === "Accountant" ? "Accountant"
                : "Employee"
        : updates.role ?? user.role;

    Object.assign(user, updates, { role });

    if (user.role === "Employee") {
        const employee = employees.find(e => e.id === id);

        if (employee) {
            Object.assign(employee, {
                name: user.name,
                role: user.employmentType
            });
        } else {
            employees.push({
                id,
                name: user.name,
                role: user.employmentType || "Full-time employee"
            });

            holidayAccounts.push(...createHolidayAccounts(id));
        }
    } else {
        employees = employees.filter(e => e.id !== id);
    }

    return { ...user };
}

export async function deleteUser(id: number): Promise<void> {
    if (!users.some(u => u.id === id))
        throw new Error("User not found.");

    users = users.filter(u => u.id !== id);
    employees = employees.filter(e => e.id !== id);
    holidayAccounts = holidayAccounts.filter(a => a.employeeId !== id);
    holidayRequests = holidayRequests.filter(r => r.employeeId !== id);
    delete scheduleHistory[id];

    if (loggedInUser?.id === id) loggedInUser = null;
}

// Employee information
export async function getEmployees(): Promise<Employee[]> {
    return employees.map(e => ({ ...e }));
}

export async function getEmployeeById(id: number): Promise<Employee | undefined> {
    const employee = employees.find(e => e.id === id);
    return employee ? { ...employee } : undefined;
}

export async function getEmployeeSchedule(id: number): Promise<WeeklySchedule | undefined> {
    const schedule = users.find(u => u.id === id)?.weeklySchedule;

    return schedule
        ? Object.fromEntries(
            Object.entries(schedule).map(([day, hours]) => [day, { ...hours }])
        ) as WeeklySchedule
        : undefined;
}

// Working schedule history
export async function getScheduleHistory(id: number): Promise<ScheduleChange[]> {
    return (scheduleHistory[id] || []).map(change => ({
        ...change,
        previousSchedule: Object.fromEntries(
            Object.entries(change.previousSchedule).map(([day, hours]) => [day, { ...hours }])
        ) as WeeklySchedule,
        newSchedule: Object.fromEntries(
            Object.entries(change.newSchedule).map(([day, hours]) => [day, { ...hours }])
        ) as WeeklySchedule
    }));
}

// Holiday accounts
export async function getHolidayAccounts(employeeId: number): Promise<MockHolidayAccount[]> {
    return holidayAccounts
        .filter(a => a.employeeId === employeeId)
        .map(a => ({
            ...a,
            accrued: { ...a.accrued },
            used: { ...a.used },
            remaining: { ...a.remaining }
        }));
}

// Holiday requests
export async function createHolidayRequest(
    request: Omit<MockRequest, "id" | "status" | "submittedDate" | "decisionDate" | "type">
        & { type?: RequestType }
): Promise<MockRequest> {
    const newRequest: MockRequest = {
        ...request,
        type: request.type ?? "Holiday",
        id: nextRequestId++,
        status: "Pending",
        submittedDate: new Date().toISOString().split("T")[0],
        decisionDate: ""
    };

    holidayRequests.push(newRequest);
    return { ...newRequest };
}

export async function createCancellationRequest(
    employeeId: number,
    employee: string,
    originalRequestId: number
): Promise<MockRequest> {
    const original = holidayRequests.find(r =>
        r.id === originalRequestId &&
        r.employeeId === employeeId &&
        r.status === "Approved" &&
        (r.type ?? "Holiday") === "Holiday"
    );

    if (!original) throw new Error("Approved holiday not found.");

    if (holidayRequests.some(r =>
        r.originalRequestId === originalRequestId && r.status === "Pending"
    )) {
        throw new Error("A cancellation request is already pending.");
    }

    return createHolidayRequest({
        employeeId,
        employee,
        account: original.account,
        startDate: original.startDate,
        endDate: original.endDate,
        type: "Cancellation",
        originalRequestId
    });
}

export async function getEmployeeRequestHistory(employeeId: number): Promise<MockRequest[]> {
    return holidayRequests
        .filter(r => r.employeeId === employeeId)
        .map(r => ({ ...r }));
}

export async function getApprovedHolidayRequests(): Promise<MockRequest[]> {
    return holidayRequests
        .filter(r => r.status === "Approved" && (r.type ?? "Holiday") === "Holiday")
        .map(r => ({ ...r }));
}

export async function getRequests(): Promise<AccountantRequest[]> {
    return holidayRequests
        .filter(r => r.status === "Pending")
        .map(r => ({
            id: String(r.id),
            employee: r.employee,
            dates: `${r.startDate} – ${r.endDate}`,
            status: r.status,
            submittedDate: r.submittedDate,
            type: r.type ?? "Holiday"
        }));
}

export async function getRequestHistory(): Promise<MockRequest[]> {
    return holidayRequests
        .filter(r => r.status !== "Pending")
        .map(r => ({ ...r }));
}

export async function approveRequest(id: number): Promise<MockRequest> {
    return updateRequestStatus(id, "Approved");
}

export async function rejectRequest(id: number): Promise<MockRequest> {
    return updateRequestStatus(id, "Rejected");
}

async function updateRequestStatus(id: number, status: string): Promise<MockRequest> {
    const request = holidayRequests.find(r => r.id === id);
    if (!request) throw new Error("Holiday request not found.");

    request.status = status;
    request.decisionDate = new Date().toISOString().split("T")[0];

    if (request.type === "Cancellation" && status === "Approved") {
        const original = holidayRequests.find(r => r.id === request.originalRequestId);

        if (original) {
            original.status = "Cancelled";
            original.decisionDate = request.decisionDate;
        }
    }

    return { ...request };
}

// Announcements
export async function sendAnnouncement(message: string): Promise<void> {
    if (!message.trim()) throw new Error("Please enter a message.");

    announcements.push({
        id: nextAnnouncementId++,
        message: message.trim(),
        date: new Date().toISOString().split("T")[0]
    });
}

export async function getAnnouncements(): Promise<Announcement[]> {
    return announcements.map(a => ({ ...a }));
}

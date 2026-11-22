import type { Employee, WeeklySchedule, ScheduleChange, MockHolidayAccount, MockRequest } from "./employee";
import type { SystemRole, PublicUser, CreateEmployeeData, Announcement } from "./admin";
import type { AccountantRequest } from "./accountant";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "holidaycount_token";

type ApiUser = { id: string; name?: string; fullName?: string; email: string; role: string; employmentType?: string | null };
type ApiRequest = {
    id: string; userId: string; accountType: number | string; requestType: number | string;
    originalRequestId?: string | null; startDate: string; endDate: string;
    status: number | string; submittedAtUtc: string; reviewedAtUtc?: string | null;
};

function roleName(role: string): SystemRole {
    const value = role.toLowerCase();
    return value === "admin" ? "Admin" : value === "accountant" ? "Accountant" : "Employee";
}

function enumName(value: number | string, names: string[]): string {
    if (typeof value === "number") return names[value] ?? names[0];
    const normalized = value.toLowerCase();
    return names.find(name => name.toLowerCase() === normalized) ?? names[0];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? body?.title ?? `Request failed (${response.status}).`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

const toPublicUser = (user: ApiUser): PublicUser => ({
    id: user.id, name: user.name ?? user.fullName ?? "", email: user.email,
    role: roleName(user.role), employmentType: user.employmentType ?? undefined
});

function toMockRequest(value: ApiRequest, userName = "Employee"): MockRequest {
    const type = enumName(value.requestType, ["Holiday", "Cancellation", "Transfer"]) as MockRequest["type"];
    return {
        id: value.id, employeeId: value.userId, employee: userName,
        account: enumName(value.accountType, ["Weeks 1–5", "Week 6"]),
        startDate: value.startDate, endDate: value.endDate,
        type, status: enumName(value.status, ["Pending", "Approved", "Rejected", "Cancelled"]),
        submittedDate: value.submittedAtUtc.slice(0, 10),
        decisionDate: value.reviewedAtUtc?.slice(0, 10) ?? "",
        originalRequestId: value.originalRequestId ?? undefined
    };
}

async function usersById(): Promise<Map<string, string>> {
    const employees = await request<Employee[]>("/employees");
    return new Map(employees.map(employee => [employee.id, employee.name]));
}

export const WORKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const CALENDAR_WEEKDAYS = [...WORKDAYS, "Saturday", "Sunday"] as const;
export const EMPLOYMENT_TYPES = ["Full-time employee", "Part-time employee"] as const;
export const DEFAULT_EMPLOYMENT_TYPE = EMPLOYMENT_TYPES[0];

export function createDefaultSchedule(): WeeklySchedule {
    return Object.fromEntries(WORKDAYS.map(day => [day, { from: "08:00", to: "16:00" }])) as WeeklySchedule;
}

export async function login(email: string, password: string): Promise<PublicUser | null> {
    try {
        const result = await request<{ token: string; id?: string; name: string; email: string; role: string; employmentType?: string }>(
            "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }
        );
        // The login token is returned by the backend, so store it for subsequent requests.
        localStorage.setItem(TOKEN_KEY, result.token);
        const user = await getCurrentUser();
        return user ?? { id: result.id ?? "", name: result.name, email: result.email, role: roleName(result.role), employmentType: result.employmentType };
    } catch (error) {
        if (error instanceof Error && (error.message.includes("401") || error.message.toLowerCase().includes("invalid email or password"))) return null;
        throw error;
    }
}

export async function getCurrentUser(): Promise<PublicUser | null> {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    let user: PublicUser;
    try {
        user = toPublicUser(await request<ApiUser>("/auth/me"));
    }
    catch { localStorage.removeItem(TOKEN_KEY); return null; }
    if (user.role === "Employee") {
        try { user.weeklySchedule = await getEmployeeSchedule(user.id); }
        catch { /* Keep the authenticated user if schedule loading temporarily fails. */ }
    }
    return user;
}

export async function logout(): Promise<void> {
    try { if (localStorage.getItem(TOKEN_KEY)) await request<void>("/auth/logout", { method: "POST" }); }
    finally { localStorage.removeItem(TOKEN_KEY); }
}

export async function getUsers(): Promise<PublicUser[]> {
    const users = await request<ApiUser[]>("/auth/users");
    return Promise.all(users.map(async user => {
        const result = toPublicUser(user);
        if (result.role === "Employee") result.weeklySchedule = await getEmployeeSchedule(result.id);
        return result;
    }));
}

function toWorkSchedule(schedule?: WeeklySchedule) {
    if (!schedule) return {};
    return Object.fromEntries(Object.entries(schedule).map(([day, hours]) => [day, hours]));
}

function rolePayload(employmentType: string) {
    if (employmentType === "Accountant") return { role: "accountant" };
    if (employmentType === "Admin") return { role: "admin" };
    return { role: "employee", employmentType: employmentType === "Part-time employee" ? 1 : 0 };
}

export async function createEmployee(data: CreateEmployeeData): Promise<void> {
    await request<void>("/auth/users", { method: "POST", body: JSON.stringify({
        fullName: data.name, email: data.email, password: data.password,
        ...rolePayload(data.employmentType), workSchedule: toWorkSchedule(data.weeklySchedule)
    }) });
}

export async function updateUser(id: string, updates: Partial<Pick<PublicUser, "name" | "email" | "role" | "employmentType" | "weeklySchedule">> & { password?: string }): Promise<PublicUser> {
    await request<void>(`/auth/users/${id}`, { method: "PUT", body: JSON.stringify({
        name: updates.name, email: updates.email, password: updates.password,
        ...(updates.employmentType ? rolePayload(updates.employmentType) : updates.role ? { role: updates.role.toLowerCase() } : {}),
        workSchedule: updates.weeklySchedule ? toWorkSchedule(updates.weeklySchedule) : undefined
    }) });
    return { id, name: updates.name ?? "", email: updates.email ?? "", role: updates.role ?? "Employee", employmentType: updates.employmentType, weeklySchedule: updates.weeklySchedule };
}

export async function deleteUser(id: string): Promise<void> {
    await request<void>(`/auth/users/${id}`, { method: "DELETE" });
}

export async function getEmployees(): Promise<Employee[]> {
    return request<Employee[]>("/employees");
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
    return (await getEmployees()).find(employee => employee.id === id);
}

export async function getEmployeeSchedule(id: string): Promise<WeeklySchedule | undefined> {
    const data = await request<Record<string, { from: string; to: string }>>(`/employees/${id}/schedule`);
    return Object.fromEntries(WORKDAYS.map(day => [day, data[day] ?? { from: "", to: "" }])) as WeeklySchedule;
}

export async function getScheduleHistory(id: string): Promise<ScheduleChange[]> {
    const changes = await request<Array<{ id: string; effectiveFrom: string; newScheduleJson: string }>>(`/employees/${id}/schedule-history`);
    return changes.map(change => ({
        id: change.id, date: change.effectiveFrom,
        previousSchedule: createDefaultSchedule(),
        newSchedule: JSON.parse(change.newScheduleJson) as WeeklySchedule
    }));
}

export async function getHolidayAccounts(employeeId: string): Promise<MockHolidayAccount[]> {
    return request<MockHolidayAccount[]>(`/employees/${employeeId}/holiday-accounts`);
}

export async function createHolidayRequest(input: { employeeId: string; employee: string; account: string; startDate: string; endDate: string }): Promise<MockRequest> {
    const accounts = await getHolidayAccounts(input.employeeId);
    const account = accounts.find(item => item.name === input.account);
    if (!account) throw new Error("Holiday account not found.");
    const result = await request<ApiRequest>("/leave-requests", { method: "POST", body: JSON.stringify({
        accountId: account.id, startDate: input.startDate, endDate: input.endDate,
        requestedDays: 1, requestedHours: 0
    }) });
    return toMockRequest(result, input.employee);
}

export async function createCancellationRequest(_employeeId: string, employee: string, originalRequestId: string): Promise<MockRequest> {
    const result = await request<ApiRequest>(`/leave-requests/${originalRequestId}/cancel`, { method: "POST" });
    return toMockRequest(result, employee);
}

export async function getEmployeeRequestHistory(_employeeId: string): Promise<MockRequest[]> {
    const requests = await request<ApiRequest[]>("/leave-requests");
    return requests.map(item => toMockRequest(item));
}

export async function getApprovedHolidayRequests(): Promise<MockRequest[]> {
    const requests = await request<ApiRequest[]>("/leave-requests/approved-holidays");
    const names = await usersById();
    return requests.map(item => toMockRequest(item, names.get(item.userId) ?? "Employee"));
}

export async function getRequests(): Promise<AccountantRequest[]> {
    const [requests, names] = await Promise.all([request<ApiRequest[]>("/leave-requests/pending"), usersById()]);
    return requests.map(item => ({
        id: item.id, employee: names.get(item.userId) ?? "Employee",
        dates: `${item.startDate} – ${item.endDate}`,
        status: enumName(item.status, ["Pending", "Approved", "Rejected", "Cancelled"]),
        submittedDate: item.submittedAtUtc.slice(0, 10),
        type: enumName(item.requestType, ["Holiday", "Cancellation", "Transfer"]) as AccountantRequest["type"]
    }));
}

export async function getRequestHistory(): Promise<MockRequest[]> {
    const [requests, names] = await Promise.all([request<ApiRequest[]>("/leave-requests/history"), usersById()]);
    return requests.map(item => toMockRequest(item, names.get(item.userId) ?? "Employee"));
}

export async function approveRequest(id: string): Promise<MockRequest> {
    return toMockRequest(await request<ApiRequest>(`/leave-requests/${id}/approve`, { method: "POST" }));
}

export async function rejectRequest(id: string): Promise<MockRequest> {
    return toMockRequest(await request<ApiRequest>(`/leave-requests/${id}/reject`, { method: "POST", body: "{}" }));
}

export async function sendAnnouncement(message: string): Promise<void> {
    await request<void>("/announcements", { method: "POST", body: JSON.stringify({ message }) });
}

export async function getAnnouncements(): Promise<Announcement[]> {
    return request<Announcement[]>("/announcements");
}

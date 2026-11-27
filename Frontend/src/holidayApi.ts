import type { Employee, WeeklySchedule, ScheduleChange, MockHolidayAccount, MockRequest } from "./employee";
import type { SystemRole, PublicUser, CreateEmployeeData, Announcement } from "./admin";
import type { AccountantRequest } from "./accountant";

import { Api, type CreateUserDto, type CreateRulePresetDto, type SaveHolidayRulesDto } from "./generated/client";

const TOKEN_KEY = "holidaycount_token";

type ApiUser = { id: string; name?: string; fullName?: string; email: string; role: string; employmentType?: string | null };
type ApiRequest = {
    id: string; userId: string; accountType: number | string; requestType: number | string;
    originalRequestId?: string | null; startDate: string; endDate: string;
    status: number | string; submittedAtUtc: string; reviewedAtUtc?: string | null;
    requestedHours?: number;
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

const { api } = new Api({
    baseUrl: (import.meta.env.VITE_API_URL ?? "/api").replace(/\/?api\/?$/, "").replace(/\/$/, ""),
    securityWorker: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    }
});

async function responseData<T>(request: Promise<Response>, parseJson = true): Promise<T> {
    try {
        const response = await request;
        if (parseJson) return await response.json() as T;
        return undefined as T;
    } catch (error) {
        if (!(error instanceof Response)) throw error;
        const body = await error.json().catch(() => null);
        if (error.status === 401) throw new Error("Request failed (401).");
        throw new Error(body?.message ?? body?.title ?? `Request failed (${error.status}).`);
    }
}

type PresetSettings = Required<NonNullable<CreateRulePresetDto["settings"]>>;
export type RulePreset = { id: string; name: string; settings: PresetSettings };
export type SystemParameter = { key: string; value: unknown; effectiveFrom: string };

export const getRulePresets = () => responseData<RulePreset[]>(api.rulePresetsList());

export const createRulePreset = (data: CreateRulePresetDto) => responseData<RulePreset>(api.rulePresetsCreate(data));

export const getSystemParameters = () => responseData<SystemParameter[]>(api.systemParametersList());

export const saveSystemParameters = (data: SaveHolidayRulesDto) => responseData<SystemParameter[]>(api.systemParametersCreate(data));

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
    const employees = await getEmployees();
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
        const result = await responseData<{ token: string; id?: string; name: string; email: string; role: string; employmentType?: string }>(
            api.authLoginCreate({ email, password })
        );
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
        user = toPublicUser(await responseData<ApiUser>(api.authMeList()));
    }
    catch { localStorage.removeItem(TOKEN_KEY); return null; }
    if (user.role === "Employee") {
        try { user.weeklySchedule = await getEmployeeSchedule(user.id); }
        catch { /* Keep the authenticated user if schedule loading temporarily fails. */ }
    }
    return user;
}

export async function logout(): Promise<void> {
    try { if (localStorage.getItem(TOKEN_KEY)) await responseData<void>(api.authLogoutCreate(), false); }
    finally { localStorage.removeItem(TOKEN_KEY); }
}

export async function getUsers(): Promise<PublicUser[]> {
    const users = await responseData<ApiUser[]>(api.authUsersList());
    return Promise.all(users.map(async user => {
        const result = toPublicUser(user);
        if (result.role === "Employee") result.weeklySchedule = await getEmployeeSchedule(result.id);
        return result;
    }));
}

function rolePayload(employmentType: string): Pick<CreateUserDto, "role" | "employmentType"> {
    if (employmentType === "Accountant") return { role: "accountant" };
    if (employmentType === "Admin") return { role: "admin" };
    return { role: "employee", employmentType: employmentType === "Part-time employee" ? 1 : 0 };
}

export async function createEmployee(data: CreateEmployeeData): Promise<void> {
    await responseData<void>(api.authUsersCreate({
        fullName: data.name, email: data.email, password: data.password,
        ...rolePayload(data.employmentType), workSchedule: data.weeklySchedule ?? {}
    }), false);
}

export async function updateUser(id: string, updates: Partial<Pick<PublicUser, "name" | "email" | "role" | "employmentType" | "weeklySchedule">> & { password?: string }): Promise<void> {
    await responseData<void>(api.authUsersUpdate(id, {
        name: updates.name, email: updates.email, password: updates.password,
        ...(updates.employmentType ? rolePayload(updates.employmentType) : updates.role ? { role: updates.role.toLowerCase() } : {}),
        workSchedule: updates.weeklySchedule
    }), false);
}

export async function deleteUser(id: string): Promise<void> {
    await responseData<void>(api.authUsersDelete(id), false);
}

export async function getEmployees(): Promise<Employee[]> {
    return responseData<Employee[]>(api.employeesList());
}

export async function getEmployeeSchedule(id: string): Promise<WeeklySchedule | undefined> {
    const data = await responseData<Record<string, { from: string; to: string }>>(api.employeesScheduleList(id));
    return Object.fromEntries(WORKDAYS.map(day => [day, data[day] ?? { from: "", to: "" }])) as WeeklySchedule;
}

export async function getScheduleHistory(id: string): Promise<ScheduleChange[]> {
    const changes = await responseData<Array<{ id: string; effectiveFrom: string; newScheduleJson: string }>>(api.employeesScheduleHistoryList(id));
    return changes.map(change => ({
        id: change.id, date: change.effectiveFrom,
        previousSchedule: createDefaultSchedule(),
        newSchedule: JSON.parse(change.newScheduleJson) as WeeklySchedule
    }));
}

export async function getHolidayAccounts(employeeId: string): Promise<MockHolidayAccount[]> {
    return responseData<MockHolidayAccount[]>(api.employeesHolidayAccountsList(employeeId));
}

export type FutureBalance = { id: string; name: string; remainingHours: number };

export function getFutureBalance(date: string) {
    return responseData<FutureBalance[]>(api.holidayAccountsFutureBalanceList({ date }));
}

export async function createTransferRequest(accountId: string, hours: number, writtenAgreement: boolean) {
    const request = await responseData<ApiRequest>(api.leaveRequestsTransferCreate({ accountId, hours, writtenAgreement }));
    return toMockRequest(request);
}

export async function createHolidayRequest(accountId: string, startDate: string, endDate: string): Promise<void> {
    await responseData<void>(api.leaveRequestsCreate({ accountId, startDate, endDate, requestedDays: 1, requestedHours: 0 }), false);
}

export async function createCancellationRequest(originalRequestId: string): Promise<void> {
    await responseData<void>(api.leaveRequestsCancelCreate(originalRequestId), false);
}

export async function getEmployeeRequestHistory(): Promise<MockRequest[]> {
    const requests = await responseData<ApiRequest[]>(api.leaveRequestsList());
    return requests.map(item => toMockRequest(item));
}

export async function getApprovedHolidayRequests(): Promise<MockRequest[]> {
    const requests = await responseData<ApiRequest[]>(api.leaveRequestsApprovedHolidaysList());
    const names = await usersById();
    return requests.map(item => toMockRequest(item, names.get(item.userId) ?? "Employee"));
}

export async function getRequests(): Promise<AccountantRequest[]> {
    const [requests, names] = await Promise.all([responseData<ApiRequest[]>(api.leaveRequestsPendingList()), usersById()]);
    return requests.map(item => ({
        id: item.id, employee: names.get(item.userId) ?? "Employee",
        dates: `${item.startDate} – ${item.endDate}`,
        requestedHours: item.requestedHours,
        status: enumName(item.status, ["Pending", "Approved", "Rejected", "Cancelled"]),
        submittedDate: item.submittedAtUtc.slice(0, 10),
        type: enumName(item.requestType, ["Holiday", "Cancellation", "Transfer"]) as AccountantRequest["type"]
    }));
}

export async function getRequestHistory(): Promise<MockRequest[]> {
    const [requests, names] = await Promise.all([responseData<ApiRequest[]>(api.leaveRequestsHistoryList()), usersById()]);
    return requests.map(item => toMockRequest(item, names.get(item.userId) ?? "Employee"));
}

export async function approveRequest(id: string): Promise<void> {
    await responseData<void>(api.leaveRequestsApproveCreate(id), false);
}

export async function rejectRequest(id: string): Promise<void> {
    await responseData<void>(api.leaveRequestsRejectCreate(id, {}), false);
}

export async function sendAnnouncement(message: string): Promise<void> {
    await responseData<void>(api.announcementsCreate({ message }), false);
}

export async function getAnnouncements(): Promise<Announcement[]> {
    return responseData<Announcement[]>(api.announcementsList());
}

export type PublicHoliday = { id: string; name: string; date: string; isCompanySpecific: boolean };

export const getPublicHolidays = () => responseData<PublicHoliday[]>(api.publicHolidaysList());

export function savePublicHoliday({ id, ...holiday }: PublicHoliday) {
    return responseData<PublicHoliday>(id ? api.publicHolidaysUpdate(id, holiday) : api.publicHolidaysCreate(holiday));
}

export const deletePublicHoliday = (id: string) => responseData<void>(api.publicHolidaysDelete(id), false);

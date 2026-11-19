
import type { WeeklySchedule } from "./employee";

export type SystemRole = "Employee" | "Accountant" | "Admin";

export interface MockUser {
    id: string;
    name: string;
    email: string;
    password: string;
    role: SystemRole;
    employmentType?: string;
    weeklySchedule?: WeeklySchedule;
}

export interface PublicUser {
    id: string;
    name: string;
    email: string;
    role: SystemRole;
    employmentType?: string;
    weeklySchedule?: WeeklySchedule;
}

export interface CreateEmployeeData {
    name: string;
    email: string;
    password: string;
    employmentType: string;
    weeklySchedule?: WeeklySchedule;
}

export interface Announcement {
    id: string;
    message: string;
    date: string;
}

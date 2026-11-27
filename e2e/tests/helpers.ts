import { expect, type Page } from "@playwright/test";

function env(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set (see .env or the E2E workflow).`);
    return value;
}

export const users = {
    admin: { path: "admin", email: env("SEED_ADMIN_EMAIL"), password: env("SEED_ADMIN_PASSWORD") },
    accountant: { path: "accountant", email: env("SEED_ACCOUNTANT_EMAIL"), password: env("SEED_ACCOUNTANT_PASSWORD") },
    employee: { path: "employee", email: env("SEED_EMPLOYEE_EMAIL"), password: env("SEED_EMPLOYEE_PASSWORD") }
};

type User = (typeof users)[keyof typeof users];

// Logs in through the real form and waits for the role's own page.
export async function login(page: Page, user: User) {
    await page.goto("/");
    await page.getByPlaceholder("Email").fill(user.email);
    await page.getByPlaceholder("Password").fill(user.password);
    await page.getByRole("button", { name: "Enter dashboard" }).click();
    await expect(page).toHaveURL(new RegExp(`/${user.path}$`));
}

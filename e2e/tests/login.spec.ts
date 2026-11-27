import { test, expect } from "@playwright/test";
import { login, users } from "./helpers";

for (const [role, user] of Object.entries(users)) {
    test(`${role} logs in and lands on the ${user.path} page`, async ({ page }) => {
        await login(page, user);
    });
}

test("wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Email").fill(users.employee.email);
    await page.getByPlaceholder("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Enter dashboard" }).click();

    await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");
    await expect(page).toHaveURL(/\/$/);
});

import { test, expect, type Page } from "@playwright/test";
import { login, users } from "./helpers";

const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// A Monday and Tuesday at least two weeks ahead, and a check date one week later.
function holidayDates() {
    const start = new Date();
    start.setDate(start.getDate() + 14);
    while (start.getDay() !== 1) start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const check = new Date(end);
    check.setDate(check.getDate() + 7);
    return { start: iso(start), end: iso(end), check: iso(check) };
}

// Total hours left on the employee's accounts on a future date.
async function futureBalance(page: Page, date: string): Promise<number> {
    await page.getByLabel("Select a future date").fill(date);
    await page.getByRole("button", { name: "Calculate" }).click();
    const status = page.getByRole("status").filter({ hasText: "hours left" });
    await expect(status).toBeVisible();
    const hours = [...((await status.textContent()) ?? "").matchAll(/(-?\d+(?:\.\d+)?) hours left/g)];
    return hours.reduce((sum, m) => sum + Number(m[1]), 0);
}

test("approved holiday lowers the employee's future balance", async ({ browser }) => {
    const { start, end, check } = holidayDates();

    // Employee: balance before, then a holiday request (pending does not change the balance).
    const employee = await browser.newPage();
    await login(employee, users.employee);
    const before = await futureBalance(employee, check);

    const account = employee.getByLabel("Holiday account").first();
    await expect(account.locator("option")).not.toHaveCount(1);
    await account.selectOption({ index: 1 });
    await employee.getByLabel("From", { exact: true }).fill(start);
    await employee.getByLabel("To", { exact: true }).fill(end);
    // Wait until the API has stored the request.
    await Promise.all([
        employee.waitForResponse(r => r.url().includes("/api/leave-requests") && r.request().method() === "POST" && r.ok()),
        employee.getByRole("button", { name: "Submit holiday request" }).click()
    ]);

    // Accountant: approves exactly this request.
    const accountant = await browser.newPage();
    await login(accountant, users.accountant);
    // Only the pending row has an Approve button; approved holidays are listed elsewhere too.
    const row = accountant.getByRole("row")
        .filter({ hasText: `${start} – ${end}` })
        .filter({ has: accountant.getByRole("button", { name: "Approve" }) });
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(row).toHaveCount(0);

    // Employee: the balance on the same future date is now lower.
    await employee.reload();
    expect(await futureBalance(employee, check)).toBeLessThan(before);
});

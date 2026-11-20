
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentUser, getHolidayAccounts, getEmployeeRequestHistory,
    getApprovedHolidayRequests, getEmployees, createHolidayRequest,
    createCancellationRequest, logout, CALENDAR_WEEKDAYS
} from "../mockApi";
import type { PublicUser } from "../admin";
import type { MockHolidayAccount, MockRequest, WeeklySchedule } from "../employee";
import type { Employee as EmployeeType } from "../employee";
import HolidayCalendar from "./HolidayCalendar";

const balanceLabels = ["Accrued holiday", "Used holiday", "Total holiday left"];
const historyColumns = [
    { title: "Type", value: (request: MockRequest) => request.type ?? "Holiday" },
    { title: "Account", value: (request: MockRequest) => request.account },
    { title: "Dates", value: (request: MockRequest) => `${request.startDate} – ${request.endDate}` },
    { title: "Status", value: (request: MockRequest) => request.status },
    { title: "Submitted", value: (request: MockRequest) => request.submittedDate },
    { title: "Decision", value: (request: MockRequest) => request.decisionDate || "—" }
];
const balanceKeys = ["accrued", "used", "remaining"] as const;

function Employee() {
    const navigate = useNavigate();
    const [user, setUser] = useState<PublicUser | null>(null);
    const [accounts, setAccounts] = useState<MockHolidayAccount[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [approved, setApproved] = useState<MockRequest[]>([]);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [accountId, setAccountId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [cancellationId, setCancellationId] = useState("");
    const [futureDate, setFutureDate] = useState("");
    const [month, setMonth] = useState(new Date());
    const [error, setError] = useState("");

    async function loadData() {
        const current = await getCurrentUser();
        if (!current) return navigate("/");
        setUser(current);

        const [a, h, all, staff] = await Promise.all([
            getHolidayAccounts(current.id),
            getEmployeeRequestHistory(current.id),
            getApprovedHolidayRequests(),
            getEmployees()
        ]);
        setAccounts(a);
        setHistory(h);
        setApproved(all);
        setEmployees(staff);
    }

    useEffect(() => { void loadData(); }, []);

    const approvedHolidays = approved.filter(r =>
        r.employeeId === user?.id && (r.type ?? "Holiday") === "Holiday"
    );

    async function submitRequest() {
        const account = accounts.find(a => a.id === accountId);
        if (!user || !account || !startDate || !endDate || endDate < startDate) {
            setError("Please select an account and valid dates.");
            return;
        }

        await createHolidayRequest({
            employeeId: user.id, employee: user.name, account: account.name,
            startDate, endDate
        });
        setStartDate("");
        setEndDate("");
        setError("");
        await loadData();
    }

    async function submitCancellation() {
        if (!user || !cancellationId) {
            setError("Please select an approved holiday to cancel.");
            return;
        }
        try {
            await createCancellationRequest(user.id, user.name, cancellationId);
            setCancellationId("");
            setError("");
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not submit cancellation request.");
        }
    }

    async function signOut() {
        await logout();
        navigate("/");
    }

    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const schedule = user?.weeklySchedule;

    function getWorkingHours(day: string) {
        const hours = schedule?.[day as keyof WeeklySchedule];
        return hours ? `${hours.from} – ${hours.to}` : "—";
    }

    return (
        <div className="employee-page">
            <div className="employee-header">
                {user?.name}　Employee
                <button onClick={signOut}>Sign out</button>
            </div>

            <div className="employee-cards">
                <div className="employee-card">
                    <h3>Book holiday</h3>
                    <label>Holiday account</label>
                    <select className="employee-input" value={accountId}
                            onChange={e => setAccountId(e.target.value)}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <label>From</label>
                    <input className="employee-input" type="date" value={startDate}
                           onChange={e => setStartDate(e.target.value)} />

                    <label>To</label>
                    <input className="employee-input" type="date" value={endDate}
                           onChange={e => setEndDate(e.target.value)} />

                    <button onClick={submitRequest} disabled={!accounts.length}>Submit holiday request</button>

                    <hr className="employee-divider" />
                    <h3>Request holiday cancellation</h3>
                    <label>Approved holiday</label>
                    <select className="employee-input" value={cancellationId}
                            onChange={e => setCancellationId(e.target.value)}>
                        <option value="">Select approved holiday</option>
                        {approvedHolidays.map(r =>
                            <option key={r.id} value={r.id}>{r.account}: {r.startDate} – {r.endDate}</option>
                        )}
                    </select>

                    <button onClick={submitCancellation}>
                        Submit cancellation request
                    </button>
                    {error && <p className="employee-error">{error}</p>}

                    <div className="transfer-box">
                        <strong>Unused holiday transfer</strong>
                        <p className="employee-muted small">Have unused holiday hours you may want to carry over?</p>
                        <button className="employee-small-button" disabled>Request transfer</button>
                    </div>
                </div>

                <div className="employee-card">
                    {accounts.map((a, i) => (
                        <Fragment key={a.id}>
                            {i > 0 && <hr className="employee-divider" />}
                            <h3>{a.name}</h3>
                            {balanceKeys.map((key, index) => (
                                <div key={key} className="balance-row">
                                    {balanceLabels[index]}
                                    <div className="balance-value">{a[key].hours} hours</div>
                                </div>
                            ))}
                            <p>Eligible date of use: {a.eligibleDate || "—"}</p>
                        </Fragment>
                    ))}
                    {!accounts.length && <p>No holiday accounts available.</p>}
                </div>

                <div className="employee-card">
                    <h3>Future holiday balance</h3>
                    <p className="employee-muted">Check how much holiday you will have on a future date.</p>
                    <label>Select a future date</label>
                    <input className="employee-input" type="date" value={futureDate}
                           onChange={e => setFutureDate(e.target.value)}
                           min={new Date().toISOString().split("T")[0]} />
                    <button className={!futureDate ? "employee-small-button" : "employee-small-button active"}
                            disabled={!futureDate}>Calculate</button>

                    <div className="future-balance">
                        <strong>Future balance</strong>
                        <p className="employee-muted small no-bottom-margin">
                            Your calculated balance will appear here.
                        </p>
                    </div>

                    <hr className="employee-divider" />
                    <h3>Working schedule</h3>
                    <p className="employee-muted small">Your current weekly working hours.</p>
                    <table className="employee-table">
                        <thead>
                        <tr>
                            <th className="employee-cell left">Day</th>
                            <th className="employee-cell">Working hours</th>
                        </tr>
                        </thead>
                        <tbody>
                        {CALENDAR_WEEKDAYS.map(day => (
                            <tr key={day}>
                                <td className="employee-cell left">{day}</td>
                                <td className="employee-cell">{getWorkingHours(day)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="employee-card calendar-card">
                <div className="calendar-heading">
                    <h3>Holiday calendar</h3>
                    <div>
                        <button onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
                        {month.toLocaleDateString("en", { month: "long", year: "numeric" })}
                        <button onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
                    </div>
                </div>

                <HolidayCalendar month={month} employees={employees} approved={approved} />
            </div>

            <div className="employee-card history-card">
                <h3>Request history</h3>
                <div className="calendar-scroll">
                    <table className="employee-table history-table">
                        <thead>
                        <tr>{historyColumns.map(column => (
                            <th key={column.title} className="employee-cell left">{column.title}</th>
                        ))}</tr>
                        </thead>
                        <tbody>
                        {history.map(r => (
                            <tr key={r.id}>
                                {historyColumns.map(column => (
                                    <td key={column.title} className="employee-cell left">
                                        {column.value(r)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {!history.length && <tr><td colSpan={6} className="employee-cell">No requests yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Employee;

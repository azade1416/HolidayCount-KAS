import { useEffect, useState } from "react";
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
    const [bookingError, setBookingError] = useState("");
    const [cancellationError, setCancellationError] = useState("");

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
        setAccountId(currentId => a.some(account => account.id === currentId) ? currentId : a[0]?.id ?? "");
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
            setBookingError("Please select an account and valid dates.");
            return;
        }
        try {
            await createHolidayRequest({
                employeeId: user.id, employee: user.name, account: account.name, startDate, endDate
            });
            setStartDate("");
            setEndDate("");
            setBookingError("");
            await loadData();
        } catch (e) {
            setBookingError(e instanceof Error ? e.message : "Could not submit holiday request.");
        }
    }

    async function submitCancellation() {
        if (!user || !cancellationId) {
            setCancellationError("Please select an approved holiday to cancel.");
            return;
        }
        try {
            await createCancellationRequest(user.id, user.name, cancellationId);
            setCancellationId("");
            setCancellationError("");
            await loadData();
        } catch (e) {
            setCancellationError(e instanceof Error ? e.message : "Could not submit cancellation request.");
        }
    }

    async function signOut() {
        await logout();
        navigate("/");
    }

    function getWorkingHours(day: string) {
        const hours = user?.weeklySchedule?.[day as keyof WeeklySchedule];
        return hours ? `${hours.from} – ${hours.to}` : "—";
    }

    const weekdays = CALENDAR_WEEKDAYS.slice(0, 5); // Monday–Friday
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    return (
        <div className="employee-page">
            <div className="employee-header">
                {user?.name}　Employee
                <button onClick={signOut}>Sign out</button>
            </div>

            <div className="employee-cards">
                <div className="employee-card">
                    <div className="action-row">
                        <h3>Book holiday</h3>
                        <div className="action-fields">
                            <label>Holiday account
                                <select className="employee-input" value={accountId}
                                        onChange={e => setAccountId(e.target.value)}>
                                    <option value="">Select holiday account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </label>
                            <label>From
                                <input className="employee-input" type="date" value={startDate}
                                       onChange={e => setStartDate(e.target.value)} />
                            </label>
                            <label>To
                                <input className="employee-input" type="date" value={endDate}
                                       onChange={e => setEndDate(e.target.value)} />
                            </label>
                            <button onClick={submitRequest} disabled={!accounts.length}>Submit holiday request</button>
                            {bookingError && <span className="employee-error">{bookingError}</span>}
                        </div>
                    </div>

                    <div className="action-row">
                        <h3>Request holiday cancellation</h3>
                        <div className="action-fields">
                            <label>Approved holiday
                                <select className="employee-input" value={cancellationId}
                                        onChange={e => setCancellationId(e.target.value)}>
                                    <option value="">Select approved holiday</option>
                                    {approvedHolidays.map(r =>
                                        <option key={r.id} value={r.id}>{r.account}: {r.startDate} – {r.endDate}</option>
                                    )}
                                </select>
                            </label>
                            <button onClick={submitCancellation} disabled={!approvedHolidays.length}>
                                Submit cancellation request
                            </button>
                            {cancellationError && <span className="employee-error">{cancellationError}</span>}
                        </div>
                    </div>

                    <div className="action-row">
                        <h3>Future holiday balance</h3>
                        <div className="action-fields">
                            <label>Select a future date
                                <input className="employee-input" type="date" value={futureDate}
                                       onChange={e => setFutureDate(e.target.value)}
                                       min={new Date().toISOString().split("T")[0]} />
                            </label>
                            <button disabled={!futureDate}>Calculate</button>
                            <div className="future-balance">
                                <strong>Future balance</strong>
                                <div className="employee-muted">Your calculated balance will appear here.</div>
                            </div>
                        </div>
                    </div>

                    <div className="action-row">
                        <h3>Unused holiday transfer</h3>
                        <div className="action-fields">
                            <span className="employee-muted">Have unused holiday hours you may want to carry over?</span>
                            <button disabled>Request transfer</button>
                        </div>
                    </div>
                </div>

                <div className="employee-card employee-row">
                    <table className="employee-table">
                        <thead>
                        <tr>{["Holiday account", "Accrued holiday", "Used holiday", "Total holiday left", "Eligible date"].map(x =>
                            <th key={x} className="employee-cell left">{x}</th>
                        )}</tr>
                        </thead>
                        <tbody>
                        {accounts.map(a => (
                            <tr key={a.id}>
                                {[a.name, `${a.accrued.hours} hours`, `${a.used.hours} hours`,
                                    `${a.remaining.hours} hours`, a.eligibleDate || "—"].map((x, i) =>
                                    <td key={i} className="employee-cell left">{x}</td>
                                )}
                            </tr>
                        ))}
                        {!accounts.length && <tr><td colSpan={5} className="employee-cell">No holiday accounts available.</td></tr>}
                        </tbody>
                    </table>

                    <div>
                        <h3>Working schedule</h3>
                        <p className="employee-muted">Your current weekly working hours.</p>
                    </div>
                    <table className="employee-table">
                        <thead>
                        <tr>{weekdays.map(d => <th key={d} className="employee-cell left">{d}</th>)}</tr>
                        </thead>
                        <tbody>
                        <tr>{weekdays.map(d => <td key={d} className="employee-cell left">{getWorkingHours(d)}</td>)}</tr>
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
                        <tr>{["Type", "Account", "Dates", "Status", "Submitted", "Decision"].map(x =>
                            <th key={x} className="employee-cell left">{x}</th>
                        )}</tr>
                        </thead>
                        <tbody>
                        {history.map(r => (
                            <tr key={r.id}>
                                {[r.type ?? "Holiday", r.account, `${r.startDate} – ${r.endDate}`,
                                    r.status, r.submittedDate, r.decisionDate || "—"].map((x, i) =>
                                    <td key={i} className="employee-cell left">{x}</td>
                                )}
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

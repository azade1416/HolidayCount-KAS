import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentUser, getHolidayAccounts, getEmployeeRequestHistory,
    getApprovedHolidayRequests, getEmployees, createHolidayRequest,
    createCancellationRequest, logout, CALENDAR_WEEKDAYS
} from "../holidayApi";
import type { PublicUser } from "../admin";
import type { MockHolidayAccount, MockRequest, WeeklySchedule, Employee as EmployeeType } from "../employee";
import HolidayCalendar from "./HolidayCalendar";

const weekdays = CALENDAR_WEEKDAYS.slice(0, 5); // Monday–Friday
const emptyForm = { accountId: "", startDate: "", endDate: "", cancellationId: "", futureDate: "" };

function Row({ title, children }: { title: string; children: ReactNode }) {
    return <div className="action-row"><h3>{title}</h3><div className="action-fields">{children}</div></div>;
}

function Table({ heads, rows, empty, className = "" }: {
    heads: string[]; rows: ReactNode[][]; empty?: string; className?: string;
}) {
    return (
        <table className={`employee-table ${className}`}>
            <thead><tr>{heads.map(h => <th key={h} className="employee-cell left">{h}</th>)}</tr></thead>
            <tbody>
            {rows.map((cells, i) => (
                <tr key={i}>{cells.map((c, j) => <td key={j} className="employee-cell left">{c}</td>)}</tr>
            ))}
            {!rows.length && empty && <tr><td colSpan={heads.length} className="employee-cell">{empty}</td></tr>}
            </tbody>
        </table>
    );
}

function Employee() {
    const navigate = useNavigate();
    const [user, setUser] = useState<PublicUser | null>(null);
    const [accounts, setAccounts] = useState<MockHolidayAccount[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [approved, setApproved] = useState<MockRequest[]>([]);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [month, setMonth] = useState(new Date());
    const [bookingError, setBookingError] = useState("");
    const [cancellationError, setCancellationError] = useState("");

    const { accountId, startDate, endDate, cancellationId, futureDate } = form;
    const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    async function loadData() {
        const current = await getCurrentUser();
        if (!current) return navigate("/");
        setUser(current);
        const [a, h, all, staff] = await Promise.all([
            getHolidayAccounts(current.id),
            getEmployeeRequestHistory(),
            getApprovedHolidayRequests(),
            getEmployees()
        ]);
        setAccounts(a);
        setForm(f => ({ ...f, accountId: a.some(x => x.id === f.accountId) ? f.accountId : a[0]?.id ?? "" }));
        setHistory(h);
        setApproved(all);
        setEmployees(staff);
    }

    useEffect(() => { void loadData(); }, []);

    const approvedHolidays = approved.filter(r =>
        r.employeeId === user?.id && (r.type ?? "Holiday") === "Holiday"
    );

    // Runs an action, resets part of the form on success and shows any error message.
    async function submit(action: () => Promise<unknown>, setError: (m: string) => void,
                          reset: Partial<typeof emptyForm>, fallback: string) {
        try {
            await action();
            setForm(f => ({ ...f, ...reset }));
            setError("");
            await loadData();
        } catch (e) {
            setError(e instanceof Error ? e.message : fallback);
        }
    }

    function submitRequest() {
        const account = accounts.find(a => a.id === accountId);
        if (!user || !account || !startDate || !endDate || endDate < startDate) {
            return setBookingError("Please select an account and valid dates.");
        }
        return submit(
            () => createHolidayRequest(account.id, startDate, endDate),
            setBookingError, { startDate: "", endDate: "" }, "Could not submit holiday request."
        );
    }

    function submitCancellation() {
        if (!user || !cancellationId) {
            return setCancellationError("Please select an approved holiday to cancel.");
        }
        return submit(
            () => createCancellationRequest(cancellationId),
            setCancellationError, { cancellationId: "" }, "Could not submit cancellation request."
        );
    }

    const workingHours = (day: string) => {
        const h = user?.weeklySchedule?.[day as keyof WeeklySchedule];
        return h ? `${h.from} – ${h.to}` : "—";
    };

    const goToMonth = (offset: number) =>
        setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));

    return (
        <div className="employee-page">
            <div className="employee-header">
                {user?.name}　Employee
                <button onClick={async () => { await logout(); navigate("/"); }}>Sign out</button>
            </div>

            <div className="employee-cards">
                <div className="employee-card">
                    <Row title="Book holiday">
                        <label>Holiday account
                            <select className="employee-input" value={accountId} onChange={set("accountId")}>
                                <option value="">Select holiday account</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </label>
                        <label>From
                            <input className="employee-input" type="date" value={startDate} onChange={set("startDate")} />
                        </label>
                        <label>To
                            <input className="employee-input" type="date" value={endDate} onChange={set("endDate")} />
                        </label>
                        <button onClick={submitRequest} disabled={!accounts.length}>Submit holiday request</button>
                        {bookingError && <span className="employee-error">{bookingError}</span>}
                    </Row>

                    <Row title="Request holiday cancellation">
                        <label>Approved holiday
                            <select className="employee-input" value={cancellationId} onChange={set("cancellationId")}>
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
                    </Row>

                    <Row title="Future holiday balance">
                        <label>Select a future date
                            <input className="employee-input" type="date" value={futureDate} onChange={set("futureDate")}
                                   min={new Date().toISOString().split("T")[0]} />
                        </label>
                        <button disabled={!futureDate}>Calculate</button>
                        <div className="future-balance">
                            <strong>Future balance</strong>
                            <div className="employee-muted">Your calculated balance will appear here.</div>
                        </div>
                    </Row>

                    <Row title="Unused holiday transfer">
                        <span className="employee-muted">Have unused holiday hours you may want to carry over?</span>
                        <button disabled>Request transfer</button>
                    </Row>
                </div>

                <div className="employee-card employee-row">
                    <Table
                        heads={["Holiday account", "Accrued holiday", "Used holiday", "Total holiday left", "Eligible date"]}
                        rows={accounts.map(a => [
                            a.name, `${a.accrued.hours} hours`, `${a.used.hours} hours`,
                            `${a.remaining.hours} hours`, a.eligibleDate || "—"
                        ])}
                        empty="No holiday accounts available."
                    />
                    <div>
                        <h3>Working schedule</h3>
                        <p className="employee-muted">Your current weekly working hours.</p>
                    </div>
                    <Table heads={weekdays} rows={[weekdays.map(workingHours)]} />
                </div>
            </div>

            <div className="employee-card calendar-card">
                <div className="calendar-heading">
                    <h3>Holiday calendar</h3>
                    <div>
                        <button onClick={() => goToMonth(-1)}>‹</button>
                        {month.toLocaleDateString("en", { month: "long", year: "numeric" })}
                        <button onClick={() => goToMonth(1)}>›</button>
                    </div>
                </div>
                <HolidayCalendar month={month} employees={employees} approved={approved} />
            </div>

            <div className="employee-card history-card">
                <h3>Request history</h3>
                <div className="calendar-scroll">
                    <Table
                        className="history-table"
                        heads={["Type", "Account", "Dates", "Status", "Submitted", "Decision"]}
                        rows={history.map(r => [
                            r.type ?? "Holiday", r.account, `${r.startDate} – ${r.endDate}`,
                            r.status, r.submittedDate, r.decisionDate || "—"
                        ])}
                        empty="No requests yet."
                    />
                </div>
            </div>
        </div>
    );
}

export default Employee;

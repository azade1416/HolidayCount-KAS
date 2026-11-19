
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentUser, getHolidayAccounts, getEmployeeRequestHistory,
    getApprovedHolidayRequests, getEmployees, createHolidayRequest,
    createCancellationRequest, logout, CALENDAR_WEEKDAYS
} from "../mockApi";
import type { PublicUser, MockHolidayAccount, MockRequest, WeeklySchedule } from "../mockApi";
import type { Employee as EmployeeType } from "../employee";

const cell = { padding: 8, borderBottom: "1px solid #eee", textAlign: "center" as const };
const card = { background: "white", padding: 14, borderRadius: 8 };
const button = { padding: "7px 12px", cursor: "pointer" };
const holidayColor = "#bde8c5";
const square = { width: 38, height: 38, border: "1px solid #ddd", boxSizing: "border-box" as const };

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
        const account = accounts.find(a => a.id === Number(accountId));
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
            await createCancellationRequest(user.id, user.name, Number(cancellationId));
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
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const dateKey = (day: number) =>
        `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const schedule = user?.weeklySchedule;

    function getWorkingHours(day: string) {
        const hours = schedule?.[day as keyof WeeklySchedule];
        return hours ? `${hours.from} – ${hours.to}` : "—";
    }

    return (
        <div style={{ padding: "20px 3%", background: "#f5f6f2", minHeight: "100vh" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginBottom: 20 }}>
                {user?.name}　Employee
                <button onClick={signOut}>Sign out</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div style={card}>
                    <h3>Book holiday</h3>
                    <label>Holiday account</label>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)}
                            style={{ display: "block", width: "100%", padding: 8, margin: "6px 0 12px" }}>
                        
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <label>From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                           style={{ display: "block", width: "100%", padding: 7, margin: "6px 0 10px" }} />

                    <label>To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                           style={{ display: "block", width: "100%", padding: 7, margin: "6px 0 12px" }} />

                    <button onClick={submitRequest} disabled={!accounts.length}>Submit holiday request</button>

                    <hr style={{ border: 0, borderTop: "4px solid black", margin: "20px 0" }} />
                    <h3>Request holiday cancellation</h3>
                    <label>Approved holiday</label>
                    <select value={cancellationId} onChange={e => setCancellationId(e.target.value)}
                            style={{ display: "block", width: "100%", padding: 8, margin: "6px 0 12px" }}>
                        <option value="">Select approved holiday</option>
                        {approvedHolidays.map(r =>
                            <option key={r.id} value={r.id}>{r.account}: {r.startDate} – {r.endDate}</option>
                        )}
                    </select>

                    <button onClick={submitCancellation} disabled={!approvedHolidays.length}>
                        Submit cancellation request
                    </button>
                    {error && <p style={{ color: "red" }}>{error}</p>}

                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "4px solid black" }}>
                        <strong>Unused holiday transfer</strong>
                        <p style={{ fontSize: 12, color: "#666" }}>Have unused holiday hours you may want to carry over?</p>
                        <button disabled style={{ ...button, opacity: 0.6 }}>Request transfer</button>
                    </div>
                </div>

                <div style={card}>
                    {accounts.map((a, i) => (
                        <Fragment key={a.id}>
                            {i > 0 && <hr style={{ border: 0, borderTop: "4px solid black", margin: "20px 0" }} />}
                            <h3>{a.name}</h3>
                            {(["accrued", "used", "remaining"] as const).map((key, index) => (
                                <div key={key} style={{ padding: "9px 0", borderBottom: "1px solid #eee" }}>
                                    {["Accrued holiday", "Used holiday", "Total holiday left"][index]}
                                    <div style={{ marginTop: 4 }}>{a[key].hours} hours</div>
                                </div>
                            ))}
                            <p>Eligible date of use: {a.eligibleDate || "—"}</p>
                        </Fragment>
                    ))}
                    {!accounts.length && <p>No holiday accounts available.</p>}
                </div>

                <div style={card}>
                    <h3>Future holiday balance</h3>
                    <p style={{ fontSize: 13 }}>Check how much holiday you will have on a future date.</p>
                    <label>Select a future date</label>
                    <input type="date" value={futureDate} onChange={e => setFutureDate(e.target.value)}
                           min={new Date().toISOString().split("T")[0]}
                           style={{ display: "block", width: "100%", padding: 8, margin: "6px 0 12px", boxSizing: "border-box" }} />
                    <button disabled={!futureDate} style={{ ...button, opacity: futureDate ? 1 : 0.6 }}>
                        Calculate
                    </button>

                    <div style={{ marginTop: 14, padding: 10, background: "#f5f6f2", borderRadius: 6 }}>
                        <strong>Future balance</strong>
                        <p style={{ fontSize: 12, color: "#666", marginBottom: 0 }}>
                            Your calculated balance will appear here.
                        </p>
                    </div>

                    <hr style={{ border: 0, borderTop: "4px solid black", margin: "20px 0" }} />
                    <h3>Working schedule</h3>
                    <p style={{ fontSize: 12, color: "#666" }}>Your current weekly working hours.</p>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                        <tr>
                            <th style={{ ...cell, textAlign: "left" }}>Day</th>
                            <th style={cell}>Working hours</th>
                        </tr>
                        </thead>
                        <tbody>
                        {CALENDAR_WEEKDAYS.map(day => (
                            <tr key={day}>
                                <td style={{ ...cell, textAlign: "left" }}>{day}</td>
                                <td style={cell}>{getWorkingHours(day)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ ...card, marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3>Holiday calendar</h3>
                    <div>
                        <button style={button} onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
                        {" "}{month.toLocaleDateString("en", { month: "long", year: "numeric" })}{" "}
                        <button style={button} onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${days}, 38px)`, width: "max-content" }}>
                        <div style={{ ...cell, position: "sticky", left: 0, background: "white", zIndex: 2 }}>Employee</div>
                        {Array.from({ length: days }, (_, i) => (
                            <div key={i} style={{ ...square, height: 48, fontSize: 11, display: "grid", placeContent: "center", textAlign: "center" }}>
                                {new Date(year, monthIndex, i + 1).toLocaleDateString("en", { weekday: "short" })}
                                <strong>{i + 1}</strong>
                            </div>
                        ))}
                        {employees.map(employee => (
                            <Fragment key={employee.id}>
                                <div style={{ ...cell, position: "sticky", left: 0, background: "white", zIndex: 1, textAlign: "left" }}>
                                    {employee.name}
                                </div>
                                {Array.from({ length: days }, (_, i) => {
                                    const date = dateKey(i + 1);
                                    const hasHoliday = approved.some(r =>
                                        r.employeeId === employee.id &&
                                        (r.type ?? "Holiday") === "Holiday" &&
                                        r.startDate <= date && r.endDate >= date
                                    );
                                    return <div key={date} title={`${employee.name} - ${date}`}
                                                style={{ ...square, background: hasHoliday ? holidayColor : "white" }} />;
                                })}
                            </Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ ...card, marginTop: 18 }}>
                <h3>Request history</h3>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                        <tr>{["Type", "Account", "Dates", "Status", "Submitted", "Decision"].map(x => <th key={x} style={{ ...cell, textAlign: "left" }}>{x}</th>)}</tr>
                        </thead>
                        <tbody>
                        {history.map(r => (
                            <tr key={r.id}>
                                {[r.type ?? "Holiday", r.account, `${r.startDate} – ${r.endDate}`,
                                    r.status, r.submittedDate, r.decisionDate || "—"].map((x, i) =>
                                    <td key={i} style={{ ...cell, textAlign: "left" }}>{x}</td>
                                )}
                            </tr>
                        ))}
                        {!history.length && <tr><td colSpan={6} style={cell}>No requests yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Employee;

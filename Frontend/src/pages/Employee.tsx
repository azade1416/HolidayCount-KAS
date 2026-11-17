
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentUser, getHolidayAccounts, getEmployeeRequestHistory,
    getApprovedHolidayRequests, getEmployees, createHolidayRequest, logout
} from "../mockApi";
import type { MockUser, MockHolidayAccount, MockRequest } from "../mockApi";
import type { Employee as EmployeeType } from "../employee";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const cell = { padding: 10, borderBottom: "1px solid #eee", textAlign: "center" as const };
const holidayColor = "#bde8c5";

function Employee() {
    const navigate = useNavigate();
    const [user, setUser] = useState<Omit<MockUser, "password"> | null>(null);
    const [accounts, setAccounts] = useState<MockHolidayAccount[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [approved, setApproved] = useState<MockRequest[]>([]);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [accountId, setAccountId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
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

    async function submitRequest() {
        const account = accounts.find(a => a.id === Number(accountId));
        if (!user || !account || !startDate || !endDate || endDate < startDate) {
            setError("Please select an account and valid dates.");
            return;
        }

        await createHolidayRequest({
            employeeId: user.id,
            employee: user.name,
            account: account.name,
            startDate,
            endDate
        });

        setStartDate("");
        setEndDate("");
        setError("");
        await loadData();
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

    const card = { background: "white", padding: 20, borderRadius: 8 };
    const button = { padding: "8px 14px", cursor: "pointer" };

    return (
        <div style={{ padding: "24px 4%", background: "#f5f6f2", minHeight: "100vh" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 28 }}>
                {user?.name}　Employee
                <button onClick={signOut}>Sign out</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
                <div style={card}>
                    <h3>Book holiday</h3>
                    <label>Holiday account</label>
                    <select
                        value={accountId}
                        onChange={e => setAccountId(e.target.value)}
                        style={{ display: "block", width: "100%", padding: 9, margin: "8px 0 16px" }}
                    >
                        <option value="">Select account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <label>From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                           style={{ display: "block", width: "100%", padding: 8, margin: "6px 0 12px" }} />
                    <label>To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                           style={{ display: "block", width: "100%", padding: 8, margin: "6px 0 12px" }} />
                    <button onClick={submitRequest} disabled={!accounts.length}>Submit request</button>
                    {error && <p style={{ color: "red" }}>{error}</p>}
                </div>

                {accounts.map(a => (
                    <div key={a.id} style={card}>
                        <h3>{a.name}</h3>
                        {(["accrued", "used", "remaining"] as const).map((key, i) => (
                            <div key={key} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}>
                                {["Accrued holiday", "Used holiday", "Total holiday left"][i]}
                                <div style={{ marginTop: 6 }}>{a[key].hours} hours</div>
                            </div>
                        ))}
                        <p>Eligible date of use: {a.eligibleDate || "—"}</p>
                    </div>
                ))}
            </div>

            <div style={{ ...card, marginTop: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3>Holiday calendar</h3>
                    <div>
                        <button style={button} onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
                        {" "}{month.toLocaleDateString("en", { month: "long", year: "numeric" })}{" "}
                        <button style={button} onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
                    </div>
                </div>

                <div style={{ overflowX: "auto", direction: "ltr" }}>
                    <div style={{ minWidth: 650 }}>
                        <div style={{
                            display: "grid",
                            direction: "ltr",
                            gridTemplateColumns: `140px repeat(${days}, 45px)`,
                            width: "max-content"
                        }}>
                            <div style={{ ...cell, position: "sticky", left: 0, background: "white", zIndex: 2 }}>
                                Employee
                            </div>
                            {Array.from({ length: days }, (_, i) => {
                                const day = i + 1;
                                const weekday = new Date(year, monthIndex, day).toLocaleDateString("en", { weekday: "short" });
                                return (
                                    <div key={day} style={{ ...cell, padding: "8px 2px" }}>
                                        <div style={{ fontSize: 11 }}>{weekday}</div>
                                        <div>{day}</div>
                                    </div>
                                );
                            })}
                            {employees.map(employee => (
                                <Fragment key={employee.id}>
                                    <div style={{
                                        ...cell, position: "sticky", left: 0, background: "white",
                                        zIndex: 1, textAlign: "left", fontWeight: 500
                                    }}>
                                        {employee.name}
                                    </div>
                                    {Array.from({ length: days }, (_, i) => {
                                        const date = dateKey(i + 1);
                                        const hasHoliday = approved.some(r =>
                                            r.employeeId === employee.id &&
                                            r.startDate <= date && r.endDate >= date
                                        );

                                        return (
                                            <div key={date} style={{
                                                ...cell, padding: 4, height: 42,
                                                background: hasHoliday ? holidayColor : "white"
                                            }} />
                                        );
                                    })}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ ...card, marginTop: 22 }}>
                <h3>Request history</h3>
                <div style={{ overflowX: "auto", direction: "ltr" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                        <tr>
                            {["Account", "Dates", "Status", "Submitted", "Decision"].map(x =>
                                <th key={x} style={{ ...cell, textAlign: "left" }}>{x}</th>
                            )}
                        </tr>
                        </thead>
                        <tbody>
                        {history.map(r => (
                            <tr key={r.id}>
                                {[r.account, `${r.startDate} – ${r.endDate}`, r.status,
                                    r.submittedDate, r.decisionDate || "—"].map((x, i) =>
                                    <td key={i} style={{ ...cell, textAlign: "left" }}>{x}</td>
                                )}
                            </tr>
                        ))}
                        {!history.length && <tr><td colSpan={5} style={cell}>No requests yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Employee;

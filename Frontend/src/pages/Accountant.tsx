
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getRequests, getRequestHistory, getUsers, getHolidayAccounts,
    getApprovedHolidayRequests, getEmployees,
    approveRequest, rejectRequest, logout
} from "../mockApi";
import type { AccountantRequest, MockRequest, MockUser, MockHolidayAccount } from "../mockApi";
import type { Employee as EmployeeType } from "../employee";

function Accountant() {
    const [requests, setRequests] = useState<AccountantRequest[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [users, setUsers] = useState<Omit<MockUser, "password">[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Omit<MockUser, "password"> | null>(null);
    const [accounts, setAccounts] = useState<MockHolidayAccount[]>([]);
    const [approved, setApproved] = useState<MockRequest[]>([]);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [refresh, setRefresh] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadData() {
            const [pending, completed, allUsers, holidays, staff] = await Promise.all([
                getRequests(), getRequestHistory(), getUsers(),
                getApprovedHolidayRequests(), getEmployees()
            ]);
            setRequests(pending);
            setHistory(completed);
            setUsers(allUsers);
            setApproved(holidays);
            setEmployees(staff);
        }
        void loadData();
    }, [refresh]);

    async function openEmployee(id: number) {
        const employee = users.find(u => u.id === id);
        if (!employee) return;
        setAccounts(await getHolidayAccounts(id));
        setSelectedEmployee(employee);
    }

    async function handleDecision(id: string, approve: boolean) {
        try {
            if (approve) await approveRequest(Number(id));
            else await rejectRequest(Number(id));
            setRefresh(prev => prev + 1);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not update request.");
        }
    }

    async function signOut() {
        await logout();
        navigate("/login");
    }

    const cell = { padding: 10, borderBottom: "1px solid #eee", textAlign: "left" as const };
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const dateKey = (day: number) =>
        `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const square = {
        width: 38, height: 38, border: "1px solid #ddd",
        boxSizing: "border-box" as const
    };

    return (
        <div className="dashboard">
            <div className="header">
                <p>Accountant</p>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowCalendar(true)}>View Employees Calendar</button>
                    <button onClick={signOut}>Sign out</button>
                </div>
            </div>

            <div className="section">
                <h2>Requests</h2>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Employee</th><th>Position</th><th>Dates</th>
                        <th>Type</th><th>Submitted</th><th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {requests.map(r => {
                        const employee = users.find(u => u.name === r.employee);
                        return (
                            <tr key={r.id}>
                                <td>
                                    <button onClick={() => employee && openEmployee(employee.id)}
                                            style={{ border: "none", background: "none", color: "#1674c4", cursor: "pointer", textDecoration: "underline" }}>
                                        {r.employee}
                                    </button>
                                </td>
                                <td>{employee?.employmentType || "—"}</td>
                                <td>{r.dates}</td>
                                <td>{r.type === "Cancellation" ? "Cancel holiday" : "Request holiday"}</td>
                                <td>{r.submittedDate}</td>
                                <td>
                                    <button onClick={() => handleDecision(r.id, true)}>Approve</button>
                                    <button onClick={() => handleDecision(r.id, false)}>Decline</button>
                                </td>
                            </tr>
                        );
                    })}
                    {!requests.length && <tr><td colSpan={6}>No pending requests.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="section">
                <h2>Completed History</h2>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Employee name</th><th>Position</th><th>Requested days</th>
                        <th>Type</th><th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {history.map(r => (
                        <tr key={r.id}>
                            <td>{r.employee}</td>
                            <td>{users.find(u => u.id === r.employeeId)?.employmentType || "—"}</td>
                            <td>{r.startDate} – {r.endDate}</td>
                            <td>{r.type === "Cancellation" ? "Cancel holiday" : "Request holiday"}</td>
                            <td>{r.status === "Rejected" ? "Declined" : r.status}</td>
                        </tr>
                    ))}
                    {!history.length && <tr><td colSpan={5}>No completed requests.</td></tr>}
                    </tbody>
                </table>
            </div>

            {showCalendar && (
                <div style={overlay}>
                    <div style={dialog}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>Employees Holiday Calendar</h2>
                            <button onClick={() => setShowCalendar(false)}>✕</button>
                        </div>

                        <div style={{ display: "flex", justifyContent: "center", gap: 15, alignItems: "center", marginBottom: 15 }}>
                            <button onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
                            <strong>{month.toLocaleDateString("en", { month: "long", year: "numeric" })}</strong>
                            <button onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
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
                                        <div style={{ ...cell, position: "sticky", left: 0, background: "white", zIndex: 1 }}>
                                            {employee.name}
                                        </div>
                                        {Array.from({ length: days }, (_, i) => {
                                            const date = dateKey(i + 1);
                                            const holiday = approved.some(r =>
                                                r.employeeId === employee.id &&
                                                (r.type ?? "Holiday") === "Holiday" &&
                                                r.startDate <= date && r.endDate >= date
                                            );
                                            return <div key={date} style={{ ...square, background: holiday ? "#bde8c5" : "white" }} />;
                                        })}
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: "right", marginTop: 20 }}>
                            <button onClick={() => setShowCalendar(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedEmployee && (
                <div style={overlay}>
                    <div style={{ ...dialog, maxWidth: 850 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2>{selectedEmployee.name}'s Holiday Balance Overview</h2>
                            <button onClick={() => setSelectedEmployee(null)}>✕</button>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                <tr>
                                    {["Holiday account", "Accrued holiday", "Used holiday", "Total holiday left", "Eligible date"].map(x =>
                                        <th key={x} style={cell}>{x}</th>
                                    )}
                                </tr>
                                </thead>
                                <tbody>
                                {accounts.map(a => (
                                    <tr key={a.id}>
                                        <td style={cell}>{a.name}</td>
                                        <td style={cell}>{a.accrued.hours} hours</td>
                                        <td style={cell}>{a.used.hours} hours</td>
                                        <td style={cell}>{a.remaining.hours} hours</td>
                                        <td style={cell}>{a.eligibleDate || "—"}</td>
                                    </tr>
                                ))}
                                {!accounts.length && <tr><td colSpan={5} style={cell}>No holiday accounts found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ textAlign: "right", marginTop: 20 }}>
                            <button onClick={() => setSelectedEmployee(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const overlay = {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000, padding: 20
};

const dialog = {
    background: "white", padding: 24, borderRadius: 8,
    width: "100%", maxWidth: 1100, maxHeight: "80vh",
    overflowY: "auto" as const
};

export default Accountant;

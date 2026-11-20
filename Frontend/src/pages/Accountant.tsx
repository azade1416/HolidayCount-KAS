
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getRequests, getRequestHistory, getUsers, getHolidayAccounts,
    getApprovedHolidayRequests, getEmployees,
    approveRequest, rejectRequest, logout
} from "../mockApi";
import type { AccountantRequest } from "../accountant";
import type { MockRequest, MockHolidayAccount } from "../employee";
import type { PublicUser } from "../admin";
import type { Employee as EmployeeType } from "../employee";

function Accountant() {
    const [requests, setRequests] = useState<AccountantRequest[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<PublicUser | null>(null);
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

    async function openEmployee(id: string) {
        const employee = users.find(u => u.id === id);
        if (!employee) return;
        setAccounts(await getHolidayAccounts(id));
        setSelectedEmployee(employee);
    }

    async function handleDecision(id: string, approve: boolean) {
        try {
            if (approve) await approveRequest(id);
            else await rejectRequest(id);
            setRefresh(prev => prev + 1);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not update request.");
        }
    }

    async function signOut() {
        await logout();
        navigate("/login");
    }

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const dateKey = (day: number) => {
        const monthText = String(monthIndex + 1).padStart(2, "0");
        const dayText = String(day).padStart(2, "0");
        return `${year}-${monthText}-${dayText}`;
    };

    return (
        <div className="dashboard">
            <div className="header">
                <p>Accountant</p>
                <div className="header-actions">
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
                                    <button className="employee-link"
                                            onClick={() => employee && openEmployee(employee.id)}>
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
                <div className="accountant-overlay">
                    <div className="accountant-dialog">
                        <div className="dialog-heading">
                            <h2>Employees Holiday Calendar</h2>
                            <button onClick={() => setShowCalendar(false)}>✕</button>
                        </div>

                        <div className="calendar-controls">
                            <button onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>‹</button>
                            <strong>{month.toLocaleDateString("en", { month: "long", year: "numeric" })}</strong>
                            <button onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>›</button>
                        </div>

                        <div className="calendar-scroll">
                            <div className="calendar-grid" style={{ gridTemplateColumns: `140px repeat(${days}, 38px)` }}>
                                <div className="calendar-name calendar-name-heading">Employee</div>
                                {Array.from({ length: days }, (_, i) => (
                                    <div key={i} className="calendar-day">
                                        {new Date(year, monthIndex, i + 1).toLocaleDateString("en", { weekday: "short" })}
                                        <strong>{i + 1}</strong>
                                    </div>
                                ))}

                                {employees.map(employee => (
                                    <Fragment key={employee.id}>
                                        <div className="calendar-name">
                                            {employee.name}
                                        </div>
                                        {Array.from({ length: days }, (_, i) => {
                                            const date = dateKey(i + 1);
                                            const holiday = approved.some(r =>
                                                r.employeeId === employee.id &&
                                                (r.type ?? "Holiday") === "Holiday" &&
                                                r.startDate <= date && r.endDate >= date
                                            );
                                            return <div key={date} className={holiday ? "calendar-square holiday" : "calendar-square"} />;
                                        })}
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedEmployee && (
                <div className="accountant-overlay">
                    <div className="accountant-dialog balance-dialog">
                        <div className="dialog-heading">
                            <h2>{selectedEmployee.name}'s Holiday Balance Overview</h2>
                            <button onClick={() => setSelectedEmployee(null)}>✕</button>
                        </div>
                        <div className="calendar-scroll">
                            <table className="accountant-table">
                                <thead>
                                <tr>
                                    {["Holiday account", "Accrued holiday", "Used holiday", "Total holiday left", "Eligible date"].map(x =>
                                        <th key={x} className="accountant-cell">{x}</th>
                                    )}
                                </tr>
                                </thead>
                                <tbody>
                                {accounts.map(a => (
                                    <tr key={a.id}>
                                        <td className="accountant-cell">{a.name}</td>
                                        <td className="accountant-cell">{a.accrued.hours} hours</td>
                                        <td className="accountant-cell">{a.used.hours} hours</td>
                                        <td className="accountant-cell">{a.remaining.hours} hours</td>
                                        <td className="accountant-cell">{a.eligibleDate || "—"}</td>
                                    </tr>
                                ))}
                                {!accounts.length && <tr><td colSpan={5} className="accountant-cell">No holiday accounts found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Accountant;

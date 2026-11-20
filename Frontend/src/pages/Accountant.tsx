
import { useEffect, useState } from "react";
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
import HolidayCalendar from "./HolidayCalendar";

const balanceColumns = [
    { title: "Holiday account", value: (account: MockHolidayAccount) => account.name },
    { title: "Accrued holiday", value: (account: MockHolidayAccount) => `${account.accrued.hours} hours` },
    { title: "Used holiday", value: (account: MockHolidayAccount) => `${account.used.hours} hours` },
    { title: "Total holiday left", value: (account: MockHolidayAccount) => `${account.remaining.hours} hours` },
    { title: "Eligible date", value: (account: MockHolidayAccount) => account.eligibleDate || "—" }
];

function EmptyTableRow({ columns, children }: { columns: number; children: string }) {
    return <tr><td colSpan={columns}>{children}</td></tr>;
}

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
                    {!requests.length && <EmptyTableRow columns={6}>No pending requests.</EmptyTableRow>}
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
                    {!history.length && <EmptyTableRow columns={5}>No completed requests.</EmptyTableRow>}
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

                        <HolidayCalendar month={month} employees={employees} approved={approved} />
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
                                    {balanceColumns.map(column => (
                                        <th key={column.title} className="accountant-cell">{column.title}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {accounts.map(a => (
                                    <tr key={a.id}>
                                        {balanceColumns.map(column => (
                                            <td key={column.title} className="accountant-cell">
                                                {column.value(a)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {!accounts.length && (
                                    <tr><td colSpan={5} className="accountant-cell">No holiday accounts found.</td></tr>
                                )}
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

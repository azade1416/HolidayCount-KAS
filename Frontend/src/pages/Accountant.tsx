import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    getRequests, getRequestHistory, getUsers, getHolidayAccounts,
    getApprovedHolidayRequests, getEmployees,
    approveRequest, rejectRequest, logout
} from "../holidayApi";
import type { AccountantRequest } from "../accountant";
import type { MockRequest, MockHolidayAccount, Employee } from "../employee";
import type { PublicUser } from "../admin";
import HolidayCalendar from "./HolidayCalendar";

const typeLabel = (type: string) => {
    if (type === "Transfer") return "Transfer holiday";
    return type === "Cancellation" ? "Cancel holiday" : "Request holiday";
};
const position = (u?: PublicUser) => u?.employmentType || "—";

function Table({ head, rows, empty, tableClass = "table", cellClass }: {
    head: string[]; rows: { key: string; cells: ReactNode[] }[];
    empty: string; tableClass?: string; cellClass?: string;
}) {
    return (
        <table className={tableClass}>
            <thead><tr>{head.map(h => <th key={h} className={cellClass}>{h}</th>)}</tr></thead>
            <tbody>
            {rows.map(r => (
                <tr key={r.key}>{r.cells.map((c, i) => <td key={i} className={cellClass}>{c}</td>)}</tr>
            ))}
            {!rows.length && <tr><td colSpan={head.length} className={cellClass}>{empty}</td></tr>}
            </tbody>
        </table>
    );
}

function Dialog({ title, onClose, className = "", children }: {
    title: string; onClose: () => void; className?: string; children: ReactNode;
}) {
    return (
        <div className="accountant-overlay">
            <div className={`accountant-dialog ${className}`}>
                <div className="dialog-heading"><h2>{title}</h2><button onClick={onClose}>✕</button></div>
                {children}
            </div>
        </div>
    );
}

function Accountant() {
    const [requests, setRequests] = useState<AccountantRequest[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [approved, setApproved] = useState<MockRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selected, setSelected] = useState<PublicUser | null>(null);
    const [accounts, setAccounts] = useState<MockHolidayAccount[]>([]);
    const [showCalendar, setShowCalendar] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [refresh, setRefresh] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([getRequests(), getRequestHistory(), getUsers(), getApprovedHolidayRequests(), getEmployees()])
            .then(([pending, completed, allUsers, holidays, staff]) => {
                setRequests(pending); setHistory(completed); setUsers(allUsers);
                setApproved(holidays); setEmployees(staff);
            });
    }, [refresh]);

    async function openEmployee(user: PublicUser) {
        setAccounts(await getHolidayAccounts(user.id));
        setSelected(user);
    }

    async function decide(id: string, approve: boolean) {
        try {
            await (approve ? approveRequest(id) : rejectRequest(id));
            setRefresh(n => n + 1);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not update request.");
        }
    }

    const shiftMonth = (d: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1));

    const requestRows = requests.map(r => {
        const user = users.find(u => u.name === r.employee);
        return {
            key: r.id,
            cells: [
                <button className="employee-link" onClick={() => user && openEmployee(user)}>{r.employee}</button>,
                position(user), r.dates, typeLabel(r.type), r.submittedDate,
                <>
                    <button onClick={() => decide(r.id, true)}>Approve</button>
                    <button onClick={() => decide(r.id, false)}>Decline</button>
                </>
            ]
        };
    });

    const historyRows = history.map(r => ({
        key: r.id,
        cells: [
            r.employee, position(users.find(u => u.id === r.employeeId)),
            `${r.startDate} – ${r.endDate}`, typeLabel(r.type),
            r.status === "Rejected" ? "Declined" : r.status
        ]
    }));

    const accountRows = accounts.map(a => ({
        key: a.id,
        cells: [a.name, `${a.accrued.hours} hours`, `${a.used.hours} hours`,
            `${a.remaining.hours} hours`, a.eligibleDate || "—"]
    }));

    return (
        <div className="dashboard">
            <div className="header">
                <p>Accountant</p>
                <div className="header-actions">
                    <button onClick={() => setShowCalendar(true)}>View Employees Calendar</button>
                    <button onClick={() => logout().then(() => navigate("/login"))}>Sign out</button>
                </div>
            </div>

            <div className="section">
                <h2>Requests</h2>
                <Table head={["Employee", "Position", "Dates", "Type", "Submitted", "Actions"]}
                       rows={requestRows} empty="No pending requests." />
            </div>

            <div className="section">
                <h2>Completed History</h2>
                <Table head={["Employee name", "Position", "Requested days", "Type", "Status"]}
                       rows={historyRows} empty="No completed requests." />
            </div>

            {showCalendar && (
                <Dialog title="Employees Holiday Calendar" onClose={() => setShowCalendar(false)}>
                    <div className="calendar-controls">
                        <button onClick={() => shiftMonth(-1)}>‹</button>
                        <strong>{month.toLocaleDateString("en", { month: "long", year: "numeric" })}</strong>
                        <button onClick={() => shiftMonth(1)}>›</button>
                    </div>
                    <HolidayCalendar month={month} employees={employees} approved={approved} />
                </Dialog>
            )}

            {selected && (
                <Dialog title={`${selected.name}'s Holiday Balance Overview`}
                        onClose={() => setSelected(null)} className="balance-dialog">
                    <div className="calendar-scroll">
                        <Table tableClass="accountant-table" cellClass="accountant-cell" rows={accountRows}
                               head={["Holiday account", "Accrued holiday", "Used holiday", "Total holiday left", "Eligible date"]}
                               empty="No holiday accounts found." />
                    </div>
                </Dialog>
            )}
        </div>
    );
}

export default Accountant;

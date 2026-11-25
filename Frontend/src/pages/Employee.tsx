import { useEffect, useRef, useState, type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentUser, getHolidayAccounts, getEmployeeRequestHistory,
    getApprovedHolidayRequests, getEmployees, createHolidayRequest,
    createCancellationRequest, getFutureBalance, createTransferRequest, logout, CALENDAR_WEEKDAYS,
    getAnnouncements, type FutureBalance
} from "../holidayApi";
import type { Announcement, PublicUser } from "../admin";
import type { MockHolidayAccount, MockRequest, WeeklySchedule, Employee as EmployeeType } from "../employee";
import HolidayCalendar from "./HolidayCalendar";

const weekdays = CALENDAR_WEEKDAYS.slice(0, 5); // Monday–Friday
const emptyForm = { accountId: "", startDate: "", endDate: "", cancellationId: "", futureDate: "", transferAccountId: "", transferHours: "" };

function Row({ title, onSubmit, children }: {
    title: string; onSubmit?: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode;
}) {
    return <div className="action-row">
        <h3>{title}</h3>
        <div className="action-fields">
            {onSubmit ? <form className="action-fields" onSubmit={onSubmit}>{children}</form> : children}
        </div>
    </div>;
}

function InputField({ label, ...props }: ComponentProps<"input"> & { label: string }) {
    return <label>{label}<input className="employee-input" {...props} /></label>;
}

function ChoiceField({ label, placeholder, children, ...props }: ComponentProps<"select"> & {
    label: string;
    placeholder: string;
}) {
    return <label>{label}
        <select className="employee-input" {...props}>
            <option value="">{placeholder}</option>
            {children}
        </select>
    </label>;
}

function Table({ heads, rows, empty, className = "" }: {
    heads: string[]; rows: ReactNode[][]; empty?: string; className?: string;
}) {
    return <table className={`employee-table ${className}`}>
            <thead><tr>{heads.map(h => <th key={h} className="employee-cell left">{h}</th>)}</tr></thead>
            <tbody>
            {rows.map((cells, i) => (
                <tr key={i}>{cells.map((c, j) => <td key={j} className="employee-cell left">{c}</td>)}</tr>
            ))}
            {!rows.length && empty && <tr><td colSpan={heads.length} className="employee-cell">{empty}</td></tr>}
            </tbody>
    </table>;
}

function Employee() {
    const navigate = useNavigate();
    const [user, setUser] = useState<PublicUser | null>(null);
    const [accounts, setAccounts] = useState<MockHolidayAccount[]>([]);
    const [approved, setApproved] = useState<MockRequest[]>([]);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>();
    const [announcementsError, setAnnouncementsError] = useState(false);
    const announcementsDialog = useRef<HTMLDialogElement>(null);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [month, setMonth] = useState(new Date());
    const [bookingError, setBookingError] = useState("");
    const [cancellationError, setCancellationError] = useState("");
    const { accountId, startDate, endDate, cancellationId, futureDate, transferAccountId, transferHours } = form;
    const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    async function loadData() {
        const current = await getCurrentUser();
        if (!current) return navigate("/");
        setUser(current);
        const [accounts, history, approved, employees] = await Promise.all([
            getHolidayAccounts(current.id),
            getEmployeeRequestHistory(),
            getApprovedHolidayRequests(),
            getEmployees()
        ]);
        setAccounts(accounts);
        setApproved(approved);
        setEmployees(employees);
        setForm(f => ({ ...f, accountId: accounts.some(a => a.id === f.accountId) ? f.accountId : accounts[0]?.id ?? "" }));
        setHistory(history);
    }

    useEffect(() => {
        void loadData();
        void getAnnouncements().then(setAnnouncements).catch(() => setAnnouncementsError(true));
    }, []);

    const approvedHolidays = approved.filter(r =>
        r.employeeId === user?.id && (r.type ?? "Holiday") === "Holiday"
    );

    const [future, setFuture] = useState<{ loading?: boolean; balances?: FutureBalance[]; error?: string }>({});
    const [writtenAgreement, setWrittenAgreement] = useState(false);
    const [transfer, setTransfer] = useState<{ loading?: boolean; submitted?: boolean; error?: string }>({});

    const canTransfer = accounts.some(a => a.id === transferAccountId) && writtenAgreement && !transfer.loading;

    async function calculateFutureBalance(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFuture({ loading: true });
        try {
            setFuture({ balances: await getFutureBalance(futureDate) });
        } catch (error) {
            setFuture({ error: error instanceof Error ? error.message : "Could not calculate the future balance." });
        }
    }

    async function submitTransfer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canTransfer) return;
        setTransfer({ loading: true });
        try {
            const request = await createTransferRequest(transferAccountId, Number(transferHours), writtenAgreement);
            setHistory(previous => [request, ...previous]);
            setForm(previous => ({ ...previous, transferHours: "" }));
            setWrittenAgreement(false);
            setTransfer({ submitted: true });
        } catch (error) {
            setTransfer({ error: error instanceof Error ? error.message : "Could not submit the transfer request." });
        }
    }

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
        if (!user || !account || !startDate || !endDate || endDate < startDate)
            return setBookingError("Please select an account and valid dates.");
        return submit(
            () => createHolidayRequest(account.id, startDate, endDate),
            setBookingError, { startDate: "", endDate: "" }, "Could not submit holiday request."
        );
    }

    function submitCancellation() {
        if (!user || !cancellationId) return setCancellationError("Please select an approved holiday to cancel.");
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
                <button onClick={() => announcementsDialog.current?.showModal()}>
                    View announcement
                </button>
                <button onClick={async () => { await logout(); navigate("/"); }}>Sign out</button>
            </div>

            <div className="employee-cards">
                <div className="employee-card">
                    <Row title="Book holiday">
                        <ChoiceField label="Holiday account" placeholder="Select holiday account"
                                     value={accountId} onChange={set("accountId")}>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </ChoiceField>
                        <InputField label="From" type="date" value={startDate} onChange={set("startDate")} />
                        <InputField label="To" type="date" value={endDate} onChange={set("endDate")} />
                        <button onClick={submitRequest} disabled={!accounts.length}>Submit holiday request</button>
                        {bookingError && <span className="employee-error">{bookingError}</span>}
                    </Row>

                    <Row title="Request holiday cancellation">
                        <ChoiceField label="Approved holiday" placeholder="Select approved holiday"
                                     value={cancellationId} onChange={set("cancellationId")}>
                            {approvedHolidays.map(r =>
                                <option key={r.id} value={r.id}>{r.account}: {r.startDate} - {r.endDate}</option>
                            )}
                        </ChoiceField>
                        <button onClick={submitCancellation} disabled={!approvedHolidays.length}>
                            Submit cancellation request
                        </button>
                        {cancellationError && <span className="employee-error">{cancellationError}</span>}
                    </Row>

                    <Row title="Future holiday balance" onSubmit={calculateFutureBalance}>
                        <InputField label="Select a future date" type="date" value={futureDate} required disabled={future.loading}
                                   onChange={event => {
                                       set("futureDate")(event);
                                       setFuture({});
                                   }}
                                   min={new Date().toISOString().split("T")[0]} />
                        <div className="future-balance">
                            <button disabled={!futureDate || future.loading} aria-busy={future.loading}>Calculate</button>
                            {future.error && <span className="employee-error" role="alert">{future.error}</span>}
                            {future.balances && <span className="employee-muted" role="status">
                                {future.balances.map(balance => {
                                    const date = accounts.find(account => account.id === balance.id)?.eligibleDate;
                                    return `${balance.name}${date ? ` (${date})` : ""}: ${balance.remainingHours.toFixed(2)} hours left`;
                                }).join(" · ") || "No holiday accounts available."}
                            </span>}
                        </div>
                    </Row>

                    <Row title="Unused holiday transfer" onSubmit={submitTransfer}>
                        <ChoiceField label="Holiday account" placeholder="Select holiday account" value={transferAccountId}
                                     required disabled={transfer.loading} onChange={set("transferAccountId")}>
                            {accounts.map(a => <option key={a.id} value={a.id}>
                                {a.name} ({a.eligibleDate}, {a.remaining.hours.toFixed(2)} hours left)
                            </option>)}
                        </ChoiceField>
                        <InputField label="Hours to transfer" type="number" value={transferHours}
                                    required disabled={transfer.loading} step="any" onChange={set("transferHours")} />
                        <label>
                            <input type="checkbox" checked={writtenAgreement} required disabled={transfer.loading}
                                   onChange={event => setWrittenAgreement(event.target.checked)} />
                            I have a written agreement for this transfer.
                        </label>
                        <div className="future-balance">
                            <button disabled={!canTransfer || !transferHours}
                                    aria-busy={transfer.loading}>Request transfer</button>
                            {transfer.submitted && <span className="employee-muted" role="status">Transfer request submitted for approval.</span>}
                        </div>
                        {transfer.error && <span className="employee-error" role="alert">{transfer.error}</span>}
                    </Row>
                </div>

                <div className="employee-card employee-row">
                    <div className="employee-table-slot">
                        <Table
                            heads={["Holiday account", "Accrued holiday", "Used holiday", "Total holiday left", "Eligible date"]}
                            rows={accounts.map(a => [
                                a.name, `${a.accrued.hours} hours`, `${a.used.hours} hours`,
                                `${a.remaining.hours} hours`, a.eligibleDate || "-"
                            ])}
                            empty="No holiday accounts available."
                        />
                    </div>
                    <div>
                        <h3>Working schedule</h3>
                        <p className="employee-muted">Your current weekly working hours.</p>
                    </div>
                    <div className="employee-table-slot">
                        <Table heads={weekdays} rows={[weekdays.map(workingHours)]} />
                    </div>
                </div>
            </div>

            <dialog ref={announcementsDialog} className="employee-announcements-dialog" aria-labelledby="announcements-title">
                <h3 id="announcements-title">Announcements</h3>
                {announcementsError && <p role="alert">Could not load announcements.</p>}
                {announcements?.length === 0 && <p>No announcements yet.</p>}
                {!!announcements?.length && (
                    <div className="employee-announcements" tabIndex={0} role="region" aria-label="Announcements">
                        {announcements.map(a => <p key={a.id}>{a.date} · {a.message}</p>)}
                    </div>
                )}
                <button onClick={() => announcementsDialog.current?.close()}>Close</button>
            </dialog>

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

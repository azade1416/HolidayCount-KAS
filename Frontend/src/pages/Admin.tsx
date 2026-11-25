import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    getUsers, getCurrentUser, deleteUser, logout,
    sendAnnouncement, getAnnouncements, getScheduleHistory, WORKDAYS,
    getPublicHolidays, savePublicHoliday, deletePublicHoliday, type PublicHoliday
} from "../holidayApi";
import type { PublicUser, Announcement } from "../admin";
import type { ScheduleChange, WeeklySchedule } from "../employee";
import CreateEmployee from "./CreateEmployee";
import Presets from "./Presets";

const formatSchedule = (s?: WeeklySchedule) =>
    s ? WORKDAYS.map(d => `${d}: ${s[d].from}–${s[d].to}`).join("\n") : "Not set";

const headers = ["Name", "Email", "Role", "Actions", "Working Schedule", "Working Schedule History"];
const emptyHoliday = { id: "", name: "", date: "", isCompanySpecific: false };

export default function Admin() {
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [message, setMessage] = useState("");
    const [editing, setEditing] = useState<PublicUser | "new">();
    const [history, setHistory] = useState<{ user: PublicUser; changes: ScheduleChange[] }>();
    const [showPresets, setShowPresets] = useState(false);
    const announcementsDialog = useRef<HTMLDialogElement>(null);
    const publicHolidaysDialog = useRef<HTMLDialogElement>(null);
    const [holidays, setHolidays] = useState<PublicHoliday[]>();
    const [holiday, setHoliday] = useState(emptyHoliday);
    const [holidayBusy, setHolidayBusy] = useState(false);
    const [holidayError, setHolidayError] = useState("");
    const navigate = useNavigate();

    const load = async () => {
        const [users, me, announcements] = await Promise.all([getUsers(), getCurrentUser(), getAnnouncements()]);
        setUsers(users);
        setCurrentUserId(me?.id);
        setAnnouncements(announcements);
    };

    useEffect(() => {
        void load();
        void getPublicHolidays().then(setHolidays).catch(() => setHolidayError("Could not load public holidays."));
    }, []);

    async function changeHolidays(change: () => Promise<void>) {
        setHolidayBusy(true);
        setHolidayError("");
        try {
            await change();
        } catch (error) {
            setHolidayError(error instanceof Error ? error.message : "Could not update public holidays.");
        } finally {
            setHolidayBusy(false);
        }
    }

    function submitHoliday(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = holiday.name.trim();
        if (!name || holidayBusy) return;
        return changeHolidays(async () => {
            const saved = await savePublicHoliday({ ...holiday, name });
            setHolidays(list => [...(list ?? []).filter(item => item.id !== saved.id), saved]
                .sort((a, b) => a.date.localeCompare(b.date)));
            setHoliday(emptyHoliday);
        });
    }

    function removeHoliday(id: string) {
        if (!window.confirm("Delete this public holiday?")) return;
        return changeHolidays(async () => {
            await deletePublicHoliday(id);
            setHolidays(list => list?.filter(item => item.id !== id));
            setHoliday(current => current.id === id ? emptyHoliday : current);
        });
    }

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        try {
            await action();
            await load();
        } catch (error) {
            alert(error instanceof Error ? error.message : fallback);
        }
    };

    const handleDelete = (id: string) =>
        window.confirm("Are you sure you want to delete this account?") &&
        run(() => deleteUser(id), "Could not delete account.");

    const handleSend = () =>
        message.trim() &&
        run(async () => { await sendAnnouncement(message); setMessage(""); }, "Could not send message.");

    const openHistory = async (user: PublicUser) =>
        setHistory({ user, changes: await getScheduleHistory(user.id) });

    return (
        <div className="dashboard admin-dashboard">
            <div className="header">
                <h1>Admin</h1>
                <div>
                    <button className="admin-button" onClick={() => setEditing("new")}>Create Employee Account</button>
                    <button className="admin-button" onClick={() => setShowPresets(true)}>Holiday presets</button>
                    <button className="admin-button" onClick={() => publicHolidaysDialog.current?.showModal()}>Public holidays</button>
                    <button className="admin-button" onClick={() => announcementsDialog.current?.showModal()}>Announcements</button>
                    <button className="admin-button" onClick={async () => { await logout(); navigate("/login"); }}>Sign out</button>
                </div>
            </div>

            <div className="section">
                <h2>User Management</h2>
                <table className="table">
                    <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                                    <span className={`badge ${user.role === "Admin" ? "admin" : "user"}`}>
                                        {user.employmentType || user.role}
                                    </span>
                            </td>
                            <td>
                                <button className="edit" onClick={() => setEditing(user)}>Edit</button>
                                {user.id === currentUserId
                                    ? <span className="current">Current User</span>
                                    : <button className="delete" onClick={() => handleDelete(user.id)}>Delete</button>}
                            </td>
                            <td><pre className="schedule-text">{formatSchedule(user.weeklySchedule)}</pre></td>
                            <td>
                                {user.weeklySchedule
                                    ? <button className="admin-button" onClick={() => openHistory(user)}>Working Schedule History</button>
                                    : "N/A"}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <dialog ref={announcementsDialog} className="admin-settings-dialog" aria-labelledby="admin-announcements-title">
                <h2 id="admin-announcements-title">Announcements</h2>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Write a message to all employees..."
                    rows={4}
                    className="announcement-input"
                />
                <button className="admin-button" onClick={handleSend} disabled={!message.trim()}>
                    Send Announcement
                </button>
                {announcements.map(a => (
                    <div key={a.id} className="announcement-item">
                        <p>{a.message}</p>
                        <small>{a.date}</small>
                    </div>
                ))}
                <button type="button" className="admin-button" onClick={() => announcementsDialog.current?.close()}>Close</button>
            </dialog>
            <dialog ref={publicHolidaysDialog} className="admin-settings-dialog public-holidays-dialog"
                    aria-labelledby="admin-public-holidays-title">
                <div className="dialog-heading">
                    <h2 id="admin-public-holidays-title">Public holidays</h2>
                    <button type="button" onClick={() => publicHolidaysDialog.current?.close()}>Close</button>
                </div>
                <form className="public-holiday-form" onSubmit={submitHoliday}>
                    <label>Name <input required value={holiday.name} disabled={holidayBusy}
                                       onChange={e => setHoliday({ ...holiday, name: e.target.value })} /></label>{" "}
                    <label>Date <input type="date" required value={holiday.date} disabled={holidayBusy}
                                       onChange={e => setHoliday({ ...holiday, date: e.target.value })} /></label>{" "}
                    <label><input type="checkbox" checked={holiday.isCompanySpecific} disabled={holidayBusy}
                                  onChange={e => setHoliday({ ...holiday, isCompanySpecific: e.target.checked })} />
                        Company-specific
                    </label>{" "}
                    <button className="admin-button" disabled={!holidays || holidayBusy}>{holiday.id ? "Save changes" : "Add holiday"}</button>
                    {holiday.id && <button type="button" disabled={holidayBusy} onClick={() => setHoliday(emptyHoliday)}>Cancel</button>}
                </form>
                {holidayError && <p role="alert">{holidayError}</p>}
                {holidays?.length === 0 && <p>No public holidays registered.</p>}
                {holidays?.map(item => (
                    <div className="dialog-heading public-holiday-row" key={item.id}>
                        <div>
                        {item.date} · {item.name}{item.isCompanySpecific && " (Company-specific)"}{" "}
                        </div>
                        <div>
                            <button className="edit" disabled={holidayBusy} onClick={() => setHoliday(item)}>Edit</button>
                            <button className="delete" disabled={holidayBusy} onClick={() => removeHoliday(item.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </dialog>

            {showPresets && <Presets onClose={() => setShowPresets(false)} />}

            {editing && (
                <CreateEmployee
                    user={editing === "new" ? undefined : editing}
                    onClose={() => setEditing(undefined)}
                    onCreated={load}
                />
            )}

            {history && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>{history.user.name} – Working Schedule History</h3>
                        <table className="table">
                            <thead><tr><th>Working Schedule (Time)</th><th>Working Schedule (Date)</th></tr></thead>
                            <tbody>
                            {[...history.changes].reverse().map(c => (
                                <tr key={c.id}>
                                    <td><pre className="schedule-text">{formatSchedule(c.newSchedule)}</pre></td>
                                    <td>{c.date}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {!history.changes.length && <p>No working schedule history available.</p>}
                        <div className="modal-buttons">
                            <button className="admin-button" onClick={() => setHistory(undefined)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

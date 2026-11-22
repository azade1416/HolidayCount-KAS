import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getUsers, getCurrentUser, deleteUser, logout,
    sendAnnouncement, getAnnouncements, getScheduleHistory, WORKDAYS
} from "../api";
import type { PublicUser, Announcement } from "../admin";
import type { ScheduleChange, WeeklySchedule } from "../employee";
import CreateEmployee from "./CreateEmployee";

const formatSchedule = (s?: WeeklySchedule) =>
    s ? WORKDAYS.map(d => `${d}: ${s[d].from}–${s[d].to}`).join("\n") : "Not set";

const headers = ["Name", "Email", "Role", "Actions", "Working Schedule", "Working Schedule History"];

function Admin() {
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [message, setMessage] = useState("");
    const [editing, setEditing] = useState<PublicUser | "new">();
    const [history, setHistory] = useState<{ user: PublicUser; changes: ScheduleChange[] }>();
    const navigate = useNavigate();

    const load = async () => {
        const [u, me, a] = await Promise.all([getUsers(), getCurrentUser(), getAnnouncements()]);
        setUsers(u);
        setCurrentUserId(me?.id);
        setAnnouncements(a);
    };

    useEffect(() => { void load(); }, []);

    // Runs an action, reloads the data, and alerts on failure
    const run = async (action: () => Promise<unknown>, fallback: string) => {
        try {
            await action();
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : fallback);
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
        <div className="dashboard">
            <div className="header">
                <h1>Admin</h1>
                <div>
                    <button className="admin-button" onClick={() => setEditing("new")}>Create Employee Account</button>
                    <button className="admin-button" onClick={async () => { await logout(); navigate("/login"); }}>Sign out</button>
                </div>
            </div>

            <div className="section">
                <h2>User Management</h2>
                <table className="table">
                    <thead>
                    <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
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

            <div className="section">
                <h2>Announcements</h2>
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
            </div>

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
                            <thead>
                            <tr><th>Working Schedule (Time)</th><th>Working Schedule (Date)</th></tr>
                            </thead>
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

export default Admin;

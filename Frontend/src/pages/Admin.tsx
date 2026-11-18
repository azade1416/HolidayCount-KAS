
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getUsers, getCurrentUser, deleteUser,
    sendAnnouncement, getAnnouncements, getScheduleHistory,
    type MockUser, type Announcement, type ScheduleChange, type WeeklySchedule
} from "../mockApi";
import CreateEmployee from "./CreateEmployee";

type AdminUser = Omit<MockUser, "password">;

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

function formatSchedule(schedule?: WeeklySchedule) {
    if (!schedule) return "Not set";

    return days.map(day =>
        `${day}: ${schedule[day].from}–${schedule[day].to}`
    ).join("\n");
}

function Admin() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | undefined>();
    const [historyUser, setHistoryUser] = useState<AdminUser | undefined>();
    const [history, setHistory] = useState<ScheduleChange[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [message, setMessage] = useState("");
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    const navigate = useNavigate();

    useEffect(() => {
        const loadUsers = async () => {
            const userList = await getUsers();
            const currentUser = await getCurrentUser();

            setUsers(userList);
            setCurrentUserId(currentUser?.id ?? null);
        };

        loadUsers();
    }, [refresh]);

    useEffect(() => {
        getAnnouncements().then(setAnnouncements);
    }, [refresh]);

    const closeModal = () => {
        setShowModal(false);
        setSelectedUser(undefined);
    };

    const openHistory = async (user: AdminUser) => {
        setHistoryUser(user);
        setHistory(await getScheduleHistory(user.id));
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this account?")) return;

        try {
            await deleteUser(id);
            setRefresh(prev => prev + 1);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not delete account.");
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        try {
            await sendAnnouncement(message);
            setMessage("");
            setAnnouncements(await getAnnouncements());
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not send message.");
        }
    };

    return (
        <div className="dashboard">
            <div className="header">
                <h1>Admin Dashboard</h1>
                <div>
                    <button onClick={() => setShowModal(true)}>
                        Create Employee Account
                    </button>
                    <button onClick={() => navigate("/login")}>Sign out</button>
                </div>
            </div>

            <div className="section">
                <h2>Announcements</h2>

                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Write a message to all employees..."
                    rows={4}
                    style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
                />

                <button onClick={handleSend} disabled={!message.trim()}>
                    Send
                </button>

                {announcements.map(a => (
                    <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid #ddd" }}>
                        <p>{a.message}</p>
                        <small>{a.date}</small>
                    </div>
                ))}
            </div>

            <div className="section">
                <h2>User Management</h2>

                <table className="table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                        <th>Working Schedule</th>
                        <th>Working Schedule History</th>
                    </tr>
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
                                <button
                                    className="edit"
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setShowModal(true);
                                    }}
                                >
                                    Edit
                                </button>

                                {user.id === currentUserId ? (
                                    <span className="current">Current User</span>
                                ) : (
                                    <button
                                        className="delete"
                                        onClick={() => handleDelete(user.id)}
                                    >
                                        Delete
                                    </button>
                                )}
                            </td>
                            <td>
                                    <pre style={{ margin: 0, fontFamily: "inherit" }}>
                                        {formatSchedule(user.weeklySchedule)}
                                    </pre>
                            </td>
                            <td>
                                {user.weeklySchedule ? (
                                    <button onClick={() => openHistory(user)}>
                                        Working Schedule History
                                    </button>
                                ) : "N/A"}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <CreateEmployee
                    user={selectedUser}
                    onClose={closeModal}
                    onCreated={() => setRefresh(prev => prev + 1)}
                />
            )}

            {historyUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>{historyUser.name} – Working Schedule History</h3>

                        <table className="table">
                            <thead>
                            <tr>
                                <th>Working Schedule (Time)</th>
                                <th>Working Schedule (Date)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {[...history].reverse().map(change => (
                                <tr key={change.id}>
                                    <td>
                                            <pre style={{ margin: 0, fontFamily: "inherit" }}>
                                                {formatSchedule(change.schedule)}
                                            </pre>
                                    </td>
                                    <td>{change.date}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {!history.length && <p>No working schedule history available.</p>}

                        <div className="modal-buttons">
                            <button onClick={() => setHistoryUser(undefined)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;

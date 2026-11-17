
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, getCurrentUser, deleteUser, type MockUser } from "../mockApi";
import CreateEmployee from "./CreateEmployee";

type AdminUser = Omit<MockUser, "password">;

function Admin() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | undefined>();
    const [showModal, setShowModal] = useState(false);
    const [refresh, setRefresh] = useState(0);

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

    const closeModal = () => {
        setShowModal(false);
        setSelectedUser(undefined);
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

    return (
        <div className="dashboard">
            <div className="header">
                <h1>Admin Dashboard</h1>
                <button onClick={() => navigate("/login")}>Sign out</button>
            </div>

            <button onClick={() => setShowModal(true)}>
                Create Employee Account
            </button>

            <div className="section">
                <h2>User Management</h2>

                <table className="table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
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
        </div>
    );
}

export default Admin;

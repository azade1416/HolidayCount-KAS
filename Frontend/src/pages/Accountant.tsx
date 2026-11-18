import { useEffect, useState } from "react";
import CreateEmployee from "./CreateEmployee";
import { useNavigate } from "react-router-dom";
import {
    getRequests, getRequestHistory, approveRequest, rejectRequest, logout
} from "../mockApi";
import type { AccountantRequest, MockRequest } from "../mockApi";

function Accountant() {
    const [showModal, setShowModal] = useState(false);
    const [requests, setRequests] = useState<AccountantRequest[]>([]);
    const [history, setHistory] = useState<MockRequest[]>([]);
    const [refresh, setRefresh] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadData() {
            const [pending, completed] = await Promise.all([
                getRequests(),
                getRequestHistory()
            ]);
            setRequests(pending);
            setHistory(completed);
        }

        void loadData();
    }, [refresh]);

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

    return (
        <div className="dashboard">
            <div className="header">
                <p>Accountant</p>
                <button onClick={signOut}>Sign out</button>
                <button onClick={() => setShowModal(true)}>Create Employee Account</button>
                <button>Final Settlement</button>
            </div>

            {showModal && (
                <CreateEmployee
                    onClose={() => setShowModal(false)}
                    onCreated={() => setRefresh(prev => prev + 1)}
                />
            )}

            <div className="section">
                <h2>Requests</h2>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Type</th>
                        <th>Employee</th>
                        <th>Dates</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {requests.map(r => (
                        <tr key={r.id}>
                            <td>{r.type}</td>
                            <td>{r.employee}</td>
                            <td>{r.dates}</td>
                            <td>{r.status}</td>
                            <td>{r.submittedDate}</td>
                            <td>
                                <button onClick={() => handleDecision(r.id, true)}>Approve</button>
                                <button onClick={() => handleDecision(r.id, false)}>Reject</button>
                            </td>
                        </tr>
                    ))}
                    {!requests.length && (
                        <tr><td colSpan={6}>No pending requests.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>

            <div className="section">
                <h2>Completed History</h2>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Type</th>
                        <th>Employee</th>
                        <th>Dates</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Decision</th>
                    </tr>
                    </thead>
                    <tbody>
                    {history.map(r => (
                        <tr key={r.id}>
                            <td>{r.type ?? "Holiday"}</td>
                            <td>{r.employee}</td>
                            <td>{r.startDate} – {r.endDate}</td>
                            <td>{r.status}</td>
                            <td>{r.submittedDate}</td>
                            <td>{r.decisionDate || "—"}</td>
                        </tr>
                    ))}
                    {!history.length && (
                        <tr><td colSpan={6}>No completed requests.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Accountant;

import { useState } from "react";
import { createEmployee, type WeeklySchedule } from "../mockApi";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const defaultSchedule = Object.fromEntries(
    days.map(day => [day, { from: "08:00", to: "16:00" }])
) as WeeklySchedule;

function CreateEmployee({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [role, setRole] = useState("Full-time");
    const [schedule, setSchedule] = useState(defaultSchedule);
    const isEmployee = ["Full-time", "Part-time"].includes(role);

    const update = (day: keyof WeeklySchedule, field: "from" | "to", value: string) =>
        setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const valid = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

        if (isEmployee && days.some(d => !valid(schedule[d].from) || !valid(schedule[d].to) || schedule[d].from >= schedule[d].to))
            return alert("Enter valid working hours (HH:MM).");

        const data = new FormData(e.currentTarget);
        try {
            await createEmployee({
                name: String(data.get("name")),
                email: String(data.get("email")),
                password: String(data.get("password")),
                employmentType: role,
                weeklySchedule: isEmployee ? schedule : undefined
            });
            onCreated();
            onClose();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Account creation failed.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Create employee account</h3>
                <form onSubmit={submit}>
                    <label>Full name</label><input name="name" required />
                    <label>Email</label><input name="email" type="email" required />
                    <label>Password</label><input name="password" type="password" required />
                    <label>Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)}>
                        {["Full-time", "Part-time", "Admin", "Accountant"].map(r => <option key={r}>{r}</option>)}
                    </select>

                    {isEmployee && <div className="weekly-schedule">
                        <h4>Weekly Working Schedule</h4>
                        <div className="schedule-header"><span>Day</span><span>From</span><span>To</span></div>
                        {days.map(day => <div className="schedule-row" key={day}>
                            <strong>{day}</strong>
                            {(["from", "to"] as const).map(field => (
                                <input key={field} value={schedule[day][field]}
                                       placeholder={field === "from" ? "08:00" : "16:00"}
                                       onChange={e => update(day, field, e.target.value)} required />
                            ))}
                        </div>)}
                    </div>}

                    <div className="modal-buttons">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Create account</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateEmployee;

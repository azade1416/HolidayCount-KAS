
import { useState } from "react";
import {
    createEmployee, updateUser,
    type WeeklySchedule, type MockUser
} from "../mockApi";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const defaultSchedule = Object.fromEntries(
    days.map(day => [day, { from: "08:00", to: "16:00" }])
) as WeeklySchedule;

type Props = {
    user?: Omit<MockUser, "password">;
    onClose: () => void;
    onCreated: () => void;
};

function CreateEmployee({ user, onClose, onCreated }: Props) {
    const [role, setRole] = useState(
        user?.employmentType || (user?.role === "Employee" ? "Full-time employee" : user?.role || "Full-time employee")
    );
    const [schedule, setSchedule] = useState(
        user?.weeklySchedule || defaultSchedule
    );

    const isEmployee = ["Full-time employee", "Part-time employee"].includes(role);

    const update = (day: keyof WeeklySchedule, field: "from" | "to", value: string) =>
        setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const data = new FormData(e.currentTarget);
        const valid = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

        if (isEmployee && days.some(day =>
            !valid(schedule[day].from) ||
            !valid(schedule[day].to) ||
            schedule[day].from >= schedule[day].to
        )) {
            alert("Enter valid working hours (HH:MM).");
            return;
        }

        try {
            const name = String(data.get("name"));
            const email = String(data.get("email"));
            const password = String(data.get("password"));

            if (user) {
                await updateUser(user.id, {
                    name,
                    email,
                    ...(password ? { password } : {}),
                    employmentType: role,
                    weeklySchedule: isEmployee ? schedule : undefined
                });
            } else {
                if (!password) {
                    alert("Please enter a password.");
                    return;
                }

                await createEmployee({
                    name,
                    email,
                    password,
                    employmentType: role,
                    weeklySchedule: isEmployee ? schedule : undefined
                });
            }

            onCreated();
            onClose();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Could not save account.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>{user ? "Edit employee account" : "Create employee account"}</h3>

                <form onSubmit={submit}>
                    <label>Full name</label>
                    <input name="name" defaultValue={user?.name || ""} required />

                    <label>Email</label>
                    <input name="email" type="email" defaultValue={user?.email || ""} required />

                    <label>Password</label>
                    <input
                        name="password"
                        type="password"
                        required={!user}
                        placeholder={user ? "Leave empty to keep current password" : ""}
                    />

                    <label>Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)}>
                        {["Full-time employee", "Part-time employee"].map(r =>
                            <option key={r}>{r}</option>
                        )}
                    </select>

                    {isEmployee && (
                        <div className="weekly-schedule">
                            <h4>Weekly Working Schedule</h4>

                            <div className="schedule-header">
                                <span>Day</span>
                                <span>From</span>
                                <span>To</span>
                            </div>

                            {days.map(day => (
                                <div className="schedule-row" key={day}>
                                    <strong>{day}</strong>

                                    {(["from", "to"] as const).map(field => (
                                        <input
                                            key={field}
                                            value={schedule[day][field]}
                                            placeholder={field === "from" ? "08:00" : "16:00"}
                                            onChange={e => update(day, field, e.target.value)}
                                            required
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="modal-buttons">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">{user ? "Save changes" : "Create account"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateEmployee;

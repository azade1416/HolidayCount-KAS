
import { useState } from "react";
import {
    createEmployee, updateUser, createDefaultSchedule, WORKDAYS, EMPLOYMENT_TYPES,
    DEFAULT_EMPLOYMENT_TYPE,
} from "../mockApi";
import type { WeeklySchedule } from "../employee";
import type { PublicUser } from "../admin";

type Props = {
    user?: PublicUser;
    onClose: () => void;
    onCreated: () => void;
};

function CreateEmployee({ user, onClose, onCreated }: Props) {
    const startingRole = user?.employmentType ??
        (user?.role === "Employee" ? DEFAULT_EMPLOYMENT_TYPE : user?.role ?? DEFAULT_EMPLOYMENT_TYPE);
    const [role, setRole] = useState(startingRole);
    const [schedule, setSchedule] = useState(user?.weeklySchedule ?? createDefaultSchedule());

    const isEmployee = role === EMPLOYMENT_TYPES[0] || role === EMPLOYMENT_TYPES[1];

    const update = (day: keyof WeeklySchedule, field: "from" | "to", value: string) =>
        setSchedule((prev: WeeklySchedule) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const data = new FormData(e.currentTarget);
        const valid = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

        if (isEmployee && WORKDAYS.some(day =>
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
                        {EMPLOYMENT_TYPES.map(r =>
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

                            {WORKDAYS.map(day => (
                                <div className="schedule-row" key={day}>
                                    <strong>{day}</strong>

                                    <input
                                        value={schedule[day].from}
                                        onChange={e => update(day, "from", e.target.value)}
                                        required
                                    />
                                    <input
                                        value={schedule[day].to}
                                        onChange={e => update(day, "to", e.target.value)}
                                        required
                                    />
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

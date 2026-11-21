import { Fragment } from "react";
import type { Employee, MockRequest } from "../employee";

type Props = { month: Date; employees: Employee[]; approved: MockRequest[] };

function HolidayCalendar({ month, employees, approved }: Props) {
    const year = month.getFullYear();
    const m = month.getMonth();
    const length = new Date(year, m + 1, 0).getDate();
    const dates = Array.from({ length }, (_, i) => new Date(year, m, i + 1));
    const isoDates = dates.map(d => d.toLocaleDateString("sv"));

    const onHoliday = (id: string, date: string) =>
        approved.some(r =>
            r.employeeId === id &&
            (r.type ?? "Holiday") === "Holiday" &&
            r.startDate <= date && r.endDate >= date
        );

    return (
        <div className="calendar-scroll">
            <div className="calendar-grid" style={{ "--calendar-days": length } as React.CSSProperties}>
                <div className="calendar-name calendar-name-heading">Employee</div>
                {dates.map(d => (
                    <div key={d.getDate()} className="calendar-day">
                        {d.toLocaleDateString("en", { weekday: "short" })}
                        <strong>{d.getDate()}</strong>
                    </div>
                ))}

                {employees.map(e => (
                    <Fragment key={e.id}>
                        <div className="calendar-name">{e.name}</div>
                        {isoDates.map(date => (
                            <div
                                key={date}
                                title={`${e.name} - ${date}`}
                                className={`calendar-square${onHoliday(e.id, date) ? " holiday" : ""}`}
                            />
                        ))}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}

export default HolidayCalendar;
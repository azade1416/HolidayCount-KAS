import { Fragment } from "react";
import type { MockRequest } from "../employee";
import type { Employee } from "../employee";

type Props = {
    month: Date;
    employees: Employee[];
    approved: MockRequest[];
};

function HolidayCalendar({ month, employees, approved }: Props) {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const dates = Array.from({ length: days }, (_, index) => index + 1);

    function dateKey(day: number) {
        const monthText = String(monthIndex + 1).padStart(2, "0");
        const dayText = String(day).padStart(2, "0");
        return `${year}-${monthText}-${dayText}`;
    }

    function hasHoliday(employeeId: string, date: string) {
        return approved.some(request =>
            request.employeeId === employeeId &&
            (request.type ?? "Holiday") === "Holiday" &&
            request.startDate <= date && request.endDate >= date
        );
    }

    return (
        <div className="calendar-scroll">
            <div className="calendar-grid" style={{ gridTemplateColumns: `140px repeat(${days}, 38px)` }}>
                <div className="calendar-name calendar-name-heading">Employee</div>
                {dates.map(day => (
                    <div key={day} className="calendar-day">
                        {new Date(year, monthIndex, day).toLocaleDateString("en", { weekday: "short" })}
                        <strong>{day}</strong>
                    </div>
                ))}

                {employees.map(employee => (
                    <Fragment key={employee.id}>
                        <div className="calendar-name">{employee.name}</div>
                        {dates.map(day => {
                            const date = dateKey(day);
                            const holiday = hasHoliday(employee.id, date);
                            const title = `${employee.name} - ${date}`;
                            const className = holiday ? "calendar-square holiday" : "calendar-square";

                            return <div key={date} title={title} className={className} />;
                        })}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}

export default HolidayCalendar;

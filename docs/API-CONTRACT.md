# HolidayCount API contract

This contract describes the HTTP API required by the current React frontend.
Frontend must not access PostgreSQL directly. The backend remains the source of
truth for calculations, balances, permissions and statuses.

## Common rules

- Base URL: `/api`
- Authentication: `Authorization: Bearer <jwt>` on protected endpoints
- JSON property names use camelCase
- IDs are GUID/UUID strings
- Dates use `YYYY-MM-DD`
- Timestamps use ISO 8601 UTC
- Roles: `employee`, `accountant`, `admin`
- The frontend uses mock API data as a reference only. It must not use mock
  HTTP status codes or mock TypeScript strings as database types.

Standard errors:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable explanation"
}
```

Relevant status codes:

| Code | Meaning |
|---|---|
| `400` | Invalid input |
| `401` | Invalid or missing authentication |
| `403` | User has no permission |
| `404` | Resource not found |
| `409` | Duplicate or conflicting operation |

## Authentication

### `POST /auth/login`

Request:

```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

Response `200`:

```json
{
  "token": "<jwt>",
  "id": "00000000-0000-0000-0000-000000000000",
  "name": "John Carter",
  "email": "john@example.com",
  "role": "employee",
  "employmentType": "Full-time employee",
  "weeklySchedule": {
    "Monday": { "from": "08:00", "to": "16:00" },
    "Tuesday": { "from": "08:00", "to": "16:00" },
    "Wednesday": { "from": "08:00", "to": "16:00" },
    "Thursday": { "from": "08:00", "to": "16:00" },
    "Friday": { "from": "08:00", "to": "16:00" }
  }
}
```

Invalid credentials return `401`.

### `GET /auth/me`

Returns the same public user object without `password`, for the logged-in
user.

### `POST /auth/logout`

Invalidates the frontend session. Response `204`.

## User management

These endpoints require `admin`.

### `GET /users`

Returns public users:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "John Carter",
    "email": "john@example.com",
    "role": "employee",
    "employmentType": "Full-time employee",
    "weeklySchedule": {
      "Monday": { "from": "08:00", "to": "16:00" },
      "Tuesday": { "from": "08:00", "to": "16:00" },
      "Wednesday": { "from": "08:00", "to": "16:00" },
      "Thursday": { "from": "08:00", "to": "16:00" },
      "Friday": { "from": "08:00", "to": "16:00" }
    }
  }
]
```

Roles are `employee`, `accountant`, or `admin`. Employee employment types are
`Full-time employee` or `Part-time employee`. Accountants and admins do not
require employment type or schedule.

### `POST /users`

Request:

```json
{
  "name": "John Carter",
  "email": "john@example.com",
  "password": "123456",
  "role": "employee",
  "employmentType": "Full-time employee",
  "weeklySchedule": {
    "Monday": { "from": "08:00", "to": "16:00" },
    "Tuesday": { "from": "08:00", "to": "16:00" },
    "Wednesday": { "from": "08:00", "to": "16:00" },
    "Thursday": { "from": "08:00", "to": "16:00" },
    "Friday": { "from": "08:00", "to": "16:00" }
  }
}
```

Response `201` with the created public user.

Duplicate email: `409`. Invalid schedule: `400`.

### `PUT /users/{id}`

All properties are optional:

```json
{
  "name": "John Carter",
  "email": "john@example.com",
  "password": "new-password",
  "role": "employee",
  "employmentType": "Part-time employee",
  "weeklySchedule": {
    "Monday": { "from": "08:00", "to": "15:00" },
    "Tuesday": { "from": "08:00", "to": "15:00" },
    "Wednesday": { "from": "08:00", "to": "15:00" },
    "Thursday": { "from": "08:00", "to": "15:00" },
    "Friday": { "from": "08:00", "to": "15:00" }
  }
}
```

Changing a schedule must create a `ScheduleChange` entry. Response `200` with
the updated public user.

### `DELETE /users/{id}`

Response `204`. Deleting the authenticated user is forbidden with `409` or
`403`.

## Employees and schedules

### `GET /employees`

Accountant and employee endpoints use:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "John Carter",
    "role": "Full-time employee"
  }
]
```

### `GET /employees/{id}/schedule`

Returns the employee's weekly schedule. Employees may read only their own
schedule; accountant/admin may read any employee schedule.

### `GET /employees/{id}/schedule-history`

Response:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "date": "2026-11-19",
    "previousSchedule": {},
    "newSchedule": {}
  }
]
```

## Holiday balances

### `GET /employees/{employeeId}/holiday-accounts`

Employee may request only their own accounts. Accountant/admin may request
any employee.

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "employeeId": "00000000-0000-0000-0000-000000000000",
    "name": "Weeks 1–5",
    "accrued": { "hours": 185 },
    "used": { "hours": 29.5 },
    "remaining": { "hours": 155.5 },
    "eligibleDate": "2026-09-01"
  },
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "employeeId": "00000000-0000-0000-0000-000000000000",
    "name": "Week 6",
    "accrued": { "hours": 37 },
    "used": { "hours": 0 },
    "remaining": { "hours": 37 },
    "eligibleDate": "2026-09-01"
  }
]
```

Balances use server-calculated hours with two decimals. Money fields must not
be stored or returned by this system.

### `GET /holiday-accounts/future-balance?date=YYYY-MM-DD`

Returns the current user's projected balance for each account, including
monthly accrual through the requested date. Only approved leave reduces the
projected balance; pending requests do not.

## Leave and cancellation requests

Request types are `Holiday` and `Cancellation`.

Statuses are `Pending`, `Approved`, `Rejected`, `Cancelled`.

### `POST /leave-requests`

Employee request:

```json
{
  "accountId": "00000000-0000-0000-0000-000000000000",
  "startDate": "2026-12-01",
  "endDate": "2026-12-05"
}
```

The backend derives employee ID from JWT. Response `201`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "employeeId": "00000000-0000-0000-0000-000000000000",
  "employee": "John Carter",
  "account": "Weeks 1–5",
  "startDate": "2026-12-01",
  "endDate": "2026-12-05",
  "type": "Holiday",
  "status": "Pending",
  "submittedDate": "2026-11-19",
  "decisionDate": ""
}
```

### `GET /employees/{employeeId}/leave-requests`

Returns that employee's complete request history, newest first.

### `GET /leave-requests/pending`

Accountant response:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "employee": "John Carter",
    "dates": "2026-12-01 – 2026-12-05",
    "status": "Pending",
    "submittedDate": "2026-11-19",
    "type": "Holiday"
  }
]
```

### `GET /leave-requests/history`

Returns non-pending requests for accountant/admin:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "employeeId": "00000000-0000-0000-0000-000000000000",
    "employee": "John Carter",
    "account": "Weeks 1–5",
    "startDate": "2026-12-01",
    "endDate": "2026-12-05",
    "type": "Holiday",
    "status": "Approved",
    "submittedDate": "2026-11-10",
    "decisionDate": "2026-11-11"
  }
]
```

### `GET /leave-requests/approved-holidays`

Returns approved holiday requests. It is used for employee and accountant
calendars.

### `POST /leave-requests/{id}/approve`

Requires `accountant` or `admin`. For a holiday request, approve and deduct
hours from the corresponding balance. For a cancellation request, approve,
restore the original holiday request and restore its deducted balance.

Repeating the decision returns `409`.

### `POST /leave-requests/{id}/reject`

Requires `accountant` or `admin`. No balance change. Response `200` with the
updated request.

### `POST /leave-requests/{id}/cancel`

Employee creates a cancellation request for an approved holiday. Request:

```json
{}
```

The backend validates ownership, approved status and absence of an existing
pending cancellation for the same holiday. Response `201`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "employeeId": "00000000-0000-0000-0000-000000000000",
  "employee": "John Carter",
  "account": "Weeks 1–5",
  "startDate": "2026-12-01",
  "endDate": "2026-12-05",
  "type": "Cancellation",
  "originalRequestId": "00000000-0000-0000-0000-000000000000",
  "status": "Pending",
  "submittedDate": "2026-11-19",
  "decisionDate": ""
}
```

`404` if the approved holiday does not exist; `409` if a cancellation is
already pending.

## Announcements

### `GET /announcements`

Available to employee, accountant and admin.

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "message": "Holiday policy meeting",
    "date": "2026-11-19"
  }
]
```

### `POST /announcements`

Requires `admin`.

```json
{
  "message": "Holiday policy meeting"
}
```

Empty message: `400`. Response `201` with the announcement.

## Calendar

Approved holidays are obtained from `GET /leave-requests/approved-holidays`.
Both employee and accountant calendars filter them by `employeeId`,
`startDate` and `endDate`.

## Transfer requests

An employee may request transfer of at most 5 unused days from the current
holiday period. The transfer is a normal approval workflow:

```json
{
  "account": "Weeks 1–5",
  "hours": 37.00,
  "writtenAgreement": true
}
```

The backend requires written agreement, verifies the available balance and
creates a `Transfer` request. Accountant/admin approve or reject it.
The approval must not transfer more than the balance or more than one week.
No public holiday or salary amount is stored in this operation.

## Future balance

`GET /holiday-accounts/future-balance?date=YYYY-MM-DD` calculates the balance
as of a future date. It should:

- keep holiday-right units in hours;
- include approved future holidays;
- use current and historical working schedules for the relevant periods;
- show separate `Weeks 1–5` and `Week 6` values;
- return both current and future balance when useful for UI confirmation.

Pending requests must not reduce the future balance; only approved requests
do.

## Public holidays

Public holidays can be created and edited only by `admin`.

```json
{
  "date": "2026-12-25",
  "name": "Christmas Day",
  "companySpecific": false
}
```

## Rule presets and system parameters

These endpoints require `admin`. Presets are reusable named settings. Saving
rules creates an immutable effective-dated version; it does not rewrite
existing monthly accrual records.

### `GET /rule-presets`

Returns saved presets:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Business Esbjerg defaults",
    "settings": {
      "weeks1To5DaysPerMonth": 2.08,
      "week6DaysPerMonth": 0.42,
      "mainHolidayNoticeMonths": 3,
      "otherHolidayNoticeMonths": 1,
      "transfersEnabled": true
    }
  }
]
```

### `GET /rule-presets/{id}`

Returns one named preset.

### `POST /rule-presets`

Request: `{ "name": "Preset name", "settings": { ... } }` using the settings
object shown above. Duplicate names return `409`; invalid values return `400`.

### `GET /system-parameters`

Returns effective-dated history as `{ "key", "value", "effectiveFrom" }`
records.

### `POST /system-parameters`

Request:

```json
{
  "effectiveFrom": "2027-01-01",
  "settings": {
    "weeks1To5DaysPerMonth": 2.08,
    "week6DaysPerMonth": 0.42,
    "mainHolidayNoticeMonths": 3,
    "otherHolidayNoticeMonths": 1,
    "transfersEnabled": true
  }
}
```

The effective date must be in the future. Duplicate effective dates return
`409`. Initial defaults are 2.08 days/month for weeks 1–5 and 0.42 days/month
for week 6. Accrual is converted to hours using the effective schedule's
average workday length. Monthly accruals store the rate and hours used, so
later rule or schedule changes do not rewrite recorded history.

Pending holiday requests reserve debt capacity. The maximum debt is one
effective scheduled workweek combined across both holiday accounts.

## Planned final settlement

`POST /balances/{id}/final-settlement` closes an employee balance when
employment ends, records a payout and prevents duplicate payout. The request
contains `settlementDate`, `reason` and `paymentMethod` (`direct` or
`feriepengeinfo`). A repeated settlement returns `409`.

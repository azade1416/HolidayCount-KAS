# HolidayCount API contract (draft)

This is the shared contract between the React client and the backend. The
frontend must use the request and response shapes below rather than accessing
the database directly.

## Conventions

- Base URL: `/api`
- JSON uses camelCase.
- Dates use `YYYY-MM-DD`.
- Timestamps use ISO 8601 UTC.
- IDs are UUIDs.
- Protected endpoints use `Authorization: Bearer <token>`.
- Roles currently in scope: `employee` and `accountant`. Accounting manages
  users and rule configuration in the first version.

Each endpoint below is marked **Implemented** or **Planned**. Planned
endpoints are part of the target design, not claims that the current branch
already implements them.

## Authentication

### `POST /auth/login` — **Implemented**

Request:

```json
{
  "username": "anna@example.com",
  "password": "password"
}
```

Response `200`:

```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "name": "Anna Example",
  "username": "anna@example.com",
  "role": "employee"
}
```

Invalid credentials return `401`.

## Users

These endpoints are for the accounting role.

### `GET /auth/users` — **Implemented**

Response `200`:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "fullName": "Anna Example",
    "username": "anna@example.com",
    "role": "employee"
  }
]
```

### `POST /auth/users` — **Implemented**

Request:

```json
{
  "fullName": "Anna Example",
  "username": "anna@example.com",
  "password": "password",
  "role": "employee",
  "employmentType": "salaried",
  "workSchedule": [
    { "dayOfWeek": "monday", "hours": 7.5 },
    { "dayOfWeek": "tuesday", "hours": 7.5 },
    { "dayOfWeek": "wednesday", "hours": 7.5 },
    { "dayOfWeek": "thursday", "hours": 7.5 },
    { "dayOfWeek": "friday", "hours": 7 }
  ]
}
```

Response `201`:

```json
{
  "message": "User created successfully",
  "id": "00000000-0000-0000-0000-000000000000",
  "username": "anna@example.com",
  "role": "employee"
}
```

### `PUT /auth/users/{id}` and `DELETE /auth/users/{id}` — **Implemented**

Accounting can update or delete an employee. The update body may contain
`fullName`, `username`, `password`, `role`, `employmentType`, and
`workSchedule`. `role` controls permissions; `employmentType` controls
calculation rules and is independent of the permission role.

## Leave requests

### `POST /leave-requests` — **Implemented, calculation update required**

Employee request:

```json
{
  "accountType": "weeks1To5",
  "startDate": "2026-09-15",
  "endDate": "2026-09-20",
  "isMainHoliday": true,
  "reason": "Family holiday"
}
```

The server calculates `requestedDays` and `requestedHours` from the dates,
the employee's effective schedule, and public holidays. Client-provided
calculated values are ignored or rejected. Response `201`:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "userId": "00000000-0000-0000-0000-000000000000",
  "employeeName": "Anna Example",
  "accountType": "weeks1To5",
  "startDate": "2026-09-15",
  "endDate": "2026-09-20",
  "requestedDays": 4,
  "requestedHours": 30,
  "isMainHoliday": true,
  "status": "pending",
  "reason": "Family holiday",
  "submittedAtUtc": "2026-09-10T12:00:00Z",
  "reviewedAtUtc": null,
  "reviewedByUserId": null,
  "estimatedCostDkk": 3000.00
}
```

`status` values are `pending`, `approved`, `rejected`, and `cancelled`.
`accountType` values are `weeks1To5` and `week6`.

### `GET /leave-requests` — **Implemented**

Employee response: the authenticated employee's own requests, newest first,
using the same request object as the `POST` response, including
`reviewedAtUtc`, `reviewedByUserId`, `requestedDays`, `requestedHours`, and
`estimatedCostDkk`.

### `GET /leave-requests/{id}` — **Implemented**

Returns one request owned by the authenticated employee.

### `GET /leave-requests/pending` — **Planned**

Accounting response: all pending requests awaiting review. Each item includes
the request data and employee identity needed by the accounting screen:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "employeeId": "00000000-0000-0000-0000-000000000000",
    "employeeName": "Anna Example",
    "accountType": "weeks1To5",
    "startDate": "2026-09-15",
    "endDate": "2026-09-20",
    "requestedDays": 4,
    "requestedHours": 30,
    "estimatedCostDkk": 3000.00,
    "status": "pending",
    "submittedAtUtc": "2026-09-10T12:00:00Z"
  }
]
```

### `GET /leave-requests/all` — **Planned**

Accounting response: all requests, including their status and review data.
This endpoint is for the accounting history screen and uses the same request
object, including `employeeName`, `submittedAtUtc`, `reviewedAtUtc`,
`reviewedByUserId`, days, hours, and DKK values.

### `POST /leave-requests/{id}/approve` — **Planned**

Accounting can approve a pending request. The operation records
`reviewedAtUtc` and `reviewedByUserId`, deducts the calculated leave from the
appropriate balance, and records the transaction. Repeating approval returns
`409 Conflict` and must not deduct leave twice.

Response `200` returns the updated request object, including `status:
"approved"`, `reviewedAtUtc`, `reviewedByUserId`, and the resulting balance
transaction.

### `POST /leave-requests/{id}/reject` — **Planned**

Accounting can reject a pending request. Request:

```json
{
  "reason": "Dates are outside the available usage period"
}
```

Rejection leaves the balance unchanged and records the review data.
Response `200` returns the updated request object, including `status:
"rejected"`, `rejectionReason`, `reviewedAtUtc`, and
`reviewedByUserId`.

### Cancellation

Employee self-cancellation is not part of the first demo contract. Employer cancellation of an already approved request is a separate workflow: it
 requires an agreed business rule, a reason, restoration of the deducted
 balance, and a compensating transaction.

## Balances

### `GET /balances/my` — **Planned**

Employee response:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "employeeId": "00000000-0000-0000-0000-000000000000",
    "employeeName": "Anna Example",
    "accountType": "weeks1To5",
    "earningPeriodStart": "2026-01-01",
    "earningPeriodEnd": "2026-12-31",
    "usagePeriodStart": "2026-05-01",
    "usagePeriodEnd": "2027-04-30",
    "earnedDays": 25,
    "usedDays": 4,
    "remainingDays": 21,
    "earnedHours": 187.5,
    "usedHours": 30,
    "remainingHours": 157.5,
    "qualifyingSalaryDkk": 360000.00,
    "holidaySupplementDkk": 0.00
  }
]
```

### `GET /balances` — **Planned**

Accounting response: balances for employees, including `accountType`,
earning/usage periods, earned units, used units, transferred units, and paid
out units, employee names, days, hours, and DKK values.

### `GET /balances/{id}` — **Planned**

Returns one balance with its earning period, usage/expiry period, current
units, and account type. Employees may request only their own balance;
accounting may request an employee's balance.

## Leave request support

These endpoints support the employee request form and its estimate preview.

### `POST /leave-requests/estimate` — **Planned**

Calculates the requested working days and hours without creating a request or
changing a balance.

Request:

```json
{
  "accountType": "weeks1To5",
  "startDate": "2026-09-15",
  "endDate": "2026-09-20",
  "isMainHoliday": true
}
```

Response `200`:

```json
{
  "accountType": "weeks1To5",
  "requestedDays": 4,
  "requestedHours": 30,
  "estimatedCostDkk": 3000.00,
  "usagePeriodEnd": "2027-04-30"
}
```

The calculation excludes weekends and public holidays and uses the
employee's effective work schedule.

### `GET /leave-requests/presets` — **Planned**

Returns the two selectable **account types**, `weeks1To5` and `week6`. These
are not rule presets and do not create a request.

## Work schedules and public holidays

These are read-only support endpoints for calculation and administration.

### `GET /work-schedules/my` — **Planned**

Returns the authenticated employee's effective weekday schedule.

### `GET /public-holidays` — **Planned**

Returns public holidays relevant to date and hour calculations.

## Rule presets and rule administration

The following endpoints cover the rule-presets part of the assignment. They
are planned after the first demo unless the team agrees to implement them
earlier.

A preset is a starting point selected by accounting and then adjusted.
Examples include:

- `Ferieloven` — five weeks;
- `Ferieloven + 6. ferieuge` — the Business Esbjerg model;
- `Ferieloven + feriefridage` — extra holiday days from an agreement;
- `Hourly-paid staff` — holiday pay as a percentage instead of salary during
  holiday.

### `GET /rule-presets` — **Planned**

Returns available built-in presets and their rule values.

### `GET /rule-presets/{id}` — **Planned**

Returns one preset and its rule values.

### `POST /rule-sets` — **Planned**

Accounting creates a custom, effective-dated rule set from a preset.

### `GET /rule-sets` — **Planned**

Returns rule-set versions, including effective dates and active status.

### `GET /rule-sets/{id}` — **Planned**

Returns one rule-set version and its values.

### `PUT /rule-sets/{id}` — **Planned**

Accounting adjusts a rule-set version. Changes must be effective-dated and
must not silently rewrite historical calculations.

### `POST /rule-sets/{id}/activate` — **Planned**

Accounting activates a rule-set version for future calculations.

Rule administration is not required for the first
leave-request demo; the first demo uses seeded balances and a selected rule
set.

## Final settlement

### `POST /balances/{id}/final-settlement` — **Planned**

Accounting uses this action when an employee leaves. It closes the selected
balance for a given settlement date, calculates the remaining payable amount,
records the payout, and prevents further leave deductions from that balance.
It is not the same as approving a leave request.

Request:

```json
{
  "settlementDate": "2026-12-31",
  "reason": "Employment ended"
}
```

Response `200`:

```json
{
  "balanceId": "00000000-0000-0000-0000-000000000000",
  "employeeName": "Anna Example",
  "settlementDate": "2026-12-31",
  "remainingDays": 21,
  "remainingHours": 157.5,
  "payoutDkk": 25200.00,
  "status": "settled"
}
```

## Error shape

Validation and authorization errors use:

```json
{
  "message": "Human-readable explanation"
}
```

Common statuses are `400`, `401`, `403`, `404`, `409`, and `422`.

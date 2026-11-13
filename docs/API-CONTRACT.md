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
- Roles currently in scope: `employee` and `accountant`. The administrator
  role is out of the first demo; accounting manages users.

## Authentication

### `POST /auth/login`

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

### `GET /auth/users`

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

### `POST /auth/users`

Request:

```json
{
  "fullName": "Anna Example",
  "username": "anna@example.com",
  "password": "password",
  "role": "employee"
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

### `PUT /auth/users/{id}` and `DELETE /auth/users/{id}`

Accounting can update or delete an employee. The update body may contain
`fullName`, `username`, `password`, and `role`.

## Leave requests

### `POST /leave-requests`

Employee request:

```json
{
  "accountType": "weeks1To5",
  "startDate": "2026-09-15",
  "endDate": "2026-09-20",
  "requestedDays": 4,
  "requestedHours": 30,
  "isMainHoliday": true,
  "reason": "Family holiday"
}
```

Response `201` returns the created leave request, including its generated
`id`, `userId`, `status`, and `submittedAtUtc`.

`status` values are `pending`, `approved`, `rejected`, and `cancelled`.
`accountType` values are `weeks1To5` and `week6`.

### `GET /leave-requests`

Employee response: the authenticated employee's own requests, newest first.

### `GET /leave-requests/{id}`

Returns one request owned by the authenticated employee.

### `GET /leave-requests/pending`

Accounting response: all pending requests awaiting review. Each item includes
the request data and the employee identity needed by the accounting screen.

### `GET /leave-requests/all`

Accounting response: all requests, including their status and review data.
This endpoint is for the accounting history screen.

### `POST /leave-requests/{id}/approve`

Accounting can approve a pending request. The operation records
`reviewedAtUtc` and `reviewedByUserId`, deducts the calculated leave from the
appropriate balance, and records the transaction. Repeating approval returns
`409 Conflict` and must not deduct leave twice.

### `POST /leave-requests/{id}/reject`

Accounting can reject a pending request. Request:

```json
{
  "reason": "Dates are outside the available usage period"
}
```

Rejection leaves the balance unchanged and records the review data.

### Cancellation

Employee self-cancellation is not part of the first demo contract. Employer cancellation of an already approved request is a separate workflow: it
 requires an agreed business rule, a reason, restoration of the deducted
 balance, and a compensating transaction.

## Balances

### `GET /balances/my`

Employee response: the employee's balances, separated by `accountType`.

### `GET /balances`

Accounting response: balances for employees, including `accountType`,
earning/usage periods, earned units, used units, transferred units, and paid
out units.

### `GET /balances/{id}`

Returns one balance with its earning period, usage/expiry period, current
units, and account type. Employees may request only their own balance;
accounting may request an employee's balance.

## Leave request support

These endpoints support the employee request form and its estimate preview.

### `POST /leave-requests/estimate`

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
  "estimatedCost": 30,
  "usagePeriodEnd": "2027-05-31"
}
```

The calculation excludes weekends and public holidays and uses the
employee's effective work schedule.

### `GET /leave-requests/presets`

Returns selectable request presets for the employee form, for example
`weeks1To5` and `week6`. A preset supplies defaults only; it does not create a
request.

## Work schedules and public holidays

These are read-only support endpoints for calculation and administration.

### `GET /work-schedules/my`

Returns the authenticated employee's effective weekday schedule.

### `GET /public-holidays`

Returns public holidays relevant to date and hour calculations.

## Rule presets and rule administration

The following endpoints cover the rule-presets part of the assignment. They
are planned after the first demo unless the team agrees to implement them
earlier.

A preset is a starting point selected by an administrator and then adjusted.
Examples include:

- `Ferieloven` — five weeks;
- `Ferieloven + 6. ferieuge` — the Business Esbjerg model;
- `Ferieloven + feriefridage` — extra holiday days from an agreement;
- `Hourly-paid staff` — holiday pay as a percentage instead of salary during
  holiday.

### `GET /rule-presets`

Returns available built-in presets and their rule values.

### `GET /rule-presets/{id}`

Returns one preset and its rule values.

### `POST /rule-sets`

Administrator creates a custom, effective-dated rule set from a preset.

### `GET /rule-sets`

Returns rule-set versions, including effective dates and active status.

### `GET /rule-sets/{id}`

Returns one rule-set version and its values.

### `PUT /rule-sets/{id}`

Administrator adjusts a rule-set version. Changes must be effective-dated and
must not silently rewrite historical calculations.

### `POST /rule-sets/{id}/activate`

Administrator activates a rule-set version for future calculations.

Rule administration and the administrator role are not required for the first
leave-request demo; the first demo uses seeded balances and a selected rule
set.

## Error shape

Validation and authorization errors use:

```json
{
  "message": "Human-readable explanation"
}
```

Common statuses are `400`, `401`, `403`, `404`, `409`, and `422`.

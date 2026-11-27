# Business Esbjerg Absence Planning

Business Esbjerg currently tracks employee leave through spreadsheets and email. This third-semester project gives employees a way to request leave and lets accounting review requests and see the resulting balances.

## Start here

- The backend API is documented by Swagger/OpenAPI when the service is running.
- Azade builds the [employee screens](https://github.com/azade1416/HolidayCount-KAS/issues/8) and [accounting screens](https://github.com/azade1416/HolidayCount-KAS/issues/12).
- Samuele defines the [role and ownership rules](https://github.com/azade1416/HolidayCount-KAS/issues/6).

Keep one issue in progress per person. Use GitHub’s Assignees field for ownership and the issue checklist to confirm completion.

## Status and first milestone

The application supports employee leave requests, accounting approval, balance tracking, cancellation requests, rule presets and public holidays. The API validates ownership, dates, schedules and balances; pending requests do not deduct hours.

## Team

| Owner | Work |
| --- | --- |
| Azade | React client, React Router, TypeScript and the API client generated with swagger-typescript-api |
| Kyrylo | .NET Web API, Linq2db, relational database, GUIDs, server-side validation and OpenAPI |
| Samuele | Authentication, authorization, secret handling, GitHub Actions, Lighthouse and README |

Each owner writes tests for their area. The team reviews pull requests and runs the end-to-end scenario together.

## Access policies

| Role | Planned access |
| --- | --- |
| Employee | Submit leave requests and see their own requests and balances. |
| Accountant | Review requests and employee balances. |
| Administrator | Manage rule presets and effective-dated rules. |

The API enforces these permissions and checks ownership. Passwords are stored as BCrypt hashes. Store deployment secrets in the hosting environment or GitHub Actions secrets.

## Backend calculations

Leave is charged in hours using the employee’s effective work schedule for each requested date. Weekends and configured public holidays are excluded; the API derives both working days and hours, so clients cannot choose the cost.

Accrual is calculated monthly from the effective annual rule, converted to hours using the employee’s average scheduled workday length for that month, and rounded to two decimals. Repeated balance reads do not accrue the same month twice.

Pending leave can use up to one scheduled workweek beyond the current combined balance. The projected combined balance must still be at least zero at the end of the earning period (31 August). The usage window runs through 31 December.

## Deployment

- On an empty database, the API seeds three demo accounts. Configure credentials in `.env`; never commit passwords:

```env
SEED_ADMIN_EMAIL=admin@businessesbjerg.com
SEED_ADMIN_PASSWORD=<password>
SEED_ACCOUNTANT_EMAIL=accountant@businessesbjerg.com
SEED_ACCOUNTANT_PASSWORD=<password>
SEED_EMPLOYEE_EMAIL=employee@businessesbjerg.com
SEED_EMPLOYEE_PASSWORD=<password>
```

The seed runs only when the `Users` table is empty. Configure the database connection and JWT signing key through environment variables; never commit production credentials or connection strings.

- Client URL pending.
- API Swagger URL pending.
- The client and API will deploy independently. The API will use a central relational database hosted in the cloud.

## Testing

The test suite includes unit tests for calculations and integration tests against disposable PostgreSQL for API behavior, accrual, schema upgrades and balances. Test-first was used for focused changes such as rejecting client-supplied leave hours. Test-last was also used to add regression coverage after implementation, including schedule changes, accrual idempotency, projected debt limits and cancellation/approval edge cases. Run `dotnet test Backend.Tests\Backend.Tests.csproj` from the repository root.

## Project board and exam evidence

Track work in [GitHub Issues](https://github.com/azade1416/HolidayCount-KAS/issues) and the [HolidayCount Kanban](https://github.com/users/azade1416/projects/8). Use short branches and peer-reviewed pull requests. Add board screenshots from halfway through the project and at the end. Run Lighthouse against the same client flow before and after an improvement, then add both screenshots and describe what changed.

Update this README with what works, known bugs and deployment links before submitting the repository URL in WISEflow. Verify the official submission window there.

## Team dates

| Date | Checkpoint |
| --- | --- |
| 16 November 2026 | Review the first demo scope, rule selection and accrual rounding with Alex. |
| 4 December 2026 | Aim for the hosted demo, with time left for fixes. |
| 7 December 2026 | Practise the oral exam using the working flow and the code each person owns. |
| 11 December 2026 | Submit the project on WISEflow. |

Confirm with Alex how to round accrual, which schedule and rule version apply when hours or rules change, and which carryover, payout and exception cases need to be ready for assessment.

## Further work

After the first demo, review the remaining leave rules with Alex and agree what to implement next. Use the issue board to track the work and record what remains at submission.

## AI disclosure

We used Codex to brainstorm ideas and think through the risks of some project decisions.

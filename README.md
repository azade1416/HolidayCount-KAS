# Business Esbjerg Absence Planning

Business Esbjerg currently tracks employee leave through spreadsheets and email. This third-semester project gives employees a way to request leave and lets accounting review requests and see the resulting balances.

## Start here

- Kyrylo drafts the [API contract](https://github.com/azade1416/HolidayCount-KAS/issues/4).
- Azade builds the [employee screens](https://github.com/azade1416/HolidayCount-KAS/issues/8) and [accounting screens](https://github.com/azade1416/HolidayCount-KAS/issues/12).
- Samuele defines the [role and ownership rules](https://github.com/azade1416/HolidayCount-KAS/issues/6).

Keep one issue in progress per person. Use GitHub’s Assignees field for ownership and the issue checklist to confirm completion.

## Status and first milestone

Backend development has started on a feature branch. The full leave workflow is still in development. For the first demo, an employee requests a day off, accounting approves it, and the employee sees one deduction from the correct balance. We’ll use synthetic data and verify that a pending request leaves the balance unchanged and that retrying an approval can’t deduct leave twice.

The two leave accounts have separate earning and usage windows. Requests cover whole days, and the hours charged come from the employee’s schedule. The case’s standard schedule is 7.5 hours Monday through Thursday and 7 hours on Friday. Weekends and holidays are excluded. The first demo uses seeded balances so we can verify the workflow before adding accrual and rule administration.

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
| Accounting | Review pending requests, approve or reject them, and see employee balances. |
| Administrator | Manage rule versions when the administration feature is added. |

The API will enforce these permissions and check ownership for employee records. Passwords will use the authentication provider’s secure handling. Store deployment secrets in the hosting environment or GitHub Actions secrets.

## Deployment

- Client URL pending.
- API Swagger URL pending.
- The client and API will deploy independently. The API will use a central relational database hosted in the cloud.

## Testing strategy

Start with unit tests for leave cost, account windows and effective rule dates. Use integration tests with a test database for authorization, server validation, repeat approval and concurrent approval. Run an end-to-end test that submits leave as an employee, approves it as accounting and checks the updated balance. GitHub Actions will run tests on pushes to main and pull requests targeting main. Record which tests were written before the code and which were added afterward.

## Project board and exam evidence

Track work in [GitHub Issues](https://github.com/azade1416/HolidayCount-KAS/issues) and the [HolidayCount Kanban](https://github.com/users/azade1416/projects/8). Use short branches and peer-reviewed pull requests. Add board screenshots from halfway through the project and at the end. Run Lighthouse against the same client flow before and after an improvement, then add both screenshots and describe what changed.

Update this README with what works, known bugs and deployment links before submitting the repository URL in WISEflow. Verify the official submission window there.

## Team dates

| Date | Checkpoint |
| --- | --- |
| Moodle booking | Review the first demo scope, rule selection and accrual rounding with Alex. Use Moodle to confirm the time and attendees. |
| 4 Dec 2026 | Aim for the hosted demo, with time left for fixes. |
| 7 Dec 2026 | Practise the oral exam using the working flow and the code each person owns. |
| 11 Dec 2026 | Submit the repository link only if submission is still pending and WISEflow allows it. |

These are team checkpoints. Check the official dates and submission window in WISEflow.

Confirm with Alex how to round accrual, which schedule and rule version apply when hours or rules change, and which carryover, payout and exception cases need to be ready for assessment.

## Further work

After the first demo, review the remaining leave rules with Alex and agree what to implement next. Use the issue board to track the work and record what remains at submission.

## AI disclosure

We used Codex to help draft and consolidate GitHub issues, organize the Kanban, and suggest README updates. Update this section before submission with any additional AI use and identify any AI-generated files included in the submission.

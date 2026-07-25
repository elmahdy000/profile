---
target: student platform
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-07-24T18-59-16Z
slug: ahmoud-src-components-platform-studentplatform-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No progress save confirmation, no connection status |
| 2 | Match System / Real World | 3 | Excellent Egyptian Arabic; minor jargon leaks |
| 3 | User Control and Freedom | 1 | No quiz submission confirmation, no undo |
| 4 | Consistency and Standards | 2 | Three primary-blue hex values; modal styles diverge |
| 5 | Error Prevention | 2 | Quiz submits with no confirmation on last attempt |
| 6 | Recognition Rather Than Recall | 3 | Good sidebar; files lack lesson context |
| 7 | Flexibility and Efficiency | 1 | No search for students, no keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Clean dashboard; video section heavier than needed |
| 9 | Error Recovery | 2 | Error messages lack actionable recovery steps |
| 10 | Help and Documentation | 1 | Single WhatsApp link; no tooltips or onboarding |
| **Total** | | **20/40** | **Acceptable** |

## Priority Issues

P0: Quiz dismissal/submission without confirmation — trust-destroying for limited-attempt quizzes
P1: Students cannot search or filter lessons — search gated behind !isStudentMode
P1: No focus traps in modals — WCAG failure for keyboard/screen reader users
P2: Post-registration limbo — no status tracking after submission
P2: Stat cards use identical blue icons — missed color differentiation opportunity

## Persona Red Flags

Jordan: Access code jargon, registration form cognitive overload, no business hours on WhatsApp
Casey: Featured course hero pushes lessons below fold, quiz questions hidden below fold on mobile, anti-piracy overlay triggers on every notification
أم أحمد: Zero parent visibility — no progress report, no shareable dashboard, no parent mode

## Minor Observations

- CheckCircle2 used for both quiz pass and fail
- EGYPT_GOVERNORATES inline in UI component (210 lines)
- Duplicate file preview modal implementations
- ProfileInfoRow text-left incorrect for RTL Arabic values
- Three coexisting primary blue hex values
- Gradient text on access screen hero (detector finding)
- Gray-on-color contrast issues (3 detector findings)

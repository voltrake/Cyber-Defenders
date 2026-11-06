# Cyber-Defenders

## Password Shield

Password Shield has two sections: Password Defender, which estimates the
strength of a sample password, and a sequential SQL investigation lab. The
lab's five missions unlock one at a time and use fictional data with a
restricted SQL console that accepts simple `SELECT` queries against
`login_events`, `access_audit`, and `threat_notes`. It does not connect to a
real database or allow data-changing SQL commands.

The final recovery exercise simulates blocking the suspicious address,
revoking active sessions, and replacing the affected account's password.
Lab progress and the detective name are kept in the current browser tab's
`sessionStorage`. Use sample passwords only; never enter a real account
password in the training pages.

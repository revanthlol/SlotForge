# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or include secrets, access tokens, private user records, or exploitable production details in a public thread.

Email [workofotb@gmail.com](mailto:workofotb@gmail.com) with:

- the affected component and version or commit;
- reproduction steps or a minimal proof of concept;
- potential impact;
- any suggested mitigation.

You should receive an acknowledgement within seven days. Please allow time to investigate and coordinate a fix before public disclosure.

## Supported version

Security fixes currently target the latest code on `dev` and the latest deployed release. Older commits are not maintained as separate supported versions.

## Deployment boundary

Never expose Supabase secret/service-role keys, PostgreSQL connection strings, Oracle SSH credentials, or deployment tokens to the frontend or repository. The public database export is structure-only and does not grant database access.

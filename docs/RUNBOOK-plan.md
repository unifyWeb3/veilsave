# RUNBOOK Release Plan

The final `RUNBOOK.md` must provide idempotent, identifier-bound procedures for:

- deployment input revalidation, rehearsal, source verification, role handoff, and activation;
- VRF funding, request observation, fulfillment synchronization, and terminal timeout;
- FHE draw retry with unchanged frozen inputs;
- winner public-decryption proof retry and 96-block finality observation;
- ACL propagation and winner user-decryption diagnosis;
- strategy settlement retry, exact balance reconciliation, rewrap routing, and loss mode;
- FIFO partial settlement and claim recovery;
- pause/unpause scopes and pause-safe exits;
- drained strategy replacement through the 24-hour timelock;
- manifest/code-hash, event, HCU/gas, and health checks;
- incident evidence collection without recording confidential plaintext or secrets.

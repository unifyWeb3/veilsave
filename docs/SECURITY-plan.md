# SECURITY Release Plan

The final `SECURITY.md` must include:

- supported release/network and responsible-disclosure contact;
- threat and trust models from the architecture specification;
- immutable configuration, Safe/timelock, guardian, and pause scopes;
- winner proof, ACL, replay, epoch, FIFO, settlement, overflow, and reentrancy controls;
- strategy insolvency/loss-mode behavior;
- VRF timeout/no-reroll behavior;
- relayer/KMS, RPC, frontend, wallet, and browser assumptions;
- audit/static-analysis/test evidence and unresolved risks;
- explicit statement that public transactions and winner identity are not anonymous.

The document may claim only controls demonstrated by code and release evidence.

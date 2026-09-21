# Security Specification & Test-Driven Hardening (TDD)

## 1. Data Invariants & Access Control Model

### A. Master Invariants
1. **Default Deny:** All collections and document paths are closed by default (`allow read, write: if false;`).
2. **Path Sanitization:** Every single-document target path ID must be strictly verified using `isValidId(id)` (`^[a-zA-Z0-9_\\-]+$`, `<= 128` chars).
3. **Immutability of System Fields:** Once written, `id`, `createdAt`, and `originalUrl` cannot be altered or falsified.
4. **Boundary & Size Limits:** Every incoming string must have a strict `.size()` bound (e.g., titles `<= 200`, descriptions `<= 4000`, tags list `<= 20` items).
5. **Tiered Access & Admin Safeguards:** The bootstrapped administrator (`KingGoddeth@gmail.com`) possesses administrative override authority. Authenticated users can read and manage team tasks, collaborators, and shortlinks. External task submission via the Quick-Submit portal is permitted only if strictly confined to the `inbox` workflow status with clean input shapes.
6. **No Shadow Fields:** Any update or create operation that includes unverified extra fields (ghost fields) must be rejected by exact key matching or `affectedKeys().hasOnly()`.

---

## 2. The "Dirty Dozen" Threat Vectors & Malicious Payloads

1. **PAYLOAD 1: Shadow Update (Ghost Field Injection)**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* Injecting unauthorized privilege or metadata flags `{ "isVerified": true, "isAdmin": true }` on task update.
   - *Expected:* `PERMISSION_DENIED`.

2. **PAYLOAD 2: Denial of Wallet (Oversized String Injection)**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* Injecting a 250KB garbage payload into `title` or `description`.
   - *Expected:* `PERMISSION_DENIED` (enforces `.size() <= 200` on title, `<= 4000` on description).

3. **PAYLOAD 3: Invalid Document Path Variable (ID Poisoning)**
   - *Target:* `/tasks/../../etc/passwd` or `/tasks/$$$invalid###`
   - *Attack:* Using an invalid regex pattern or oversized path variable.
   - *Expected:* `PERMISSION_DENIED` via `isValidId()`.

4. **PAYLOAD 4: Unauthenticated Arbitrary Read of Collaborator PII**
   - *Target:* `/collaborators/{collabId}`
   - *Attack:* Anonymous / unauthenticated `get` or `list` query to scrape team emails and department records.
   - *Expected:* `PERMISSION_DENIED`.

5. **PAYLOAD 5: Unauthenticated Task Deletion**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* An unauthenticated client issuing `deleteDoc` on an existing task.
   - *Expected:* `PERMISSION_DENIED`.

6. **PAYLOAD 6: Quick-Submit Privilege Escalation (Status Spoofing)**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* External submitter attempting to create a task with status `'approved'` or `'scheduled'` instead of `'inbox'`.
   - *Expected:* `PERMISSION_DENIED`.

7. **PAYLOAD 7: Quick-Submit Pre-Completion Exploit**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* External submitter creating a task with `completed: true`.
   - *Expected:* `PERMISSION_DENIED`.

8. **PAYLOAD 8: Immortality Breach (Tampering with createdAt)**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* Modifying `createdAt` timestamp on an existing task.
   - *Expected:* `PERMISSION_DENIED`.

9. **PAYLOAD 9: Unbounded Array Flooding (Denial of Service)**
   - *Target:* `/tasks/{taskId}`
   - *Attack:* Appending 5,000 tags into `tags` array.
   - *Expected:* `PERMISSION_DENIED` (enforces `tags.size() <= 20`).

10. **PAYLOAD 10: Counter Exploitation (Shortlink Click Tampering)**
    - *Target:* `/shortlinks/{linkId}`
    - *Attack:* Resetting `clicks` to 0 or decrementing click counter or setting a negative number.
    - *Expected:* `PERMISSION_DENIED` (enforces `incoming().clicks == existing().clicks + 1`).

11. **PAYLOAD 11: Arbitrary Collaborator Role Self-Elevation**
    - *Target:* `/collaborators/{collabId}`
    - *Attack:* Non-admin user promoting themselves to `role: 'admin'`.
    - *Expected:* `PERMISSION_DENIED`.

12. **PAYLOAD 12: Email Spoofing Attack**
    - *Target:* Admin endpoints
    - *Attack:* Authenticated client token claiming admin email with `email_verified: false`.
    - *Expected:* `PERMISSION_DENIED`.

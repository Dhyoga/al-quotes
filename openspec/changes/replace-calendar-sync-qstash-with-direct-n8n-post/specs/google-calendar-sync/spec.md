## MODIFIED Requirements

### Requirement: Sync jobs are delivered through a durable queue
The system SHALL publish outbound sync jobs by issuing a direct HTTP POST to the configured n8n webhook URL, rather than through Upstash QStash. Delivery is fire-and-forget: a failed request SHALL be logged and SHALL NOT be retried automatically, and SHALL NOT propagate an error into the Task/Habit/Event mutation that triggered it.

#### Scenario: Publish call posts directly to n8n
- **WHEN** the system publishes a sync job
- **THEN** it issues an HTTP POST directly to the configured n8n webhook URL with the sync payload as the JSON body and the shared secret in the `X-Webhook-Secret` header, without going through any intermediary queue

#### Scenario: Delivery failure does not retry and does not affect the triggering mutation
- **WHEN** the direct POST to the n8n webhook fails (network error, non-2xx response, or the webhook being temporarily unreachable)
- **THEN** the system logs the failure and does not retry the delivery, and the Task/Habit/Event mutation that triggered the sync job still succeeds

## MODIFIED Requirements

### Requirement: Comments on tasks
Authenticated users SHALL be able to create, edit, and delete comments on tasks they own. Every comment create, update, and delete SHALL publish a realtime event on the task owner's private channel, per the `realtime-sync` capability.

#### Scenario: Add a comment
- **WHEN** a user adds a comment with body text to a task they own
- **THEN** the system creates the comment, associates it with the task, and publishes a `comment.created` event to the task owner's private channel

#### Scenario: Edit a comment
- **WHEN** a user edits the body of a comment they previously created
- **THEN** the system updates the comment's body, the request succeeds, and a `comment.updated` event is published to the task owner's private channel

#### Scenario: Delete a comment
- **WHEN** a user deletes a comment they created
- **THEN** the system removes the comment, it no longer appears on the task, and a `comment.deleted` event carrying the comment's `id` and `taskId` is published to the task owner's private channel

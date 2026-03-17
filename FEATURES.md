# Features & Design Decisions

Self-contained, modular design with a focus on maintainability, scalability, and security. The project incorporates several key features and design decisions that contribute to its robustness and efficiency.

## Bun for runtime and tooling

The project uses Bun for application startup and local development scripts. This keeps the runtime simple and reduces external tooling overhead.

## Scalable Architecture

* Follows a modular architecture, with clear separation of concerns between different layers much like the MVC pattern. This allows for easier maintenance and scalability as the application grows, it is proven to be effective in large codebases from my experience where it easily supported hundreds of endpoints and complex business logic without becoming unmanageable.

* Utilized TSConfig path aliases to create a clean and intuitive import structure. This enhances code readability and maintainability by avoiding complex relative paths, making it easier for developers to navigate the codebase.

## Robust Validation

* UUID validation middleware ensures that all incoming requests with UUID parameters are properly validated, preventing malformed data from causing issues downstream. This is crucial for maintaining data integrity and security, especially in applications that rely heavily on UUIDs for identifying resources.

* Validate row existence middleware checks if the specified database rows exist before proceeding with the request, which helps to prevent errors and improve user experience by providing immediate feedback when resources are not found.

* The validation logic is centralized in a middleware function, making it reusable across different routes and reducing code duplication

## Comprehensive Error Handling

* Custom error classes and centralized error handling middleware provide a consistent way to handle errors across the application. This allows for better debugging and user feedback, as all errors are processed through a single point in the application.

## Security Best Practices

* Rate limiting middleware that utilized Redis to track request counts and enforce limits, which helps to protect the application from abuse and denial-of-service attacks.

* Signed webhooks on ingress and egress:
  * Incoming webhooks are verified with `x-pipeline-signature`, and outbound deliveries are signed with `x-delivery-sign`. This gives both sides a shared-secret verification model.
  * The use of HMAC signatures for webhook validation is a widely adopted security practice that provides a strong layer of protection against unauthorized access and data breaches.
  
* Limited raw webhook payload size:
    Incoming webhook bodies are limited to `256kb` for `application/json`. This reduces abuse risk and prevents oversized payloads from entering the pipeline.

## Performance Optimization

* Separate processing and delivery phases:
    Processing and outbound delivery are intentionally split into different workers. That separation keeps transformation concerns independent from network I/O, retry logic, and subscriber-specific failures.

* Event-driven workers instead of polling:
    Workers no longer wake up on fixed intervals to scan for work. They consume queue events immediately, which reduces idle DB load and shortens webhook-to-processing latency.

* Hybrid queue + database state model:
    BullMQ controls dispatch, delay, and retry timing, while Postgres remains the durable source of truth for workflow status and delivery history. This combines low-latency worker wakeups with strong auditability.

* Subscriber-level delivery retries:
    Delivery is modeled as one queue task per subscriber. A failing subscriber retries independently, so successful subscribers are not re-delivered on every retry cycle.

* BullMQ on top of existing Redis:
    The system now uses BullMQ for processor and delivery orchestration, backed by the Redis instance already required by the service. This avoided introducing a second broker and let us reuse existing operational tooling and infrastructure.

## Pipeline Chaining

* Pipelines can be chained together by providing a `nextPipelineId` and `outputPayload` in the processor response. This allows for complex workflows to be built by linking multiple pipelines together, enabling more advanced processing scenarios without requiring external orchestration.

* User can subscribe to any pipeline within the chain, not just the final result. This provides flexibility for users to consume intermediate outputs or final results as needed, without being forced to subscribe to the entire workflow.

* User can also hit the chain in the middle by posting to its webhook, rather than always starting at the beginning. This allows for more dynamic interactions with the pipelines, enabling users to trigger specific parts of the workflow as needed, rather than being constrained to a linear flow.

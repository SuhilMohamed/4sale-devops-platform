const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const opentelemetry = require('@opentelemetry/api');

// Create a resource to describe the service
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'task-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: '4sale',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  })
);

// Configure Jaeger exporter
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

// Initialize the OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable filesystem instrumentation for now
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          // Ignore health check and metrics endpoints
          return req.url?.includes('/health') || req.url?.includes('/metrics') || req.url?.includes('/ready');
        },
      },
      // Enable Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      // Enable PostgreSQL instrumentation
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Create a tracer for custom spans
const tracer = opentelemetry.trace.getTracer('task-api-tracer', '1.0.0');

// Gracefully shutdown the SDK
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = { tracer };

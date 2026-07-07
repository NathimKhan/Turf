class MockPaymentProvider {
  async charge({ amount, bookingId }) {
    return {
      status: "paid",
      reference: `MOCK-${bookingId}-${Date.now()}`,
      amount,
    };
  }

  async refund({ transactionId }) {
    return {
      status: "refunded",
      reference: `MOCK-REFUND-${transactionId}-${Date.now()}`,
    };
  }
}

function configuredPaymentProviderName() {
  return (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
}

function isDemoPaymentMode() {
  return ["mock", "demo", "test", "local"].includes(configuredPaymentProviderName());
}

function getPaymentProvider() {
  const providerName = configuredPaymentProviderName();

  if (isDemoPaymentMode()) {
    return { name: "mock", provider: new MockPaymentProvider() };
  }

  const error = new Error(`Unsupported payment provider: ${providerName}`);
  error.statusCode = 500;
  throw error;
}

module.exports = {
  configuredPaymentProviderName,
  getPaymentProvider,
  isDemoPaymentMode,
  MockPaymentProvider,
};

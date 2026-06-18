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

function getPaymentProvider() {
  const providerName = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();

  if (providerName === "mock") {
    return { name: "mock", provider: new MockPaymentProvider() };
  }

  const error = new Error(`Unsupported payment provider: ${providerName}`);
  error.statusCode = 500;
  throw error;
}

module.exports = {
  getPaymentProvider,
  MockPaymentProvider,
};

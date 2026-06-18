export function bookingQrPayload(booking, user) {
  return JSON.stringify({
    bookingId: booking.id,
    userId: booking.userId || booking.user?.id || booking.user?._id || user?.id || user?._id || "",
    venueId: booking.venueId || booking.turf?.id || booking.turf?._id || "",
    date: String(booking.dateValue || booking.bookingDate || booking.date || "").slice(0, 10),
    slot: `${booking.slotStartTime}-${booking.slotEndTime}`,
  });
}

export async function createBookingQr(booking, user) {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(bookingQrPayload(booking, user), {
    color: { dark: "#111827", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
  });
}

export async function downloadBookingPass(booking, user) {
  const { jsPDF } = await import("jspdf");
  const qrDataUrl = await createBookingQr(booking, user);
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const reference = booking.bookingReference || `BK-${booking.id.slice(-8).toUpperCase()}`;

  pdf.setFillColor(37, 99, 235);
  pdf.roundedRect(18, 16, 18, 18, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TX", 27, 27.5, { align: "center" });
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(22);
  pdf.text("TURFX", 42, 29);

  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(24);
  pdf.text("Venue Entry Pass", 18, 52);
  pdf.setFontSize(15);
  pdf.text(booking.venue, 18, 64);

  const rows = [
    ["Booking ID", booking.id],
    ["Booking reference", reference],
    ["User", user?.name || booking.user?.name || "TURFX Member"],
    ["Date", booking.date],
    ["Time", `${booking.slotStartTime} - ${booking.slotEndTime}`],
    ["Status", booking.status],
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  rows.forEach(([label, value], index) => {
    const y = 82 + index * 13;
    pdf.setTextColor(107, 114, 128);
    pdf.text(label, 18, y);
    pdf.setTextColor(17, 24, 39);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(value || "-"), 65, y);
    pdf.setFont("helvetica", "normal");
  });

  pdf.addImage(qrDataUrl, "PNG", 128, 72, 58, 58);
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(9);
  pdf.text("Scan this QR at the venue gate.", 157, 137, { align: "center" });
  pdf.setDrawColor(229, 231, 235);
  pdf.line(18, 165, 192, 165);
  pdf.setFontSize(10);
  pdf.text("This prototype pass is generated from the live booking record.", 18, 176);
  pdf.save(`TURFX-PASS-${booking.id}.pdf`);
}

export async function downloadPaymentReceipt(payment, user = {}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const transactionId = payment.paymentId || payment.transactionId || payment.id;
  const bookingId = payment.bookingReference || (payment.bookingIdValue ? `BK-${payment.bookingIdValue.slice(-8).toUpperCase()}` : "-");

  pdf.setFillColor(37, 99, 235);
  pdf.roundedRect(18, 16, 18, 18, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TX", 27, 27.5, { align: "center" });
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(22);
  pdf.text("TURFX", 42, 29);

  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(24);
  pdf.text("Payment Receipt", 18, 52);
  pdf.setFontSize(13);
  pdf.text(payment.venue || "TURFX Venue", 18, 64);

  const rows = [
    ["Transaction ID", transactionId],
    ["Booking ID", bookingId],
    ["User", user.name || payment.customerName || "TURFX Member"],
    ["Venue", payment.venue || "-"],
    ["Date", payment.date || "-"],
    ["Time", payment.time || "-"],
    ["Amount", `INR ${Number(payment.amount || 0).toLocaleString("en-IN")}`],
    ["Payment Method", payment.paymentMethod || "-"],
    ["Status", payment.status || payment.paymentStatus || "-"],
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  rows.forEach(([label, value], index) => {
    const y = 84 + index * 12;
    pdf.setTextColor(107, 114, 128);
    pdf.text(label, 18, y);
    pdf.setTextColor(17, 24, 39);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(value || "-"), 70, y);
    pdf.setFont("helvetica", "normal");
  });

  pdf.setDrawColor(229, 231, 235);
  pdf.line(18, 198, 192, 198);
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(10);
  pdf.text("This prototype receipt was generated from the TURFX mock payment transaction.", 18, 210);
  pdf.save(`TURFX-RECEIPT-${transactionId}.pdf`);
}

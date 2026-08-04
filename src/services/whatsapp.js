export async function sendWhatsAppMessage({
    phone,
    customerName,
    orderId,
    merchant,
    total,
}) {
    console.log("WhatsApp message simulation:");

    console.log({
        phone,
        customerName,
        orderId,
        merchant,
        total,
    });

    return {
        success: true,
        messageId: "test-message-id",
    };
}
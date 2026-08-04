export function orderCreatedTemplate(order) {
    return {
        name: "order_created",
        language: "en",
        variables: [
            order.customerFirstName,
            order.id,
            order.merchant.username,
            order.total,
        ],
    };
}
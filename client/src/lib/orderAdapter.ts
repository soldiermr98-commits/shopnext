import type { Order } from '../../shared/types';
import { paymentNames, utcDate, type ServerOrder } from './financialApi';
// Adapt naming only. Never calculate money or substitute demo monetary values.
export function orderAdapter(o: ServerOrder): Order {
  const a = o.shipping_address;
  return {
    id: String(o.id), orderNumber: o.order_number, trackingCode: o.tracking_code,
    status: o.status, paymentState: o.payment_state, paymentMethod: o.payment_method, paymentMethodName: paymentNames[o.payment_method] ?? o.payment_method,
    isPaid: o.payment_state === 'paid', totalPaid: o.total_paid, payableTotal: o.payable_total, roundingAdjustment: o.rounding_adjustment,
    invoiceData: o.invoice, subtotal: o.invoice?.totals.subtotal, couponDiscount: o.invoice?.totals.coupon_discount, itemsDiscount: o.invoice?.totals.items_discount, shippingFee: o.invoice?.totals.shipping_fee, vatAmount: o.invoice?.totals.vat_amount,
    customerName: a?.recipient_name, customerPhone: a?.recipient_phone,
    shippingAddress: { ...a, id: a?.id == null ? undefined : String(a.id), recipientName: a?.recipient_name, recipientPhone: a?.recipient_phone, streetAddress: a?.street_address, postalCode: a?.postal_code },
    items: o.items.map(l => ({ productId: String(l.product_id), variantId: l.variant_id == null ? undefined : String(l.variant_id), productTitle: l.title, productSku: l.sku, quantity: l.quantity, unitPrice: l.unit_price, finalPrice: l.line_total, lineTotal: l.line_total })),
    createdAt: utcDate(o.created_at), requiresOfficialTaxInvoice: false,
  } as Order;
}

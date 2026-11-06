import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdmin, OrderStatus, PaymentProvider } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";
import { RefundForm } from "./refund-form";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ status?: string; provider?: string; from?: string; to?: string }> };

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function OrdersPage({ searchParams }: Props) {
  const token = (await cookies()).get("veyrith_admin")?.value;
  const session = token ? await readSessionToken(token, "administrator") : null;
  if (!session) redirect("/login");
  const supabase = getSupabaseAdmin();
  const { data: administrator, error: adminError } = await supabase.from("Administrator").select("id").eq("id", session.sub).eq("isActive", true).maybeSingle();
  if (adminError) throw new Error(`Could not verify administrator session: ${adminError.message}`);
  if (!administrator) redirect("/login");

  const query = await searchParams;
  const statuses = Object.values(OrderStatus);
  const status = statuses.includes(query.status as (typeof statuses)[number]) ? query.status as (typeof statuses)[number] : undefined;
  const providers = Object.values(PaymentProvider);
  const provider = providers.includes(query.provider as PaymentProvider) ? query.provider as PaymentProvider : undefined;
  const from = parseDate(query.from);
  const to = parseDate(query.to, true);
  if ((query.from && !from) || (query.to && !to) || (from && to && from > to)) {
    return <main><h1>Invalid date filter</h1><p>Choose valid dates and ensure the start date is not after the end date.</p><a href="/orders">Clear filters</a></main>;
  }
  const { data: orderData, error: ordersError } = await supabase.from("Order").select("*").order("createdAt", { ascending: false }).limit(1000);
  if (ordersError) throw new Error(`Could not load orders: ${ordersError.message}`);
  const allFiltered = orderData.filter((order) =>
    (!status || order.status === status) &&
    (!provider || order.provider === provider) &&
    (!from || new Date(order.createdAt) >= from) &&
    (!to || new Date(order.createdAt) <= to),
  );
  const orderRows = allFiltered.slice(0, 100);
  const orderIds = [...new Set(allFiltered.map((order) => order.id))];
  const [customersResult, itemsResult, paymentsResult, refundsResult] = await Promise.all([
    orderRows.length ? supabase.from("Customer").select("id,email,name").in("id", [...new Set(orderRows.map((order) => order.customerId))]) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("OrderItem").select("id,orderId,productId,productName,quantity,platform").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("Payment").select("id,orderId,status,providerPaymentId,amountMinor").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("Refund").select("id,orderId,status,amountMinor,reason").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const loadError = customersResult.error ?? itemsResult.error ?? paymentsResult.error ?? refundsResult.error;
  if (loadError) throw new Error(`Could not load order details: ${loadError.message}`);
  const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer]));
  const allItems = itemsResult.data ?? [];
  const allPayments = paymentsResult.data ?? [];
  const allRefunds = refundsResult.data ?? [];
  const orders = orderRows.map((order) => ({
    ...order,
    customer: customers.get(order.customerId) ?? { email: "Unknown customer", name: null },
    items: allItems.filter((item) => item.orderId === order.id),
    payments: allPayments.filter((payment) => payment.orderId === order.id),
    refunds: allRefunds.filter((refund) => refund.orderId === order.id),
  }));
  const orderTotals = allFiltered.length;
  const statusCount = (value: (typeof statuses)[number]) => allFiltered.filter((order) => order.status === value).length;
  const filteredPaidIds = new Set(allFiltered.filter((order) => order.status === "PAID").map((order) => order.id));
  const productSalesMap = new Map<string, { productId: string; productName: string; quantity: number }>();
  for (const item of allItems) {
    if (!filteredPaidIds.has(item.orderId)) continue;
    const key = `${item.productId}:${item.productName}`;
    const sale = productSalesMap.get(key) ?? { productId: item.productId, productName: item.productName, quantity: 0 };
    sale.quantity += item.quantity;
    productSalesMap.set(key, sale);
  }
  const productSales = [...productSalesMap.values()];
  const capturedMinor = allPayments.filter((payment) => payment.status === "CAPTURED").reduce((sum, payment) => sum + payment.amountMinor, 0);
  const refundedMinor = allRefunds.filter((refund) => refund.status === "PROCESSED").reduce((sum, refund) => sum + refund.amountMinor, 0);
  const revenueMinor = capturedMinor - refundedMinor;

  return (
    <>
      <header><a href="/">Veyrith Labs CMS</a><nav><a href="/">Dashboard</a><a href="/products">Products</a></nav></header>
      <main>
        <h1>Orders and payments</h1>
        <p>Payment totals reflect recorded transactions only. Values shown are in INR.</p>
        <section className="stats">
          <div className="stat">Orders<strong>{orderTotals}</strong></div>
          <div className="stat">Successful payments<strong>{statusCount("PAID")}</strong></div>
          <div className="stat">Failed payments<strong>{statusCount("FAILED")}</strong></div>
          <div className="stat">Pending payments<strong>{statusCount("PENDING")}</strong></div>
          <div className="stat">Refunded orders<strong>{statusCount("REFUNDED") + statusCount("PARTIALLY_REFUNDED")}</strong></div>
          <div className="stat">Net captured revenue<strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(revenueMinor / 100)}</strong></div>
        </section>
        <form className="panel" method="get">
          <label>Status</label>
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
          <label>Payment provider</label>
          <select name="provider" defaultValue={provider ?? ""}>
            <option value="">All providers</option><option value="RAZORPAY">Razorpay</option><option value="PAYU">PayU</option>
          </select>
          <label>From</label><input name="from" type="date" defaultValue={query.from} />
          <label>To</label><input name="to" type="date" defaultValue={query.to} />
          <button type="submit">Apply filters</button>
        </form>
        <h2>Product-wise sales</h2>
        <section className="panel">
          {productSales.length === 0 ? <p>No successful product sales in this date range.</p> : productSales.map((sale) => (
            <p key={sale.productId}>{sale.productName}: {sale.quantity} unit(s)</p>
          ))}
        </section>
        <h2>Recent orders</h2>
        <section className="panel">
          {orders.length === 0 ? <p>No orders have been received.</p> : orders.map((order) => (
            <article key={order.id} style={{ borderBottom: "1px solid #dce2eb", padding: "16px 0" }}>
              <strong>{order.items.map((item) => item.productName).join(", ")}</strong>
              <p>{order.customer.name ?? order.customer.email} · {order.provider} · {order.status} · {new Intl.NumberFormat("en-IN", { style: "currency", currency: order.currency }).format(order.amountMinor / 100)}</p>
              <p>{order.items.map((item) => `${item.platform ?? "Licence"} × ${item.quantity}`).join(", ")} · {order.createdAt.toLocaleString()}</p>
              {order.payments.map((payment, index) => <p key={`${order.id}-payment-${index}`}>Payment {payment.status.toLowerCase()} {payment.providerPaymentId ? `(${payment.providerPaymentId})` : ""}</p>)}
              {order.refunds.map((refund, index) => <p key={`${order.id}-refund-${index}`}>Refund {refund.status.toLowerCase()} · {(refund.amountMinor / 100).toFixed(2)} INR{refund.reason ? ` · ${refund.reason}` : ""}</p>)}
              {["PAID", "PARTIALLY_REFUNDED"].includes(order.status) && (
                <RefundForm
                  orderId={order.id}
                  remainingMinor={Math.max(
                    0,
                    order.amountMinor - order.refunds
                      .filter((refund) => refund.status === "PENDING" || refund.status === "PROCESSED")
                      .reduce((sum, refund) => sum + refund.amountMinor, 0),
                  )}
                />
              )}
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

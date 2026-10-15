// One local Visa checkout for paid games, tournaments and publishing a field.
// Never collect or store real card details in this frontend prototype.
{
  const dialog = document.createElement("dialog");
  dialog.className = "kicks-checkout";
  dialog.setAttribute("aria-labelledby", "checkoutTitle");
  dialog.innerHTML = `<form method="dialog"><button class="checkout-close" aria-label="Close payment">×</button></form>
    <p class="checkout-eyebrow">KICKS CHECKOUT</p><h2 id="checkoutTitle">Pay with Visa</h2>
    <p id="checkoutDescription"></p>
    <div class="checkout-card"><strong>VISA</strong><span>•••• •••• •••• 4242</span><small>LOCAL SIMULATION</small></div>
    <div class="checkout-total"><span>Total</span><strong id="checkoutTotal"></strong></div>
    <p class="checkout-notice">No real payment is processed. No card details are collected.</p>
    <form method="dialog" class="checkout-actions"><button value="cancel">Cancel</button><button value="paid" class="checkout-pay">Simulate Visa payment</button></form>`;
  document.body.append(dialog);
  let waiting = null;
  dialog.addEventListener("close", () => {
    const resolve = waiting;
    waiting = null;
    if (resolve) resolve(dialog.returnValue === "paid" ? { method: "Visa demo", amount: Number(dialog.dataset.amount) } : null);
  });
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close("cancel"); });
  window.KicksCheckout = {
    open(amount, description) {
      if (waiting) return Promise.resolve(null);
      if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return Promise.reject(Error("Invalid payment amount."));
      if (Number(amount) === 0) return Promise.resolve({ method: "Free" });
      dialog.querySelector("#checkoutDescription").textContent = description;
      dialog.querySelector("#checkoutTotal").textContent = Number(amount).toFixed(2) + " JD";
      dialog.dataset.amount = amount;
      dialog.returnValue = "";
      dialog.showModal();
      return new Promise(resolve => { waiting = resolve; });
    }
  };
}

import { Transaction } from '../types';
import { formatCurrency, CURRENCIES } from './currency';

export function printReceipt(txn: Transaction) {
  const printWindow = window.open('', '_blank', 'width=700,height=900');
  if (!printWindow) {
    alert('Please allow popups to download or print the official transaction receipt.');
    return;
  }

  const dateFormatted = new Date(txn.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const currencyMeta = CURRENCIES[txn.currency];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt — ${txn.id} — AURELIS</title>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #F7F6F2;
            color: #111111;
            padding: 40px;
            display: flex;
            justify-content: center;
          }
          .receipt-box {
            background: #FFFFFF;
            width: 100%;
            max-width: 580px;
            border: 1px solid #E5E2D9;
            border-radius: 12px;
            padding: 48px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #E5E2D9;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .brand-title {
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            letter-spacing: 0.15em;
            color: #123C32;
            text-transform: uppercase;
            font-weight: 700;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #6F6F6A;
            letter-spacing: 0.05em;
            margin-top: 4px;
          }
          .status-badge {
            background: #EAF1ED;
            color: #123C32;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .amount-hero {
            text-align: center;
            margin: 32px 0 40px;
            padding: 24px;
            background: #FAF9F5;
            border-radius: 8px;
            border: 1px solid #EFECE5;
          }
          .amount-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #6F6F6A;
            margin-bottom: 6px;
          }
          .amount-value {
            font-family: 'Playfair Display', serif;
            font-size: 38px;
            font-weight: 700;
            color: #111111;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #F2EFE9;
            font-size: 14px;
          }
          .row-label {
            color: #6F6F6A;
          }
          .row-val {
            font-weight: 500;
            color: #111111;
            text-align: right;
          }
          .mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E5E2D9;
            font-size: 11px;
            color: #9E9E98;
            text-align: center;
            line-height: 1.6;
          }
          .seal {
            margin: 20px auto 0;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid #B69A62;
            color: #B69A62;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Playfair Display', serif;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div>
              <div class="brand-title">AURELIS</div>
              <div class="brand-subtitle">PRIVATE WEALTH & GLOBAL TRANSFERS</div>
            </div>
            <div class="status-badge">${txn.status}</div>
          </div>

          <div class="amount-hero">
            <div class="amount-label">Total Transaction Amount</div>
            <div class="amount-value">${formatCurrency(txn.amount, txn.currency, { showCode: true })}</div>
          </div>

          <div>
            <div class="row">
              <span class="row-label">Transaction Reference</span>
              <span class="row-val mono">${txn.id}</span>
            </div>
            <div class="row">
              <span class="row-label">Date & Time</span>
              <span class="row-val">${dateFormatted}</span>
            </div>
            <div class="row">
              <span class="row-label">Transaction Type</span>
              <span class="row-val" style="text-transform: capitalize;">${txn.type.replace('_', ' ')}</span>
            </div>
            ${txn.recipientName ? `
            <div class="row">
              <span class="row-label">Recipient / Payee</span>
              <span class="row-val">${txn.recipientName}</span>
            </div>
            ` : ''}
            ${txn.recipientEmail ? `
            <div class="row">
              <span class="row-label">Recipient Email</span>
              <span class="row-val mono">${txn.recipientEmail}</span>
            </div>
            ` : ''}
            ${txn.senderName ? `
            <div class="row">
              <span class="row-label">Sender</span>
              <span class="row-val">${txn.senderName}</span>
            </div>
            ` : ''}
            <div class="row">
              <span class="row-label">Payment Method</span>
              <span class="row-val">${txn.paymentMethod}</span>
            </div>
            ${txn.exchangeRate ? `
            <div class="row">
              <span class="row-label">Applied Exchange Rate</span>
              <span class="row-val mono">1 ${txn.sourceCurrency} = ${txn.exchangeRate} ${txn.destinationCurrency}</span>
            </div>
            <div class="row">
              <span class="row-label">Converted Amount</span>
              <span class="row-val mono">${formatCurrency(txn.destinationAmount || 0, txn.destinationCurrency)}</span>
            </div>
            ` : ''}
            <div class="row">
              <span class="row-label">Network / Transfer Fee</span>
              <span class="row-val">${txn.fee === 0 ? 'Complimentary ($0.00)' : formatCurrency(txn.fee, txn.currency)}</span>
            </div>
            ${txn.reference ? `
            <div class="row">
              <span class="row-label">Memo / Reference</span>
              <span class="row-val">${txn.reference}</span>
            </div>
            ` : ''}
            <div class="row" style="border-bottom: none; padding-top: 16px;">
              <span class="row-label" style="font-weight: 600; color: #111111;">Total Debited</span>
              <span class="row-val" style="font-weight: 700; font-size: 16px; color: #123C32;">${formatCurrency(txn.totalCharged || txn.amount, txn.currency, { showCode: true })}</span>
            </div>
          </div>

          <div class="footer">
            <div class="seal">A</div>
            <p style="margin-top: 14px;">This official electronic receipt is issued by AURELIS Global Private Wealth Systems.</p>
            <p>Cryptographically verified and archived in client permanent vault records.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function downloadReceiptJson(txn: Transaction) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(txn, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `AURELIS-Receipt-${txn.id}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatQty } from '@/lib/format-quantity';

/**
 * Generate a beautiful styled receipt HTML
 */
export function generateReceiptHTML(receipt: {
  receipt_number: string;
  timestamp: string;
  staff_name: string;
  payment_method: string;
  items: Array<{
    name: string;
    sale_quantity: number;
    price: number;
  }>;
  total_amount: number;
}): string {
  const dateTime = new Date(receipt.timestamp);
  const date = dateTime.toLocaleDateString();
  const time = dateTime.toLocaleTimeString();

  const itemsHTML = receipt.items
    .map(
      (item) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
      <span style="flex: 1; font-weight: 500;">${item.name}</span>
      <span style="width: 60px; text-align: center;">${formatQty(item.sale_quantity)}</span>
      <span style="width: 100px; text-align: right;">₦${(item.price * item.sale_quantity).toLocaleString()}</span>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt #${receipt.receipt_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .receipt-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            overflow: hidden;
          }
          .receipt-header {
            background: linear-gradient(to right, #ec4899, #be185d);
            color: white;
            padding: 32px 20px;
            text-align: center;
          }
          .receipt-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .receipt-header p {
            font-size: 14px;
            color: #fce7f3;
            font-weight: 600;
          }
          .receipt-body {
            padding: 24px 20px;
          }
          .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            background: #f9fafb;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .info-item {
            border-right: 1px solid #e5e7eb;
            padding-right: 16px;
          }
          .info-item:nth-child(2n) {
            border-right: none;
            padding-right: 0;
          }
          .info-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-top: 4px;
          }
          .items-section {
            border-top: 2px solid #fda4af;
            border-bottom: 2px solid #fda4af;
            margin-bottom: 24px;
            overflow: hidden;
          }
          .items-header {
            background: #f9fafb;
            padding: 12px 20px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            font-weight: 700;
            font-size: 12px;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .total-section {
            background: linear-gradient(to right, #fce7f3, #fbcfe8);
            border: 1px solid #fbdfe8;
            border-radius: 6px;
            padding: 24px;
            margin-bottom: 20px;
          }
          .total-label {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
            text-align: right;
          }
          .total-amount {
            font-size: 32px;
            font-weight: 700;
            color: #ec4899;
            text-align: right;
          }
          .receipt-footer {
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            color: #6b7280;
            font-size: 14px;
          }
          .receipt-footer .thank-you {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
          }
          .receipt-footer .footer-text {
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="receipt-header">
            <h1>ABIFRESH & KIDDIES VENTURES</h1>
            <p style="margin-bottom: 6px;">Receipt #${receipt.receipt_number}</p>
            <p style="font-size: 12px; color: #fce7f3;">Phone: +2349034016120 | Email: abifreshandkiddies@gmail.com</p>
          </div>

          <!-- Body -->
          <div class="receipt-body">
            <!-- Receipt Info -->
            <div class="receipt-info">
              <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${date}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Time</div>
                <div class="info-value">${time}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Staff</div>
                <div class="info-value">${receipt.staff_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Payment</div>
                <div class="info-value" style="text-transform: capitalize;">${receipt.payment_method}</div>
              </div>
            </div>

            <!-- Items -->
            <div class="items-section">
              <div class="items-header">
                <span style="flex: 1;">Item</span>
                <span style="width: 60px; text-align: center;">Qty</span>
                <span style="width: 100px; text-align: right;">Total</span>
              </div>
              ${itemsHTML}
            </div>

            <!-- Total -->
            <div class="total-section">
              <div class="total-label">Amount Due</div>
              <div class="total-amount">₦${receipt.total_amount.toLocaleString()}</div>
            </div>

            <!-- Footer -->
            <div class="receipt-footer">
              <div class="thank-you">Thank you for your purchase!</div>
              <div class="footer-text">Visit us again soon</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Print a receipt with beautiful styling
 */
export async function printReceipt(receipt: {
  receipt_number: string;
  timestamp: string;
  staff_name: string;
  payment_method: string;
  items: Array<{
    name: string;
    sale_quantity: number;
    price: number;
  }>;
  total_amount: number;
}) {
  try {
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = generateReceiptHTML(receipt);
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '600px';
    tempContainer.style.background = 'white';
    document.body.appendChild(tempContainer);

    // Convert to canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Open print window
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      const imgData = canvas.toDataURL('image/png');
      const html = `
        <html>
          <head>
            <title>Receipt #${receipt.receipt_number}</title>
            <style>
              body { margin: 0; padding: 20px; background: #f5f5f5; }
              img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
            </style>
          </head>
          <body>
            <img src="${imgData}" />
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }

    // Clean up
    document.body.removeChild(tempContainer);
  } catch (error) {
    console.error('Error printing receipt:', error);
    alert('Failed to print receipt. Please try again.');
  }
}

/**
 * Download a receipt as PDF with beautiful styling
 */
export async function downloadReceiptAsPDF(receipt: {
  receipt_number: string;
  timestamp: string;
  staff_name: string;
  payment_method: string;
  items: Array<{
    name: string;
    sale_quantity: number;
    price: number;
  }>;
  total_amount: number;
}) {
  try {
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = generateReceiptHTML(receipt);
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '600px';
    tempContainer.style.background = 'white';
    document.body.appendChild(tempContainer);

    // Convert to canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Download
    pdf.save(`receipt_${receipt.receipt_number}.pdf`);

    // Clean up
    document.body.removeChild(tempContainer);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    alert('Failed to download receipt. Please try again.');
  }
}

/**
 * Download a receipt as PNG image with beautiful styling
 */
export async function downloadReceiptAsImage(receipt: {
  receipt_number: string;
  timestamp: string;
  staff_name: string;
  payment_method: string;
  items: Array<{
    name: string;
    sale_quantity: number;
    price: number;
  }>;
  total_amount: number;
}) {
  try {
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = generateReceiptHTML(receipt);
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '600px';
    tempContainer.style.background = 'white';
    document.body.appendChild(tempContainer);

    // Convert to canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Download as PNG
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `receipt_${receipt.receipt_number}.png`;
    link.click();

    // Clean up
    document.body.removeChild(tempContainer);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    alert('Failed to download receipt. Please try again.');
  }
}

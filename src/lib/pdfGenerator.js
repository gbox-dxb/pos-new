import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateOrderPDF = (order) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const formatAddress = (address, includeName = true) => {
    if (!address) return 'N/A';
    const parts = [];
    if (includeName) {
      parts.push(`${address.first_name || ''} ${address.last_name || ''}`.trim());
    }
    parts.push(address.company, address.address_1, address.address_2, `${address.city || ''}, ${address.state || ''} ${address.postcode || ''}`.trim(), address.country);

    return parts.filter(Boolean).filter(p => p.trim() !== ',').join('\n');
  };

  const billingName = `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim();
  const billingPhone = order.billing.phone || 'N/A';

  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 14, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 14, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(order.date_created), 30, 35);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GBox FZE', pageWidth - 14, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', pageWidth - 70, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(billingName, pageWidth - 14, 35, { align: 'right' });
  doc.text(billingPhone, pageWidth - 14, 40, { align: 'right' });


  doc.setDrawColor(124, 107, 159);
  doc.setLineWidth(0.5);
  doc.line(14, 48, pageWidth - 14, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('BILLING ADDRESS', 14, 58);
  doc.text('SHIPPING ADDRESS', pageWidth / 2, 58);
  doc.setFont('helvetica', 'normal');

  doc.autoTable({
    startY: 62,
    body: [[formatAddress(order.billing, false), formatAddress(order.shipping)]],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 0,
    },
    columnStyles: {
      0: { cellWidth: (pageWidth / 2) - 20 },
      1: { cellWidth: (pageWidth / 2) - 20 },
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto'
  });

  let finalY = doc.lastAutoTable.finalY;

  const items = order.line_items.map(item => [
    `${item.name}\nSKU: ${item.sku || 'N/A'}`,
    item.quantity,
    formatCurrency(item.price, order.currency),
    formatCurrency(item.total, order.currency)
  ]);

  doc.autoTable({
    startY: finalY + 15,
    head: [['Items Description', 'QTY', 'Unit Price', 'Total Price']],
    body: items,
    theme: 'striped',
    headStyles: {
      fillColor: [124, 107, 159],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  finalY = doc.lastAutoTable.finalY;

  const totalsData = [
    ['Subtotal', formatCurrency(order.total - order.total_tax - order.shipping_total, order.currency)],
    ['Tax', formatCurrency(order.total_tax, order.currency)],
  ];

  if (parseFloat(order.shipping_total) > 0) {
    totalsData.push(['Shipping', formatCurrency(order.shipping_total, order.currency)]);
  }

  if (parseFloat(order.discount_total) > 0) {
    totalsData.push(['Discount', `-${formatCurrency(order.discount_total, order.currency)}`]);
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DUE', 14, finalY + 20);
  doc.setFontSize(22);
  doc.setTextColor(124, 107, 159);
  doc.text(formatCurrency(order.total, order.currency), 14, finalY + 30);
  doc.setTextColor(0);

  doc.autoTable({
    startY: finalY + 10,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      halign: 'right'
    },
    columnStyles: {
      0: { fontStyle: 'normal', halign: 'right' }
    },
    tableWidth: 'wrap',
    margin: { left: pageWidth - 100 },
  });

  if (order.customer_note) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Note:', 14, pageHeight - 35);
    doc.setFont('helvetica', 'normal');
    const splitNote = doc.splitTextToSize(order.customer_note, pageWidth - 30);
    doc.text(splitNote, 14, pageHeight - 30);
  }

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Thank you for your business! | Order #${order.id} from ${order.store_name}`, 14, pageHeight - 10);

  doc.save(`Invoice-Order-${order.id}.pdf`);
};
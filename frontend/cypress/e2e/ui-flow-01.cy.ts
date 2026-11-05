import { chooseOption, mockAuthApi, visitAuthenticated } from '../support/mockApi';

type SalesOrderLine = {
  id: number;
  itemId: number;
  qtyOrdered: string;
  qtyShipped: string;
  qtyInvoiced: string;
  unitPrice: string;
};

type SalesOrder = {
  id: number;
  soNumber: string;
  partnerId: number;
  orderDate: string;
  status: string;
  lines: SalesOrderLine[];
};

type Delivery = {
  id: number;
  deliveryNumber: string;
  postingDate: string;
  status: string;
  lines: Array<{ id: number; itemId: number; qtyShipped: string; unitCost: string }>;
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  partnerId: number;
  postingDate: string;
  status: string;
  goodsAmount: string;
  vatAmount: string;
  grossAmount: string;
  cogsAmount: string;
  openBalance: string;
  lines: Array<{
    id: number;
    itemId: number;
    qty: string;
    lineNet: string;
    lineVat: string;
    lineCogs: string;
  }>;
};

describe('UI-FLOW-01 - Realizacja sprzedaży', () => {
  it('creates an order, posts its delivery and invoice, and opens the printable invoice', () => {
    let order: SalesOrder | null = null;
    let delivery: Delivery | null = null;
    let invoice: Invoice | null = null;

    mockAuthApi();

    cy.intercept('GET', '**/api/masterdata/partners*', {
      statusCode: 200,
      body: [{ id: 1, code: 'C-CY-01', name: 'Cypress Customer' }],
    });
    cy.intercept('GET', '**/api/masterdata/items', {
      statusCode: 200,
      body: [{ id: 1, sku: 'SKU-CY-01', name: 'Cypress Widget', itemType: 'FINISHED_GOOD' }],
    });
    cy.intercept('GET', '**/api/masterdata/locations*', {
      statusCode: 200,
      body: [{ id: 1, code: 'MAIN-CY', locationType: 'STOCK' }],
    });

    cy.intercept('GET', '**/api/sales/sales-orders', (request) => {
      request.reply({ statusCode: 200, body: order ? [order] : [] });
    });
    cy.intercept('GET', '**/api/sales/sales-orders/*', (request) => {
      request.reply({ statusCode: 200, body: order ?? {} });
    });
    cy.intercept('POST', '**/api/sales/sales-orders', (request) => {
      const body = request.body as {
        partnerId: number;
        orderDate: string;
        lines: Array<{ itemId: number; qtyOrdered: string; unitPrice: string }>;
      };
      order = {
        id: 101,
        soNumber: 'SO-CY-01',
        partnerId: body.partnerId,
        orderDate: body.orderDate,
        status: 'DRAFT',
        lines: body.lines.map((line, index) => ({
          id: 1010 + index,
          itemId: line.itemId,
          qtyOrdered: line.qtyOrdered,
          qtyShipped: '0',
          qtyInvoiced: '0',
          unitPrice: line.unitPrice,
        })),
      };
      request.reply({ statusCode: 201, body: order });
    }).as('createOrder');
    cy.intercept('POST', '**/api/sales/sales-orders/*/confirm', (request) => {
      if (order) order = { ...order, status: 'CONFIRMED' };
      request.reply({ statusCode: 200, body: order });
    }).as('confirmOrder');

    cy.intercept('GET', '**/api/sales/deliveries', (request) => {
      request.reply({ statusCode: 200, body: delivery ? [delivery] : [] });
    });
    cy.intercept('GET', '**/api/sales/deliveries/*', (request) => {
      request.reply({ statusCode: 200, body: delivery ?? {} });
    });
    cy.intercept('POST', '**/api/sales/deliveries', (request) => {
      const body = request.body as {
        postingDate: string;
        lines: Array<{ qty: string }>;
      };
      delivery = {
        id: 201,
        deliveryNumber: 'DN-CY-01',
        postingDate: body.postingDate,
        status: 'POSTED',
        lines: [{ id: 2010, itemId: 1, qtyShipped: body.lines[0]?.qty ?? '2', unitCost: '10' }],
      };
      if (order) {
        order = {
          ...order,
          status: 'SHIPPED',
          lines: order.lines.map((line) => ({ ...line, qtyShipped: line.qtyOrdered })),
        };
      }
      request.reply({ statusCode: 201, body: delivery });
    }).as('postDelivery');

    cy.intercept('GET', '**/api/sales/sales-invoices', (request) => {
      request.reply({ statusCode: 200, body: invoice ? [invoice] : [] });
    });
    cy.intercept('GET', '**/api/sales/sales-invoices/*', (request) => {
      request.reply({ statusCode: 200, body: invoice ?? {} });
    });
    cy.intercept('POST', '**/api/sales/sales-invoices', (request) => {
      invoice = {
        id: 301,
        invoiceNumber: 'INV-CY-01',
        partnerId: 1,
        postingDate: '2026-01-15',
        status: 'POSTED',
        goodsAmount: '50',
        vatAmount: '10',
        grossAmount: '60',
        cogsAmount: '20',
        openBalance: '60',
        lines: [{ id: 3010, itemId: 1, qty: '2', lineNet: '50', lineVat: '10', lineCogs: '20' }],
      };
      request.reply({ statusCode: 201, body: invoice });
    }).as('postInvoice');

    visitAuthenticated('/sales?tab=orders');

    cy.contains('button', 'New sales order').click();
    chooseOption('Customer', 'C-CY-01 — Cypress Customer');
    chooseOption('Item', 'SKU-CY-01 — Cypress Widget');
    cy.contains('label', 'Qty').parent().find('input').type('2');
    cy.contains('label', 'Unit price').parent().find('input').type('25');
    cy.contains('[role="dialog"] button', 'Create').click();
    cy.wait('@createOrder');
    cy.contains('button', 'Confirm order').should('be.visible').click();
    cy.wait('@confirmOrder');
    cy.contains('Sales order confirmed').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');

    cy.contains('[role="tab"]', 'Deliveries').click();
    cy.contains('button', 'New delivery').click();
    chooseOption('Sales order', 'SO-CY-01');
    chooseOption('Ship-from location', 'MAIN-CY (Stock)');
    cy.get('[role="dialog"] table tbody input').first().type('2');
    cy.contains('[role="dialog"] button', 'Post delivery').click();
    cy.wait('@postDelivery');
    cy.contains('Delivery DN-CY-01').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');

    cy.contains('[role="tab"]', 'Invoices').click();
    cy.contains('button', 'New invoice').click();
    chooseOption('Sales order', 'SO-CY-01');
    cy.contains('[role="dialog"] button', 'Post invoice').click();
    cy.wait('@postInvoice');
    cy.contains('Invoice INV-CY-01').should('be.visible');
    cy.get('[role="dialog"]').contains('button', 'Print').click();

    cy.location('pathname').should('eq', '/print/sales-invoice/301');
    cy.contains('INV-CY-01').should('be.visible');
    cy.contains('C-CY-01 — Cypress Customer').should('be.visible');
    cy.contains('SKU-CY-01 — Cypress Widget').should('be.visible');
  });
});

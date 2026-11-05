import { chooseOption, mockAuthApi, visitAuthenticated } from '../support/mockApi';

type PurchaseOrder = {
  id: number;
  poNumber: string;
  partnerId: number;
  orderDate: string;
  status: string;
  lines: Array<{
    id: number;
    itemId: number;
    qtyOrdered: string;
    qtyReceived: string;
    qtyBilled: string;
    unitPrice: string;
  }>;
};

type GoodsReceipt = {
  id: number;
  grnNumber: string;
  purchaseOrderId: number;
  postingDate: string;
  status: string;
  lines: Array<{
    id: number;
    itemId: number;
    qtyReceived: string;
    unitCost: string;
    journalEntryId: number;
  }>;
};

describe('UI-PUR-01 - Zamowienie zakupu i przyjecie dostawy', () => {
  it('confirms a purchase order and posts a goods receipt against it', () => {
    let purchaseOrder: PurchaseOrder | null = null;
    let goodsReceipt: GoodsReceipt | null = null;

    mockAuthApi();
    cy.intercept('GET', '**/api/masterdata/partners*', {
      statusCode: 200,
      body: [{ id: 51, code: 'V-CY-01', name: 'Cypress Vendor', vendor: true }],
    });
    cy.intercept('GET', '**/api/masterdata/items', {
      statusCode: 200,
      body: [{ id: 52, sku: 'RM-CY-01', name: 'Raw Material', itemType: 'RAW' }],
    });
    cy.intercept('GET', '**/api/masterdata/locations*', {
      statusCode: 200,
      body: [{ id: 53, code: 'STOCK-PUR-CY', locationType: 'STOCK' }],
    });

    cy.intercept('GET', '**/api/purchasing/purchase-orders', (request) => {
      request.reply({ statusCode: 200, body: purchaseOrder ? [purchaseOrder] : [] });
    });
    cy.intercept('GET', '**/api/purchasing/purchase-orders/*', (request) => {
      request.reply({ statusCode: 200, body: purchaseOrder ?? {} });
    });
    cy.intercept('POST', '**/api/purchasing/purchase-orders', (request) => {
      const body = request.body as {
        partnerId: number;
        orderDate: string;
        lines: Array<{ itemId: number; qtyOrdered: string; unitPrice: string }>;
      };
      purchaseOrder = {
        id: 61,
        poNumber: 'PO-CY-01',
        partnerId: body.partnerId,
        orderDate: body.orderDate,
        status: 'DRAFT',
        lines: body.lines.map((line) => ({
          id: 611,
          itemId: line.itemId,
          qtyOrdered: line.qtyOrdered,
          qtyReceived: '0',
          qtyBilled: '0',
          unitPrice: line.unitPrice,
        })),
      };
      request.reply({ statusCode: 201, body: purchaseOrder });
    }).as('createPurchaseOrder');
    cy.intercept('POST', '**/api/purchasing/purchase-orders/*/confirm', (request) => {
      if (purchaseOrder) purchaseOrder = { ...purchaseOrder, status: 'CONFIRMED' };
      request.reply({ statusCode: 200, body: purchaseOrder ?? {} });
    }).as('confirmPurchaseOrder');

    cy.intercept('GET', '**/api/purchasing/goods-receipts', (request) => {
      request.reply({ statusCode: 200, body: goodsReceipt ? [goodsReceipt] : [] });
    });
    cy.intercept('GET', '**/api/purchasing/goods-receipts/*', (request) => {
      request.reply({ statusCode: 200, body: goodsReceipt ?? {} });
    });
    cy.intercept('POST', '**/api/purchasing/goods-receipts', (request) => {
      const body = request.body as {
        purchaseOrderId: number;
        stockLocationId: number;
        lines: Array<{ poLineId: number; qty: string }>;
      };
      goodsReceipt = {
        id: 71,
        grnNumber: 'GRN-CY-01',
        purchaseOrderId: body.purchaseOrderId,
        postingDate: '2026-10-15',
        status: 'POSTED',
        lines: body.lines.map((line, index) => ({
          id: 711 + index,
          itemId: 52,
          qtyReceived: line.qty,
          unitCost: '12.50',
          journalEntryId: 801,
        })),
      };
      if (purchaseOrder) {
        purchaseOrder = {
          ...purchaseOrder,
          status: 'RECEIVED',
          lines: purchaseOrder.lines.map((line) => ({
            ...line,
            qtyReceived: line.qtyOrdered,
          })),
        };
      }
      request.reply({ statusCode: 201, body: goodsReceipt });
    }).as('postGoodsReceipt');

    visitAuthenticated('/purchasing?tab=orders');

    cy.contains('button', 'New purchase order').click();
    chooseOption('Vendor', 'V-CY-01 — Cypress Vendor');
    chooseOption('Item', 'RM-CY-01 — Raw Material');
    cy.contains('label', 'Qty').parent().find('input').type('4');
    cy.contains('label', 'Unit price').parent().find('input').type('12.50');
    cy.contains('[role="dialog"] button', 'Create').click();
    cy.wait('@createPurchaseOrder').then(({ request }) => {
      expect(request.body.partnerId).to.equal(51);
      expect(request.body.lines).to.deep.equal([
        { itemId: 52, qtyOrdered: '4', unitPrice: '12.50' },
      ]);
    });

    cy.contains('[role="dialog"] button', 'Confirm order').click();
    cy.wait('@confirmPurchaseOrder');
    cy.contains('Purchase order confirmed').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');

    cy.contains('[role="tab"]', 'Goods receipts').click();
    cy.contains('button', 'New goods receipt').click();
    chooseOption('Purchase order', 'PO-CY-01');
    chooseOption('Stock location', 'STOCK-PUR-CY (Stock)');
    cy.get('[role="dialog"] table tbody input').first().type('4');
    cy.contains('[role="dialog"] button', 'Post receipt').click();
    cy.wait('@postGoodsReceipt').then(({ request }) => {
      expect(request.body).to.include({ purchaseOrderId: 61, stockLocationId: 53 });
      expect(request.body.lines).to.deep.equal([{ poLineId: 611, qty: '4' }]);
    });

    cy.contains('Goods receipt GRN-CY-01').should('be.visible');
    cy.contains('[role="dialog"]', 'Posted').should('be.visible');
    cy.contains('[role="dialog"]', 'Raw Material').should('be.visible');
    cy.contains('[role="dialog"]', '12.50').should('be.visible');
    cy.contains('[role="dialog"]', 'JE #801').should('be.visible');
  });
});

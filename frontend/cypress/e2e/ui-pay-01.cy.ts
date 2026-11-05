import { chooseOption, mockAuthApi, visitAuthenticated } from '../support/mockApi';

type Invoice = {
  id: number;
  invoiceNumber: string;
  partnerId: number;
  status: string;
  goodsAmount: string;
  vatAmount: string;
  grossAmount: string;
  amountReceived: string;
  openBalance: string;
};

type Receipt = {
  id: number;
  payNumber: string;
  partnerId: number;
  amount: string;
  direction: string;
  status: string;
  journalEntryId: number;
  allocations: Array<{ id: number; documentId: number; amount: string }>;
};

describe('UI-PAY-01 - Wplata klienta i alokacja', () => {
  it('posts a partial receipt, allocates it to an invoice, and updates the invoice balance', () => {
    let invoice: Invoice = {
      id: 501,
      invoiceNumber: 'INV-CY-PAY-01',
      partnerId: 61,
      status: 'POSTED',
      goodsAmount: '50',
      vatAmount: '10',
      grossAmount: '60',
      amountReceived: '0',
      openBalance: '60',
    };
    let receipt: Receipt | null = null;

    mockAuthApi();

    cy.intercept('GET', '**/api/masterdata/partners*', {
      statusCode: 200,
      body: [{ id: 61, code: 'C-CY-PAY', name: 'Payment Customer', customer: true }],
    });
    cy.intercept('GET', '**/api/sales/sales-invoices', (request) => {
      request.reply({ statusCode: 200, body: [invoice] });
    });
    cy.intercept('GET', '**/api/payments*', (request) => {
      request.reply({ statusCode: 200, body: receipt ? [receipt] : [] });
    });
    cy.intercept('GET', '**/api/payments/*', (request) => {
      request.reply({ statusCode: 200, body: receipt ?? {} });
    });
    cy.intercept('POST', '**/api/payments/in', (request) => {
      const body = request.body as {
        partnerId: number;
        amount: string;
        allocations: Array<{ invoiceId: number; amount: string }>;
      };
      expect(body).to.deep.include({
        partnerId: 61,
        amount: '20.0000',
        allocations: [{ invoiceId: 501, amount: '20' }],
      });

      invoice = {
        ...invoice,
        amountReceived: '20',
        openBalance: '40',
        status: 'PARTIALLY_PAID',
      };
      receipt = {
        id: 601,
        payNumber: 'RC-CY-01',
        partnerId: body.partnerId,
        amount: body.amount,
        direction: 'IN',
        status: 'POSTED',
        journalEntryId: 901,
        allocations: [{ id: 611, documentId: 501, amount: '20' }],
      };
      request.reply({ statusCode: 201, body: receipt });
    }).as('postReceipt');

    visitAuthenticated('/sales?tab=receipts');

    cy.contains('button', 'New receipt').click();
    chooseOption('Customer', 'C-CY-PAY — Payment Customer');
    cy.contains('[role="dialog"]', 'INV-CY-PAY-01').should('be.visible');
    cy.get('[role="dialog"] input[aria-label="INV-CY-PAY-01"]').type('20');
    cy.contains('[role="dialog"]', '20.00').should('be.visible');
    cy.contains('[role="dialog"] button', 'Post receipt').click();
    cy.wait('@postReceipt').then(({ request }) => {
      expect(request.body.amount).to.equal('20.0000');
    });

    cy.contains('Receipt RC-CY-01 posted').should('be.visible');
    cy.contains('[role="dialog"]', 'Posted').should('be.visible');
    cy.contains('[role="dialog"]', '20.00').should('be.visible');
    cy.contains('[role="dialog"]', '501').should('be.visible');

    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
    cy.contains('[role="tab"]', 'Invoices').click();
    cy.contains('tr', 'INV-CY-PAY-01').should('contain.text', 'Partially settled');
    cy.contains('tr', 'INV-CY-PAY-01').should('contain.text', '40.00');
  });
});

import { chooseOption, mockAuthApi, visitAuthenticated } from '../support/mockApi';

type Payroll = {
  id: number;
  periodYear: number;
  periodMonth: number;
  status: 'DRAFT' | 'POSTED';
  grossTotal: string;
  taxTotal: string;
  insuranceTotal: string;
  netTotal: string;
  journalEntryId?: number;
  lines: Array<{
    id: number;
    employeeId: number;
    gross: string;
    tax: string;
    insurance: string;
    net: string;
  }>;
};

describe('UI-HR-02 - Lista plac', () => {
  it('runs payroll for a period and posts it to the ledger', () => {
    let payroll: Payroll | null = null;

    mockAuthApi();
    cy.intercept('GET', '**/api/hr/employees', {
      statusCode: 200,
      body: [{ id: 17, code: 'EMP-CY-PAY', firstName: 'Jan', lastName: 'Payroll' }],
    });
    cy.intercept('GET', '**/api/hr/payroll', (request) => {
      request.reply({ statusCode: 200, body: payroll ? [payroll] : [] });
    });
    cy.intercept('POST', '**/api/hr/payroll', (request) => {
      expect(request.body).to.deep.equal({ year: 2026, month: 10 });
      payroll = {
        id: 71,
        periodYear: 2026,
        periodMonth: 10,
        status: 'DRAFT',
        grossTotal: '1000',
        taxTotal: '60',
        insuranceTotal: '50',
        netTotal: '890',
        lines: [
          {
            id: 711,
            employeeId: 17,
            gross: '1000',
            tax: '60',
            insurance: '50',
            net: '890',
          },
        ],
      };
      request.reply({ statusCode: 201, body: payroll });
    }).as('runPayroll');
    cy.intercept('POST', '**/api/hr/payroll/*/post', (request) => {
      if (payroll) payroll = { ...payroll, status: 'POSTED', journalEntryId: 901 };
      request.reply({ statusCode: 200, body: payroll ?? {} });
    }).as('postPayroll');

    visitAuthenticated('/hr?tab=payroll');

    cy.contains('button', 'Run payroll').click();
    cy.contains('label', 'Year').parent().find('input').clear().type('2026');
    chooseOption('Month', '10');
    cy.contains('[role="dialog"] button', 'Run payroll').click();
    cy.wait('@runPayroll');
    cy.contains('tr', '2026-10').should('contain.text', 'Draft');
    cy.contains('tr', '2026-10').should('contain.text', '1,000.00');
    cy.contains('tr', '2026-10').within(() => {
      cy.contains('button', 'Post').click();
    });
    cy.wait('@postPayroll');

    cy.contains('Payroll posted to the ledger').should('be.visible');
    cy.contains('tr', '2026-10').should('contain.text', 'Posted');
    cy.contains('tr', '2026-10').should('contain.text', '#901');
  });
});

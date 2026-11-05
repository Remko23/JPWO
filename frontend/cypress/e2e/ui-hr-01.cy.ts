import { mockAuthApi, visitAuthenticated, chooseOption } from '../support/mockApi';

type LeaveRequest = {
  id: number;
  employeeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: string;
  status: string;
  decidedBy: string | null;
};

describe('UI-HR-01 - Wniosek urlopowy', () => {
  it('files a leave request and approves it', () => {
    let leaveRequest: LeaveRequest | null = null;

    mockAuthApi();
    cy.intercept('GET', '**/api/hr/employees', {
      statusCode: 200,
      body: [{ id: 7, code: 'EMP-CY-01', firstName: 'Zielony', lastName: 'Ninja' }],
    });
    cy.intercept('GET', '**/api/hr/leave-requests*', (request) => {
      request.reply({ statusCode: 200, body: leaveRequest ? [leaveRequest] : [] });
    });
    cy.intercept('POST', '**/api/hr/leave-requests', (request) => {
      const body = request.body as {
        employeeId: number;
        leaveType: string;
        startDate: string;
        endDate: string;
        days: string;
      };
      leaveRequest = {
        id: 71,
        employeeId: body.employeeId,
        leaveType: body.leaveType,
        startDate: body.startDate,
        endDate: body.endDate,
        days: body.days,
        status: 'PENDING',
        decidedBy: null,
      };
      request.reply({ statusCode: 201, body: leaveRequest });
    }).as('fileLeave');
    cy.intercept('POST', '**/api/hr/leave-requests/*/approve', (request) => {
      if (leaveRequest) leaveRequest = { ...leaveRequest, status: 'APPROVED', decidedBy: 'admin' };
      request.reply({ statusCode: 200, body: leaveRequest ?? {} });
    }).as('approveLeave');

    visitAuthenticated('/hr?tab=leave');

    cy.contains('button', 'File leave request').click();
    chooseOption('Employee', 'EMP-CY-01 — Zielony Ninja');
    cy.contains('label', 'Reason').parent().find('textarea').type('Cypress test leave request');
    cy.contains('[role="dialog"] button', 'Create').click();
    cy.wait('@fileLeave');

    cy.contains('tr', 'Zielony Ninja').should('contain.text', 'Pending');
    cy.contains('tr', 'Zielony Ninja').within(() => {
      cy.contains('button', 'Approve').click();
    });
    cy.wait('@approveLeave');
    cy.contains('Leave request approved').should('be.visible');
    cy.contains('tr', 'Zielony Ninja').should('contain.text', 'Approved');
  });
});

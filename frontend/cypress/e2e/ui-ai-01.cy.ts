import { mockAuthApi, visitAuthenticated } from '../support/mockApi';

type ChatRequest = {
  messages: Array<{ role: string; content: Array<Record<string, unknown>> }>;
  decision?: { toolUseId: string; approved: boolean };
};

function sseBody(frames: Array<[string, unknown]>) {
  return frames.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
}

const PROPOSAL = sseBody([
  ['text_delta', { text: 'I prepared a sales order for your review.' }],
  [
    'awaiting_confirmation',
    { id: 'tool-order-1', name: 'create_sales_order', input: { customer: 'Cypress Customer', quantity: 2 } },
  ],
  ['done', { stopReason: 'awaiting_confirmation' }],
]);

const COMPLETED = sseBody([
  ['tool_result', { id: 'tool-order-1', ok: true, result: '{"salesOrderId":42}' }],
  ['text_delta', { text: 'The sales order was created.' }],
  ['done', { stopReason: 'end_turn' }],
]);

describe('UI-AI-01 - Zatwierdzenie propozycji AI', () => {
  it('does not execute a proposed write until the user confirms it', () => {
    const chatCalls: ChatRequest[] = [];
    const salesWriteCalls: string[] = [];

    mockAuthApi();
    cy.intercept('GET', '**/api/assistant/status', {
      statusCode: 200,
      body: { enabled: true },
    });
    cy.intercept('POST', '**/api/sales/**', (request) => {
      salesWriteCalls.push(request.url);
      request.reply({ statusCode: 200, body: {} });
    });
    cy.intercept('POST', '**/api/assistant/chat', (request) => {
      chatCalls.push(request.body as ChatRequest);
      request.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: chatCalls.length === 1 ? PROPOSAL : COMPLETED,
      });
    }).as('assistantChat');

    visitAuthenticated('/');

    cy.get('button[aria-label="Open assistant"]').click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('textarea[aria-label="Message the assistant…"]').type('Create a sales order for two widgets');
      cy.get('button[aria-label="Send"]').click();
      cy.contains('I prepared a sales order for your review.').should('be.visible');
      cy.contains('create_sales_order').should('be.visible');
      cy.contains('button', 'Confirm').should('be.visible');
    });
    cy.wait('@assistantChat');
    cy.then(() => {
      expect(chatCalls).to.have.length(1);
      expect(chatCalls[0]?.decision).to.equal(undefined);
      expect(salesWriteCalls).to.have.length(0);
    });

    cy.get('[role="dialog"]').contains('button', 'Confirm').click();
    cy.wait('@assistantChat');
    cy.get('[role="dialog"]').contains('The sales order was created.').should('be.visible');
    cy.then(() => {
      expect(chatCalls).to.have.length(2);
      expect(chatCalls[1]?.decision).to.deep.equal({ toolUseId: 'tool-order-1', approved: true });
      expect(salesWriteCalls).to.have.length(0);
    });
  });
});

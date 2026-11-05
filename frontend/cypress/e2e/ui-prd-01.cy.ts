import { chooseOption, mockAuthApi, visitAuthenticated } from '../support/mockApi';

type WorkOrderComponent = {
  id: number;
  componentItemId: number;
  plannedQty: string;
  consumedQty: string;
  consumedValue: string;
  journalEntryId?: number;
};

type WorkOrder = {
  id: number;
  woNumber: string;
  itemId: number;
  bomId: number;
  qtyToProduce: string;
  qtyProduced: string;
  status: string;
  totalComponentCost: string;
  components: WorkOrderComponent[];
};

describe('UI-PRD-01 - Produkcja', () => {
  it('creates a work order, issues its components, and receives finished goods', () => {
    let workOrder: WorkOrder | null = null;

    mockAuthApi();

    cy.intercept('GET', '**/api/masterdata/items', {
      statusCode: 200,
      body: [
        { id: 11, sku: 'FG-CY-01', name: 'Finished Widget', itemType: 'FINISHED' },
        { id: 12, sku: 'RM-CY-01', name: 'Raw Material', itemType: 'RAW' },
      ],
    });
    cy.intercept('GET', '**/api/masterdata/locations*', {
      statusCode: 200,
      body: [{ id: 21, code: 'STOCK-CY', locationType: 'STOCK' }],
    });
    cy.intercept('GET', '**/api/manufacturing/boms', {
      statusCode: 200,
      body: [{ id: 31, parentItemId: 11, version: 1, outputQty: '1' }],
    });
    cy.intercept('GET', '**/api/manufacturing/work-orders', (request) => {
      request.reply({ statusCode: 200, body: workOrder ? [workOrder] : [] });
    });
    cy.intercept('GET', '**/api/manufacturing/work-orders/*', (request) => {
      request.reply({ statusCode: 200, body: workOrder ?? {} });
    });
    cy.intercept('POST', '**/api/manufacturing/work-orders', (request) => {
      const body = request.body as { itemId: number; bomId: number; qtyToProduce: string };
      workOrder = {
        id: 41,
        woNumber: 'WO-CY-01',
        itemId: body.itemId,
        bomId: body.bomId,
        qtyToProduce: body.qtyToProduce,
        qtyProduced: '0',
        status: 'DRAFT',
        totalComponentCost: '0',
        components: [
          {
            id: 411,
            componentItemId: 12,
            plannedQty: '2',
            consumedQty: '0',
            consumedValue: '0',
          },
        ],
      };
      request.reply({ statusCode: 201, body: workOrder });
    }).as('createWorkOrder');
    cy.intercept('POST', '**/api/manufacturing/work-orders/*/release', (request) => {
      if (workOrder) workOrder = { ...workOrder, status: 'RELEASED' };
      request.reply({ statusCode: 200, body: workOrder ?? {} });
    }).as('releaseWorkOrder');
    cy.intercept('POST', '**/api/manufacturing/work-orders/*/issue', (request) => {
      if (workOrder) {
        workOrder = {
          ...workOrder,
          status: 'IN_PROGRESS',
          totalComponentCost: '30',
          components: workOrder.components.map((component) => ({
            ...component,
            consumedQty: '2',
            consumedValue: '30',
            journalEntryId: 801,
          })),
        };
      }
      request.reply({ statusCode: 200, body: workOrder ?? {} });
    }).as('issueComponents');
    cy.intercept('POST', '**/api/manufacturing/work-orders/*/complete', (request) => {
      const body = request.body as { qtyProduced: string; stockLocationId: number };
      if (workOrder) {
        workOrder = {
          ...workOrder,
          status: 'DONE',
          qtyProduced: body.qtyProduced,
        };
      }
      request.reply({ statusCode: 200, body: workOrder ?? {} });
    }).as('completeWorkOrder');

    visitAuthenticated('/manufacturing?tab=work-orders');

    cy.contains('button', 'New work order').click();
    chooseOption('Finished item', 'FG-CY-01 — Finished Widget');
    chooseOption('BOM', 'v1 (output 1)');
    cy.contains('label', 'Quantity to produce').parent().find('input').clear().type('2');
    cy.contains('[role="dialog"] button', 'Create').click();
    cy.wait('@createWorkOrder').then(({ request }) => {
      expect(request.body).to.deep.equal({ itemId: 11, bomId: 31, qtyToProduce: '2' });
    });

    cy.contains('[role="dialog"] button', 'Release').should('be.enabled').click();
    cy.wait('@releaseWorkOrder');
    cy.contains('[role="dialog"] button', 'Issue').should('be.enabled').click();
    chooseOption('Issue components from', 'STOCK-CY (Stock)');
    cy.contains('[role="dialog"] button', 'Confirm').click();
    cy.wait('@issueComponents').then(({ request }) => {
      expect(request.body.stockLocationId).to.equal(21);
    });
    cy.contains('Components issued to WIP').should('be.visible');

    cy.contains('[role="dialog"] button', 'Complete').should('be.enabled').click();
    chooseOption('Receive finished goods into', 'STOCK-CY (Stock)');
    cy.contains('label', 'Quantity produced').parent().find('input').should('have.value', '2');
    cy.contains('[role="dialog"] button', 'Confirm').click();
    cy.wait('@completeWorkOrder').then(({ request }) => {
      expect(request.body).to.include({ qtyProduced: '2', stockLocationId: 21 });
    });
    cy.contains('Work order completed; finished goods received').should('be.visible');
    cy.contains('[role="dialog"]', 'WO-CY-01').should('contain.text', 'Done');
    cy.contains('[role="dialog"]', 'Raw Material').should('be.visible');
    cy.contains('[role="dialog"]', '30.00').should('be.visible');
  });
});

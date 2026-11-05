import { chooseOption, mockAuthApi, visitAuthenticated } from '../support/mockApi';

describe('UI-INV-01 - Korekta magazynowa', () => {
  it('posts a positive stock adjustment and verifies the updated on-hand quantity', () => {
    let onHandQty = '10';

    mockAuthApi();
    cy.intercept('GET', '**/api/masterdata/items', {
      statusCode: 200,
      body: [{ id: 81, sku: 'ITEM-CY-01', name: 'Inventory Test Item', itemType: 'RAW' }],
    }).as('inventoryItems');
    cy.intercept('GET', '**/api/masterdata/locations*', {
      statusCode: 200,
      body: [{ id: 82, code: 'STOCK-INV-CY', locationType: 'STOCK' }],
    }).as('inventoryLocations');
    cy.intercept('POST', '**/api/inventory/adjustments', (request) => {
      expect(request.body).to.include({
        itemId: 81,
        locationId: 82,
        qtyDelta: '5',
        unitCost: '12.50',
        reason: 'Cycle count correction',
      });
      onHandQty = '15';
      request.reply({
        statusCode: 200,
        body: {
          id: 91,
          adjustmentNumber: 'ADJ-CY-01',
          itemId: 81,
          locationId: 82,
          qtyDelta: '5',
          unitCost: '12.50',
          reason: 'Cycle count correction',
          status: 'POSTED',
          journalEntryId: 901,
        },
      });
    }).as('postAdjustment');
    cy.intercept('GET', '**/api/inventory/items/*/on-hand', (request) => {
      request.reply({
        statusCode: 200,
        body: {
          itemId: 81,
          sku: 'ITEM-CY-01',
          onHandQty,
          avgUnitCost: '12.50',
          totalValue: '187.50',
        },
      });
    }).as('getOnHand');
    cy.intercept('GET', '**/api/inventory/reconciliation', {
      statusCode: 200,
      body: [],
    });

    visitAuthenticated('/inventory?tab=adjustments');

    cy.wait('@inventoryItems');
    cy.wait('@inventoryLocations');
    chooseOption('Item', 'ITEM-CY-01 — Inventory Test Item');
    chooseOption('Location', 'STOCK-INV-CY (Stock)');
    cy.contains('label', 'Quantity delta').parent().find('input').type('5');
    cy.contains('label', 'Unit cost').parent().find('input').type('12.50');
    cy.contains('label', 'Reason').parent().find('input').type('Cycle count correction');
    cy.contains('button', 'Post adjustment').click();
    cy.wait('@postAdjustment');

    cy.contains('Posted ADJ-CY-01').should('be.visible');
    cy.contains('qty 5').should('be.visible');
    cy.contains('JE #901').should('be.visible');

    cy.contains('[role="tab"]', 'Overview').click();
    chooseOption('Item', 'ITEM-CY-01 — Inventory Test Item');
    cy.wait('@getOnHand');
    cy.contains('On hand').parents('.mantine-Card-root').first().should('contain.text', '15');
    cy.contains('Total value').parents('.mantine-Card-root').first().should('contain.text', '187.50');
  });
});

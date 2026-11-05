const AUTH = {
  accessToken: 'cypress-access-token',
  username: 'admin',
  roles: ['ADMIN', 'ACCOUNTANT', 'WAREHOUSE', 'SALES', 'HR'],
};

export function mockAuthApi() {
  cy.intercept('**/api/**', (request) => {
    const path = new URL(request.url).pathname;
    if (path === '/api/auth/refresh' || path === '/api/auth/login') {
      request.reply({ statusCode: 200, body: AUTH });
      return;
    }

    request.reply({ statusCode: 200, body: request.method === 'GET' ? [] : {} });
  });
}

export function visitAuthenticated(path: string) {
  cy.visit(path, {
    onBeforeLoad(window) {
      window.localStorage.setItem('erp.locale', 'en');
      window.localStorage.setItem(
        'erp.onboarding',
        JSON.stringify({ completed: true, currentStep: 99 }),
      );
    },
  });
  cy.contains('button', 'admin').should('be.visible');
}

export function chooseOption(label: string, option: string) {
  cy.contains('label', label)
    .should('be.visible')
    .invoke('attr', 'for')
    .then((id) => {
      expect(id, `input id for ${label}`).to.be.a('string');
      cy.get(`[id="${id}"]`).click();
      cy.get('[role="option"]').contains(option).click();
    });
}

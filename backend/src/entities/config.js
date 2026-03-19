const ACCESS_TEMPLATE = {
  public: {
    list: false,
    get: false,
    filter: false,
    create: false,
    bulkCreate: false,
    update: false,
    delete: false,
  },
  protected: {
    list: true,
    get: true,
    filter: true,
    create: true,
    bulkCreate: true,
    update: true,
    delete: true,
  },
};

export const entityAccess = {
  Apartment: {
    ...ACCESS_TEMPLATE,
    public: { ...ACCESS_TEMPLATE.public, list: true, get: true, filter: true },
  },
  Block: {
    ...ACCESS_TEMPLATE,
    public: { ...ACCESS_TEMPLATE.public, list: true, get: true, filter: true },
  },
  CondoSettings: ACCESS_TEMPLATE,
  Delivery: ACCESS_TEMPLATE,
  DeliveryKeyword: {
    ...ACCESS_TEMPLATE,
    public: {
      ...ACCESS_TEMPLATE.public,
      create: true,
      bulkCreate: true,
    },
  },
  Employee: {
    ...ACCESS_TEMPLATE,
    protected: {
      list: false,
      get: false,
      filter: false,
      create: false,
      bulkCreate: false,
      update: false,
      delete: false,
    },
  },
  NotificationQueue: ACCESS_TEMPLATE,
  RefusedDelivery: ACCESS_TEMPLATE,
  Resident: ACCESS_TEMPLATE,
  ResidentRequest: {
    ...ACCESS_TEMPLATE,
    public: {
      ...ACCESS_TEMPLATE.public,
      create: true,
    },
  },
};

export function getEntityAccess(entityName) {
  return entityAccess[entityName] || null;
}

export function assertEntityActionAllowed(entityName, action, isAuthenticated) {
  const config = getEntityAccess(entityName);
  if (!config) {
    throw new Error(`Entidade nao suportada: ${entityName}`);
  }

  const permissions = isAuthenticated ? config.protected : config.public;
  if (!permissions[action]) {
    throw new Error('Acesso negado para esta operacao.');
  }

  return config;
}

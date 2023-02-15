module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/export/contentTypes',
      handler: 'exportAdmin.exportData',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/export/saveEntityJson',
      handler: 'exportAdmin.saveEntityJson',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/export/commitEntityJson',
      handler: 'exportAdmin.commitEntityJson',
      config: {
        policies: [],
      },
    },
  ],
};

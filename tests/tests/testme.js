const { getModel } = require('../../server/utils/models');
const { getService, SLUGS, generateData } = require('../utils');
const fs = require('fs');

describe('export service', () => {
  const CONFIG = {
    [SLUGS.COLLECTION_TYPE_SIMPLE]: [
      {
        id: 1,
        title: 'my collection title',
        description: 'my collection description',
        startDateTime: '2022-10-10T12:30:15.000Z',
        enabled: true,
      },
      {
        id: 2,
        title: 'my second collection title',
        description: 'my second collection description',
        startDateTime: '2022-10-20T12:30:15.000Z',
        enabled: false,
      },
    ],
    [SLUGS.SINGLE_TYPE]: {
      id: 1,
      title: 'my title',
      description: 'my description',
    },
  };

  it('should export single type', async () => {
    await strapi.db.query(SLUGS.SINGLE_TYPE).create({
      data: { ...CONFIG[SLUGS.SINGLE_TYPE] },
    });

    const changes = fs.readdirSync('../../../changes');
    expect(changes.indexOf("20220901090000.json")).toBeGreaterThan(-1);
    const changeObj = JSON.parse(fs.readFileSync('../../../changes/20220901090000.json', 'utf8'));
    expect(changeObj.forward[0].uid).toBe("api::single-type.single-type");
    expect(changeObj.forward[0].params.data.id).toBe(1);
    expect(changeObj.forward[0].params.data.title).toBe("my title");
    expect(changeObj.forward[0].params.data.description).toBe("my description");

  });

});

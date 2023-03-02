import { request } from '@strapi/helper-plugin';

import pluginId from '../../pluginId';

const getByContentType = async ({ slug, search, applySearch, exportFormat, relationsAsId, deepness }) => {
  const data = await request(`/${pluginId}/export/contentTypes`, {
    method: 'POST',
    body: { slug, search, applySearch, exportFormat, relationsAsId, deepness },
  });
  return data;
};

const saveEntityJson = async ({ slug }) => {
  const data = await request(`/${pluginId}/export/saveEntityJson`, {
    method: 'POST',
    body: { slug },
  });
  return data;
};

const commitEntityJson = async ({ branch }) => {
  const data = await request(`/${pluginId}/export/commitEntityJson`, {
    method: 'POST',
    body: { branch },
  });
  return data;
};

const genericApi = async (indata) => {
  const data = await request(`/${pluginId}/export/genericApi`, {
    method: 'POST',
    body: indata,
  });
  return data;
};

const loadEntityJsonParams = async ({ slug }) => {
  console.log("LOAD CALLED");
  const data = await request(`/${pluginId}/export/loadEntityJsonParams`, {
    method: 'POST',
    body: { slug },
  });
  return data;
};

export default {
  getByContentType,
  saveEntityJson,
  commitEntityJson,
  loadEntityJsonParams,
  genericApi,
};

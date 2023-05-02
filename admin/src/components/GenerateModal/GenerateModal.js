import './style.css';

import { Button } from '@strapi/design-system/Button';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { TextInput } from '@strapi/design-system';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { ExclamationMarkCircle, Write } from '@strapi/icons';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Loader } from '@strapi/design-system/Loader';
import { ModalBody, ModalFooter, ModalHeader, ModalLayout } from '@strapi/design-system/ModalLayout';
import { Portal } from '@strapi/design-system/Portal';
import { Option, Select } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import { Dialog, DialogBody, DialogFooter } from '@strapi/design-system';
import {
  useNotification,
} from '@strapi/helper-plugin';

import pick from 'lodash/pick';
import range from 'lodash/range';
import qs from 'qs';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import ExportProxy from '../../api/exportProxy';
import { useAlerts } from '../../hooks/useAlerts';
import { useDownloadFile } from '../../hooks/useDownloadFile';
import { useI18n } from '../../hooks/useI18n';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSlug } from '../../hooks/useSlug';
import { dataFormatConfigs, dataFormats } from '../../utils/dataFormats';
import { handleRequestErr } from '../../utils/error';
import { Editor } from '../Editor';

const templates = [
  {
    name: 'list',
    displayName: 'List View',
    isCollection: true,
  },
  {
    name: 'detail',
    displayName: 'Detail View',
    isSlug: true,
  },
  {
    name: 'form',
    displayName: 'Form (react-hook-form)',
    isCollection: true,
  },
  {
    name: 'empty',
    displayName: 'Empty Page',
  },
];

const ignoreFields = ['createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy'];

const DEFAULT_OPTIONS = {
  collection: '',
  template: '',
  slug: '',
  path: '',
  fields: {},
};

export const GenerateModal = ({ onClose }) => {
  const { i18n } = useI18n();
  const { notify } = useAlerts();

  const [options, setOptions] = useState({ ...DEFAULT_OPTIONS });
  const [data, setData] = useState(null);
  const [fetchingData, setFetchingData] = useState(false);

  const [overwriteMessage, setOverwriteMessage] = useState(null);
  const toggleNotification = useNotification();

  const handleSetOption = (key) => (value) => {
    setOptions((previous) => ({ ...previous, [key]: value }));
  };
  const handleSetField = (key) => (value) => {
    setOptions((previous) => ({ ...previous, fields: { ...previous.fields, [key]: value } }));
  };

  const getData = async () => {
    setFetchingData(true);
    try {
      const res = await ExportProxy.genericApi({
        action: 'getSchema',
        payload: {},
      });
      const models = res.data.models;
      const components = res.data.components;
      const recurseTypes = ['component', 'dynamiczone', 'relation'];
      const recurseAttributes = (container) => {
        container.forEach((model) => {
          for (const attr in model.attributes) {
            if (recurseTypes.includes(model.attributes[attr].type)) {
              const component = components.find((c) => c.uid === model.attributes[attr].component);
              if (component) model.attributes[attr].attributes = component.attributes;
              const relation = models.find((m) => m.uid === model.attributes[attr].target);
              if (relation) model.attributes[attr].attributes = relation.attributes;
            }
          }
        });
      };
      recurseAttributes(models);
      recurseAttributes(components);

      setData(res.data);
    } catch (err) {
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
      setFetchingData(false);
    }
  };

  const onGenerateClick = async (overwrite) => {
    try {
      setOverwriteMessage(null);
      const model = data.models.find((m) => m.uid === options.collection);

      const fields = [];
      Object.keys(options.fields).filter(p => options.fields[p]).forEach(p => {
        const path = p.split(".");
        let current = fields;
        let modelAttr = model.attributes;
        let runningPath = "";
        for (let token of path) {
          // eger parent checklenmediyse child'lari ekleme
          runningPath += (runningPath ? "." : "") + token;
          if (runningPath) {
            if (!options.fields[runningPath]) {
              break;
            }
          }
          let field = current.find(p => p.name === token);
          if (!field) {
            field = { ...modelAttr[token], name: token };
            current.push(field);
            if (field.attributes) {
              field.attributes = [];
            }
          }
          modelAttr = modelAttr[token].attributes;
          current = field.attributes;
        }
        // current = { ...modelAttr };
      });
      // return { success: true };
      // return;

      const res = await ExportProxy.genericApi({
        action: 'generate',
        payload: {
          options: { ...options, attributes: fields, overwrite: overwrite },
        },
      });
      const { success, message } = res.data;
      if (!success)
        // alert(message);
        setOverwriteMessage(message);
      else {
        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.generated', defaultMessage: 'Generated' },
        });

      }
      notify(i18n('plugin.message.export.success.title'), i18n('plugin.message.export.success.message'), 'success');
      // onClose();
    } catch (err) {
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const clearData = () => {
    setData(null);
  };
  let availableTemplates = [];
  if (data && data.models && options.collection) {
    availableTemplates = templates;
    const model = data.models.find((m) => m.uid === options.collection);
    if (model.kind === 'singleType') availableTemplates = templates.filter((p) => !p.isCollection);
  }
  let selectedModel = null;
  if (data && data.models && options.collection) {
    selectedModel = data.models.find((m) => m.uid === options.collection);
  }
  let selectedTemplate = templates.filter((p) => p.name === options.template)[0];
  let cssOptions = [
    { value: 'none', label: 'None' },
    { value: 'global', label: 'Global CSS' },
    { value: 'module', label: 'CSS Modules' },

  ];

  let firstRowStyle = { flex: "1 1 100%" };
  function fieldChecks(attributes, prefix) {
    const depth = prefix ? prefix.split('').reduce((acc, curr) => acc + (curr === 'j' ? 1 : 0), 0) + 1 : 0;
    return Object.keys(attributes)
      .filter((p) => ignoreFields.indexOf(p) < 0)
      .map((p) => {
        const attr = attributes[p];
        const name = prefix ? `${prefix}.${p}` : p;
        return (
          <React.Fragment key={name} >
            <Flex direction="column" alignItems="start" gap="16px" style={{ paddingLeft: '20px' }}>
              <Checkbox id={name} value={options.fields[name]} onChange={(e) => handleSetField(name)(e.target.checked)}>
                {p}
              </Checkbox>
              {options.fields[name] && attr.attributes && fieldChecks(attr.attributes, name)}
            </Flex>
          </React.Fragment>
        );
      });
  }

  return (
    <Portal>
      <Dialog onClose={() => setOverwriteMessage(null)} title="Overwrite files" isOpen={overwriteMessage}>
        <DialogBody icon={<ExclamationMarkCircle />}>
          <Flex direction="column" alignItems="center" gap={2}>
            <Flex justifyContent="center">
              <Typography id="confirm-description"><div dangerouslySetInnerHTML={{ __html: overwriteMessage && overwriteMessage.split("\n").join("<br>") }}></div></Typography>
            </Flex>
          </Flex>
        </DialogBody>
        <DialogFooter startAction={<Button onClick={() => setOverwriteMessage(null)} variant="tertiary">
          Cancel
        </Button>} endAction={<Button variant="danger-light" onClick={() => onGenerateClick(true)} startIcon={<Write />}>
          Overwrite
        </Button>} />
      </Dialog>
      <ModalLayout onClose={onClose} labelledBy="title">
        <ModalHeader>
          <Flex gap={2}>
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              Generate Next.js Scripts
            </Typography>
            <Typography textColor="neutral800" id="title"></Typography>
          </Flex>
        </ModalHeader>
        <ModalBody className="plugin-ie-export_modal_body">
          {fetchingData && (
            <>
              <Flex justifyContent="center">
                <Loader>{i18n('plugin.export.fetching-data')}</Loader>
              </Flex>
            </>
          )}
          {data && !fetchingData && (
            <>
              <Flex direction="row" alignItems="start" gap="16px" >
                <Box style={firstRowStyle} >

                  <Select id="collection" label={'Collection'} required placeholder={'Select One'} value={options.collection} onChange={handleSetOption('collection')}>
                    {data.models.map((model) => (
                      <Option key={model.uid} value={model.uid}>
                        {model.info.displayName}
                      </Option>
                    ))}
                  </Select>
                </Box>

                <Box style={firstRowStyle} >

                  <Select id="template" label={'Template'} required placeholder={'Select One'} value={options.template} onChange={handleSetOption('template')}>
                    {availableTemplates.map((template) => (
                      <Option key={template.name} value={template.name}>
                        {template.displayName}
                      </Option>
                    ))}
                  </Select>
                </Box>
                {selectedModel && selectedTemplate && selectedTemplate.isSlug &&
                  <Box style={firstRowStyle} >

                    <Select id="slug" label={'Slug'} required placeholder={'Select One'} value={options.slug} onChange={handleSetOption('slug')}>
                      {Object.keys(selectedModel.attributes).filter((p) => ignoreFields.indexOf(p) < 0).map((attr) => ({ ...selectedModel.attributes[attr], name: attr })).map((attr) => (
                        <Option key={attr.name} value={attr.name}>
                          {attr.name}
                        </Option>
                      ))}
                    </Select>
                  </Box>
                }
                <Box style={firstRowStyle} >
                  <Select id="css" label={'CSS'} required placeholder={'Select One'} value={options.css} onChange={handleSetOption('css')}>
                    {cssOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Box>
              </Flex>

              <Flex direction="column" alignItems="start" gap="16px">
                <TextInput placeholder="File path" label="Path" name="path" hint="Path in next.js app" onChange={(e) => handleSetOption('path')(e.target.value)} value={options.path} required />
              </Flex>
              {selectedModel && (
                <Flex direction="column" alignItems="start" gap="16px">
                  <Typography as="h3" textColor="neutral800">
                    Fields
                  </Typography>
                  {fieldChecks(selectedModel.attributes)}
                </Flex>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter
          startActions={<></>}
          endActions={
            <>
              {!data && <Button onClick={getData}>GET DATA</Button>}
              {!!data && (
                <>
                  <Button onClick={() => onGenerateClick(false)}>Generate</Button>
                </>
              )}
            </>
          }
        />
      </ModalLayout>
    </Portal>
  );
};

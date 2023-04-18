import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';
import Initializer from './components/Initializer';
import { Alerts } from './components/Injected/Alerts';
import { InjectedExportButton } from './components/InjectedExportButton';
import { InjectedImportButton } from './components/InjectedImportButton';
import { InjectedImportExportSingleType } from './components/InjectedImportExportSingleType/InjectedImportExportSingleType';
import PluginIcon from './components/PluginIcon';
import pluginId from './pluginId';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import {
  Checkbox
} from '@strapi/design-system';

const name = pluginPkg.strapi.name;

const getTrad = (id) => `${pluginId}.${id}`;

const CheckboxConfirmation = ({ description, isCreating, intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();

  const handleChange = (value) => {
    return onChange({ target: { name, value, type: 'checkbox' } });
  };
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  return (
    <Checkbox
      hint={hint}
      id={name}
      name={name}
      onValueChange={handleChange}
      value={value}
      type="checkbox"
    >
      {label}
    </Checkbox>
  )
};

const mutateCTBContentTypeSchema = (nextSchema, prevSchema) => {
  // Don't perform mutations components
  console.log("NEXT SCHEMA: ", nextSchema);
  console.log("PREV SCHEMA: ", prevSchema);
  return nextSchema;
};

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'SEO',
      },
      Component: async () => {
        const component = await import('./pages/App');

        return component;
      },
    });
    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap(app) {
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-alerts`,
      Component: Alerts,
    });
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-import`,
      Component: InjectedImportButton,
    });
    app.injectContentManagerComponent('listView', 'actions', {
      name: `${pluginId}-export`,
      Component: InjectedExportButton,
    });

    app.injectContentManagerComponent('editView', 'right-links', {
      name: `${pluginId}-alerts`,
      Component: Alerts,
    });
    app.injectContentManagerComponent('editView', 'right-links', {
      name: `${pluginId}-import-export`,
      Component: InjectedImportExportSingleType,
    });
    const ctbPlugin = app.getPlugin('content-type-builder');
    if (ctbPlugin) {
      console.log("CTB PLUGIN: ", ctbPlugin);
      const ctbFormsAPI = ctbPlugin.apis.forms;
      ctbFormsAPI.addContentTypeSchemaMutation(mutateCTBContentTypeSchema);
      ctbFormsAPI.components.add({ id: 'checkboxConfirmation', component: CheckboxConfirmation });

      ctbFormsAPI.extendContentType({
        validator: () => ({
          importExport: yup.object().shape({
            stage: yup.bool(),
          }),
        }),
        form: {
          advanced() {
            return [
              {
                name: 'pluginOptions.import-export.stage',
                description: {
                  id: getTrad('plugin.schema.import-export.stage.description-content-type'),
                  defaultMessage: 'Use this collection type in both staging and make public on site',
                },
                type: 'checkboxConfirmation',
                intlLabel: {
                  id: getTrad('plugin.schema.import-export.stage.label-content-type'),
                  defaultMessage: 'Stage this!',
                },
              },
            ];
          },
        },
      });
    }
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      }),
    );

    return Promise.resolve(importedTrads);
  },
};

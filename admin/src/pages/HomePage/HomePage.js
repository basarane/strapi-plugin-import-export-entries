import { Box } from '@strapi/design-system/Box';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Flex } from '@strapi/design-system/Flex';
import { ContentLayout } from '@strapi/design-system/Layout';
import { Link } from '@strapi/design-system/Link';
import { Option, Select } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import range from 'lodash/range';
import React, { memo, useState } from 'react';
import Write from '@strapi/icons/Write';

import { Header } from '../../components/Header';
import { InjectedExportButton } from '../../components/InjectedExportButton';
import { InjectedImportButton } from '../../components/InjectedImportButton';
import { useI18n } from '../../hooks/useI18n';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { dataFormats } from '../../utils/dataFormats';
import { Button } from '@strapi/design-system/Button';
import { handleRequestErr } from '../../utils/error';

import ExportProxy from '../../api/exportProxy';
import { useAlerts } from '../../hooks/useAlerts';
import { CustomSlugs } from '../../../../server/config/constants';

const HomePage = () => {
  const { notify } = useAlerts();

  const { i18n } = useI18n();
  const { getPreferences, updatePreferences } = useLocalStorage();

  const [preferences, setPreferences] = useState(getPreferences());

  const handleUpdatePreferences = (key, value) => {
    updatePreferences({ [key]: value });
    setPreferences(getPreferences());
  };

  const saveEntityJson = async () => {
    console.log("HERE");
    try {
      const res = await ExportProxy.saveEntityJson({
        slug: CustomSlugs.WHOLE_DB,
      });
      console.log("DONE", res);
    } catch (err) {
      console.log("err  ", err);
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
    }
  };

  return (
    <>
      <Header />

      <ContentLayout>
        <Flex direction="column" alignItems="start" gap={8}>
          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding="32px" hasRadius={true}>
            <Flex direction="column" alignItems="start" gap={6}>
              <Typography variant="alpha">KOMPUTER/SOTKA CUSTOM</Typography>

              <Box>
                <Flex direction="column" alignItems="start" gap={4}>
                  <Flex gap={4}>
                    <Button startIcon={<Write />} size="L" onClick={saveEntityJson} fullWidth={false} variant="success">
                      SAVE ENTITY.JSON
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            </Flex>
          </Box>
          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding="32px" hasRadius={true}>
            <Flex direction="column" alignItems="start" gap={6}>
              <Typography variant="alpha">{i18n('plugin.page.homepage.section.quick-actions.title', 'Quick Actions')}</Typography>

              <Box>
                <Flex direction="column" alignItems="start" gap={4}>
                  <Flex gap={4}>
                    <InjectedImportButton />
                    <InjectedExportButton availableExportFormats={[dataFormats.JSON_V2]} />
                  </Flex>
                </Flex>
              </Box>
            </Flex>
          </Box>

          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding="32px" hasRadius={true}>
            <Flex direction="column" alignItems="start" gap={6}>
              <Typography variant="alpha">{i18n('plugin.page.homepage.section.preferences.title', 'Preferences')}</Typography>

              <Box>
                <Flex direction="column" alignItems="start" gap={4}>
                  <Flex justifyContent="space-between">
                    <Checkbox value={preferences.applyFilters} onValueChange={(value) => handleUpdatePreferences('applyFilters', value)}>
                      <Typography>{i18n('plugin.export.apply-filters-and-sort', 'Apply filters and sort to exported data')}</Typography>
                    </Checkbox>
                  </Flex>
                  <Flex justifyContent="space-between">
                    <Select
                      label={i18n('plugin.export.deepness', 'Deepness')}
                      placeholder={i18n('plugin.export.deepness', 'Deepness')}
                      value={preferences.deepness}
                      onChange={(value) => handleUpdatePreferences('deepness', value)}
                    >
                      {range(1, 21).map((deepness) => (
                        <Option key={deepness} value={deepness}>
                          {deepness}
                        </Option>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
              </Box>
            </Flex>
          </Box>

          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding="32px" hasRadius={true}>
            <Flex direction="column" alignItems="start" gap={6}>
              <Typography variant="alpha">{i18n('plugin.page.homepage.section.need-help.title', 'Need Help?')}</Typography>

              <Box>
                <Flex direction="column" alignItems="start" gap={4}>
                  <Typography>
                    {i18n('plugin.page.homepage.section.need-help.description', 'A feature to request? A bug to report? Feel free to reach out on discord or github ✌️')}
                  </Typography>
                  <Flex gap={4}>
                    <Link href="https://discord.gg/dcqCAFFdP8" isExternal>
                      Discord
                    </Link>
                    <Link href="https://github.com/Baboo7/strapi-plugin-import-export-entries/issues" isExternal>
                      GitHub
                    </Link>
                  </Flex>
                </Flex>
              </Box>
            </Flex>
          </Box>
        </Flex>
      </ContentLayout>
    </>
  );
};

export default memo(HomePage);

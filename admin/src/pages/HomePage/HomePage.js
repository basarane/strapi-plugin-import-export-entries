import { Box } from '@strapi/design-system/Box';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Flex } from '@strapi/design-system/Flex';
import { ContentLayout } from '@strapi/design-system/Layout';
import { Link } from '@strapi/design-system/Link';
import { Option, Select } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import range from 'lodash/range';
import React, { memo, useState, useEffect } from 'react';
import Write from '@strapi/icons/Write';

import { Header } from '../../components/Header';
import { InjectedExportButton } from '../../components/InjectedExportButton';
import { InjectedImportButton } from '../../components/InjectedImportButton';
import { InjectedGenerateButton } from '../../components/Injected/generate';
import { useI18n } from '../../hooks/useI18n';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { dataFormats } from '../../utils/dataFormats';
import { Button } from '@strapi/design-system/Button';
import { handleRequestErr } from '../../utils/error';

import ExportProxy from '../../api/exportProxy';
import { useAlerts } from '../../hooks/useAlerts';
import { CustomSlugs } from '../../../../server/config/constants';
import { useDownloadFile } from '../../hooks/useDownloadFile';

import { RawTable, RawTh, RawTd, RawTr, RawThead, RawTbody } from '@strapi/design-system';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system';

import { ModalLayout, ModalBody, ModalHeader, ModalFooter } from '@strapi/design-system';

console.log(InjectedGenerateButton);
const padding = [8, 0, 0];

function msToTime(s) {
  // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  //pad(s / 3.6e6 | 0) + ':' +
  //% 3.6e6
  return pad((s) / 6e4 | 0) + ':' + pad((s % 6e4) / 1000 | 0); //+ '.' + pad(s % 1000, 3)
}

function timestampToDate(timeStamp) {
  var dateFormat = new Date(timeStamp);
  return dateFormat.toLocaleString();
}
function getDuration(timeStamp) {
  var dateFormat = new Date(timeStamp);
  var now = new Date();
  var diff = now - dateFormat;
  console.log(now, dateFormat, diff);
  return msToTime(diff);
}

const HomePage = () => {
  const { notify } = useAlerts();

  const { i18n } = useI18n();
  const { getPreferences, updatePreferences } = useLocalStorage();

  const [preferences, setPreferences] = useState(getPreferences());

  const handleUpdatePreferences = (key, value) => {
    updatePreferences({ [key]: value });
    setPreferences(getPreferences());
  };
  const [saveStatus, setSaveStatus] = useState(0);
  const [commitStatus, setCommitStatus] = useState(0);
  const [loadStatus, setLoadStatus] = useState(0);
  const [branch, setBranch] = useState("");
  const [config, setConfig] = useState(null);
  const [diff, setDiff] = useState("");
  const [buildStatus, setBuildStatus] = useState(null);
  const [buildLog, setBuildLog] = useState(null);

  const saveEntityJson = async () => {
    console.log("HERE");
    setSaveStatus(1);
    try {
      const res = await ExportProxy.saveEntityJson({
        slug: CustomSlugs.WHOLE_DB,
      });
      console.log("DONE", res);
      setSaveStatus(2);
      setTimeout(() => {
        loadEntityJsonParams();
      }, 1000);
    } catch (err) {
      console.log("err  ", err);
      setSaveStatus(3);
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
    }
  };

  const applyChanges = async () => {
    console.log("HERE");
    try {
      genericApi("applyChanges", "mypayload").then((res) => {
        console.log("DONE", res);
      });
    } catch (err) {
      console.log("err  ", err);
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
    }
  };
  const commitEntityJson = async () => {
    console.log("HERE");
    setCommitStatus(1);
    try {
      const res = await ExportProxy.commitEntityJson({
        branch: branch,
      });
      console.log("DONE", res);
      setCommitStatus(2);
      loadEntityJsonParams();
    } catch (err) {
      console.log("err  ", err);
      setCommitStatus(3);
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
    }
  };

  const genericApi = async (api, params) => {
    console.log("HERE");
    try {
      const res = await ExportProxy.genericApi({
        action: api,
        payload: params,
      });
      console.log("DONE", res);
      return res;
    } catch (err) {
      console.log("err  ", err);
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
    }
    return null;
  };

  const loadEntityJsonParams = async () => {
    setLoadStatus(1);
    try {
      const res = await ExportProxy.loadEntityJsonParams({ slug: CustomSlugs.WHOLE_DB });
      console.log("DONE", res);
      setLoadStatus(2);
      setConfig(res.data.res.config);
      setBranch(res.data.res.config.currentBranch);
      setDiff(res.data.res.config.currentDiff);
    } catch (err) {
      setLoadStatus(3);
      console.log("err  ", err);
      handleRequestErr(err, {
        403: () => notify(i18n('plugin.message.export.error.forbidden.title'), i18n('plugin.message.export.error.forbidden.message'), 'danger'),
        default: () => notify(i18n('plugin.message.export.error.unexpected.title'), i18n('plugin.message.export.error.unexpected.message'), 'danger'),
      });
    } finally {
    }
  };
  const getBuildStatus = () => {
    genericApi("buildStatus", {}).then((res) => {
      if (res.data.success) {
        setBuildStatus(res.data.buildStatus);
        console.log(res.data.buildStatus);
      }
    });
  };
  const getBuildLog = (name, buildId) => {
    genericApi("buildStatus", { log: name, build: buildId }).then((res) => {
      if (res.data.success) {
        setBuildLog(res.data.buildStatus);
        console.log(res.data.buildStatus);
      }
    });
  };
  useEffect(() => {
    // let timeout = setTimeout(() => {
    loadEntityJsonParams();
    getBuildStatus();
    // }, 3000);
    // return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <Header />

      {buildLog && <ModalLayout onClose={() => setBuildLog(null)} labelledBy="title">
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            Build Log
          </Typography>
        </ModalHeader>
        <ModalBody>
          <Box style={{ width: '100%', height: '100%' }}>
            <Typography as="pre">
              {buildLog}
            </Typography>
          </Box>
        </ModalBody>
        <ModalFooter startActions={<Button onClick={() => setBuildLog(null)} variant="tertiary">
          Close
        </Button>} />
      </ModalLayout>}

      <ContentLayout>
        <Flex direction="column" alignItems="start" gap={8}>
          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding={padding} hasRadius={true}>
            <Flex direction="column" alignItems="start" gap={6}>
              <Typography variant="alpha">KOMPUTER/SOTKA CUSTOM</Typography>

              <Box>

                <Flex direction="column" alignItems="start" gap={4}>
                  {config && config.currentBranch === "dev" &&
                    <Flex gap={4}>
                      <InjectedGenerateButton />
                    </Flex>
                  }
                  <Flex gap={4}>
                    <Typography variant="beta">
                      Current branch: {config && config.currentBranch}
                    </Typography>
                  </Flex>
                  <Flex gap={4} alignItems="end">
                    <Button startIcon={<Write />} size="L" disabled={saveStatus === 1} onClick={saveEntityJson} fullWidth={false} variant="success">
                      SAVE ENTITY.JSON
                    </Button>
                    {config?.enableChanges &&
                      <Button startIcon={<Write />} size="L" disabled={saveStatus === 1} onClick={applyChanges} fullWidth={false} variant="success">
                        APPLY CHANGES
                      </Button>
                    }
                    {config &&
                      <>
                        <Select
                          label='Branch'
                          placeholder='Branch'
                          value={branch}
                          onChange={(value) => setBranch(value)}
                          disabled={!diff || commitStatus === 1 || loadStatus == 1}
                        >
                          {config.branches && config.branches.map((branch) => (
                            <Option key={branch} value={branch}>
                              {branch}
                            </Option>
                          ))}
                        </Select>
                        <Button startIcon={<Write />} size="L" disabled={!diff || commitStatus === 1 || loadStatus == 1} onClick={commitEntityJson} fullWidth={false} variant="success">
                          COMMIT & PUSH
                        </Button>
                      </>
                    }
                  </Flex>
                  {saveStatus > 0 &&
                    <Flex gap={4}>
                      <Typography>
                        Entity Save Status:&nbsp;
                        {saveStatus == 1 && "Saving..."}
                        {saveStatus == 2 && "DONE!"}
                        {saveStatus == 3 && "ERROR"}
                      </Typography>
                    </Flex>
                  }
                  {commitStatus > 0 &&
                    <Flex gap={4}>
                      <Typography>
                        Commit Status:&nbsp;
                        {commitStatus == 1 && "Saving..."}
                        {commitStatus == 2 && "DONE!"}
                        {commitStatus == 3 && "ERROR"}
                      </Typography>
                    </Flex>
                  }
                  {config && config.buildJobs &&
                    <Flex gap={4}>
                      <Typography variant="beta">
                        Build Status: {!buildStatus && "Loading..."} {buildStatus && "Loaded"}
                        <Button size="S" onClick={getBuildStatus} fullWidth={false}>
                          REFRESH
                        </Button>
                      </Typography>
                    </Flex>
                  }
                  {buildStatus &&
                    <Flex gap={4}>
                      <TabGroup label="Some stuff for the label" id="tabs">
                        {buildStatus.length > 1 &&
                          <Tabs>
                            {buildStatus.map((build) => {
                              return (
                                <Tab key={build.name}>{build.name}</Tab>
                              )
                            })}
                          </Tabs>
                        }
                        <TabPanels>
                          {buildStatus.map((buildGroup) => {
                            return (
                              <TabPanel key={buildGroup.name}>
                                <Box color="neutral800" padding={4} background="neutral0">
                                  <Flex direction="column" alignItems="stretch" gap={4}>
                                    <Typography variant="beta">{buildGroup.name}</Typography>

                                    <RawTable colCount={3} rowCount={3}>
                                      <RawThead>
                                        <RawTr aria-rowindex={0}>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>ID</Box>
                                          </RawTh>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>Date</Box>
                                          </RawTh>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>Commit</Box>
                                          </RawTh>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>Duration</Box>
                                          </RawTh>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>In Progress</Box>
                                          </RawTh>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>Result</Box>
                                          </RawTh>
                                          <RawTh aria-colindex={0}>
                                            <Box color="neutral800" padding={2}>Log</Box>
                                          </RawTh>
                                        </RawTr>
                                      </RawThead>
                                      <RawTbody>
                                        {buildGroup.builds.map((build, index) => (
                                          <RawTr key={`row-${index}`} aria-rowindex={index}>
                                            <RawTd aria-colindex={1}>
                                              <Box color="neutral800" padding={2}>
                                                {build.id}
                                              </Box>
                                            </RawTd>
                                            <RawTd aria-colindex={2}>
                                              <Box color="neutral800" padding={2} style={{ whiteSpace: "nowrap" }}>
                                                {timestampToDate(build.timestamp)}
                                              </Box>
                                            </RawTd>
                                            <RawTd aria-colindex={2}>
                                              <Box color="neutral800" padding={2}>
                                                {build.changeSets.map((changeSet) => (
                                                  changeSet.items.map((item) => item.msg).join(" / ")
                                                ))}
                                              </Box>
                                            </RawTd>
                                            <RawTd aria-colindex={2}>
                                              <Box color="neutral800" padding={2}>
                                                {msToTime(build.duration)}
                                              </Box>
                                            </RawTd>
                                            <RawTd aria-colindex={2}>
                                              <Box color="neutral800" padding={2}>
                                                {build.inProgress ? `${getDuration(build.timestamp)}/${msToTime(build.estimatedDuration)}` : "No"}
                                              </Box>
                                            </RawTd>
                                            <RawTd aria-colindex={2}>
                                              <Box color="neutral800" padding={2}>
                                                {build.result}
                                              </Box>
                                            </RawTd>
                                            <RawTd aria-colindex={2}>
                                              <Box color="neutral800" padding={2}>
                                                <Button startIcon={<Write />} size="S" onClick={() => getBuildLog(buildGroup.name, build.id)} fullWidth={false} variant="success">
                                                  Show Log
                                                </Button>
                                              </Box>
                                            </RawTd>
                                          </RawTr>
                                        ))}
                                      </RawTbody>
                                    </RawTable>
                                  </Flex>
                                </Box>
                              </TabPanel>
                            )
                          })}
                        </TabPanels>
                      </TabGroup>
                    </Flex>
                  }
                </Flex>
              </Box>
            </Flex>
          </Box>
          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding={padding} hasRadius={true}>
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

          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding={padding} hasRadius={true}>
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

          <Box style={{ alignSelf: 'stretch' }} background="neutral0" padding={padding} hasRadius={true}>
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

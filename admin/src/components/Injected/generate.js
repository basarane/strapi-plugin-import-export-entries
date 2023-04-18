import { Button } from '@strapi/design-system/Button';
import Download from '@strapi/icons/Download';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

import getTrad from '../../utils/getTrad';
import { GenerateModal } from '../GenerateModal';

export const InjectedGenerateButton = () => {
  const { formatMessage } = useIntl();

  const [exportVisible, setExportVisible] = useState(false);

  const openExportModal = () => {
    setExportVisible(true);
  };

  const closeExportModal = () => {
    setExportVisible(false);
  };

  return (
    <>
      <Button onClick={openExportModal}>
        GENERATE NEXT.JS SCRIPTS
      </Button>

      {exportVisible && <GenerateModal onClose={closeExportModal} />}
    </>
  );
};

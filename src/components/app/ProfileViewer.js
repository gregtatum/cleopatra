/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import explicitConnect from '../../utils/connect';
import DetailsContainer from './DetailsContainer';
import ProfileFilterNavigator from './ProfileFilterNavigator';
import MenuButtons from './MenuButtons';
import WindowTitle from '../shared/WindowTitle';
import SymbolicationStatusOverlay from './SymbolicationStatusOverlay';
import { returnToZipFileList } from '../../actions/zipped-profiles';
import { getProfileName, getShowTabOnly } from '../../selectors/url-state';
import Timeline from '../timeline';
import ActiveTabTimeline from '../timeline/ActiveTabTimeline';
import { getHasZipFile } from '../../selectors/zipped-profiles';
import SplitterLayout from 'react-splitter-layout';
import { invalidatePanelLayout } from '../../actions/app';
import { getTimelineHeight } from '../../selectors/app';
import {
  getUploadProgressString,
  getUploadPhase,
  getIsHidingStaleProfile,
  getHasSanitizedProfile,
} from '../../selectors/publish';
import { getIconsWithClassNames } from '../../selectors/icons';
import { BackgroundImageStyleDef } from '../shared/StyleDef';
import classNames from 'classnames';

import type { CssPixels } from '../../types/units';
import type { ConnectedProps } from '../../utils/connect';
import type { IconWithClassName } from '../../types/state';
import type { BrowsingContextID } from '../../types/profile';

require('./ProfileViewer.css');

type StateProps = {|
  +profileName: string | null,
  +hasZipFile: boolean,
  +timelineHeight: CssPixels | null,
  +uploadProgress: string,
  +isUploading: boolean,
  +isHidingStaleProfile: boolean,
  +hasSanitizedProfile: boolean,
  +icons: IconWithClassName[],
  +showTabOnly: BrowsingContextID | null,
|};

type DispatchProps = {|
  +returnToZipFileList: typeof returnToZipFileList,
  +invalidatePanelLayout: typeof invalidatePanelLayout,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class ProfileViewer extends PureComponent<Props> {
  render() {
    const {
      hasZipFile,
      profileName,
      returnToZipFileList,
      invalidatePanelLayout,
      timelineHeight,
      isUploading,
      uploadProgress,
      isHidingStaleProfile,
      hasSanitizedProfile,
      icons,
      showTabOnly,
    } = this.props;

    return (
      <div
        className={classNames({
          profileViewerWrapper: true,
          profileViewerWrapperBackground: hasSanitizedProfile,
        })}
      >
        {icons.map(({ className, icon }) => (
          <BackgroundImageStyleDef
            className={className}
            url={icon}
            key={className}
          />
        ))}
        <div
          className={classNames({
            profileViewer: true,
            profileViewerFadeInSanitized:
              hasSanitizedProfile && !isHidingStaleProfile,
            profileViewerFadeOut: isHidingStaleProfile,
          })}
          style={
            timelineHeight === null
              ? {}
              : {
                  '--profile-viewer-splitter-max-height': `${timelineHeight}px`,
                }
          }
        >
          <div className="profileViewerTopBar">
            {hasZipFile ? (
              <button
                type="button"
                className="profileViewerZipButton"
                title="View all files in the zip file"
                onClick={returnToZipFileList}
              />
            ) : null}
            {profileName ? (
              <div className="profileViewerName">{profileName}</div>
            ) : null}
            <ProfileFilterNavigator />
            {
              // Define a spacer in the middle that will shrink based on the availability
              // of space in the top bar. It will shrink away before any of the items
              // with actual content in them do.
            }
            <div className="profileViewerSpacer" />
            <MenuButtons />
            {isUploading ? (
              <div
                className="menuButtonsPublishUploadBarInner"
                style={{ width: uploadProgress }}
              />
            ) : null}
          </div>
          <SplitterLayout
            customClassName="profileViewerSplitter"
            vertical
            percentage={false}
            // The DetailsContainer is primary.
            primaryIndex={1}
            // The Timeline is secondary.
            secondaryInitialSize={270}
            onDragEnd={invalidatePanelLayout}
          >
            {showTabOnly === null ? (
              <Timeline />
            ) : (
              <ActiveTabTimeline showTabOnly={showTabOnly} />
            )}
            <DetailsContainer />
          </SplitterLayout>
          <WindowTitle />
          <SymbolicationStatusOverlay />
        </div>
      </div>
    );
  }
}

export default explicitConnect<{||}, StateProps, DispatchProps>({
  mapStateToProps: state => ({
    profileName: getProfileName(state),
    hasZipFile: getHasZipFile(state),
    timelineHeight: getTimelineHeight(state),
    uploadProgress: getUploadProgressString(state),
    isUploading: getUploadPhase(state) === 'uploading',
    isHidingStaleProfile: getIsHidingStaleProfile(state),
    hasSanitizedProfile: getHasSanitizedProfile(state),
    icons: getIconsWithClassNames(state),
    showTabOnly: getShowTabOnly(state),
  }),
  mapDispatchToProps: {
    returnToZipFileList,
    invalidatePanelLayout,
  },
  component: ProfileViewer,
});
